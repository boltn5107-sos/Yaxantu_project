<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AuditEvent;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Dispute;
use App\Models\Notification;
use App\Services\AuditService;
use App\Services\TrustScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Médiation des litiges (modérateur et admin) : consultation de toutes les
 * réclamations, fil conversationnel et résolution (remboursement total ou
 * partiel, ou arbitrage sans remboursement).
 */
class AdminDisputeController extends Controller
{
    public function __construct(private readonly TrustScoreService $trust) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:open,moderating,resolved'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Dispute::query()
            ->with(['order:id,order_number,total_minor,status', 'user:id,name', 'seller:id,shop_name'])
            ->withCount('messages as messages_count');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $search = '%'.$validated['search'].'%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                    ->orWhereHas('order', fn ($o) => $o->where('order_number', 'like', $search))
                    ->orWhereHas('seller', fn ($s) => $s->where('shop_name', 'like', $search));
            });
        }

        $disputes = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $disputes->map(fn (Dispute $d) => [
                'id' => $d->id,
                'order_number' => $d->order?->order_number,
                'order_total' => (int) ($d->order?->total_minor ?? 0),
                'order_status' => $d->order?->status,
                'status' => $d->status,
                'title' => $d->title,
                'buyer' => $d->user?->name,
                'shop' => $d->seller?->shop_name,
                'messages_count' => (int) $d->messages_count,
                'created_at' => $d->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $disputes->currentPage(),
                'last_page' => $disputes->lastPage(),
                'per_page' => $disputes->perPage(),
                'total' => $disputes->total(),
            ],
        ]);
    }

    public function show(Dispute $dispute): JsonResponse
    {
        $dispute->load([
            'order',
            'user:id,name,email,phone',
            'seller:id,shop_name',
            'messages.user:id,name',
        ]);

        $toUrl = fn (?string $path) => $path === null
            ? null
            : Storage::disk('public')->url($path);

        return response()->json([
            'data' => [
                'id' => $dispute->id,
                'status' => $dispute->status,
                'title' => $dispute->title,
                'description' => $dispute->description,
                'photo' => $toUrl($dispute->photo_path),
                'voice' => $toUrl($dispute->voice_path),
                'buyer' => $dispute->user ? [
                    'name' => $dispute->user->name,
                    'email' => $dispute->user->email,
                    'phone' => $dispute->user->phone,
                ] : null,
                'shop' => $dispute->seller?->shop_name,
                'order' => $dispute->order ? [
                    'order_number' => $dispute->order->order_number,
                    'status' => $dispute->order->status,
                    'status_label' => OrderStatus::tryFrom($dispute->order->status)?->label() ?? $dispute->order->status,
                    'total' => (int) $dispute->order->total_minor,
                    'payment_status' => $dispute->order->payment_status,
                ] : null,
                'messages' => $dispute->messages->map(fn ($m) => [
                    'id' => $m->id,
                    'by' => $m->user?->name,
                    'text' => $m->text,
                    'photo' => $toUrl($m->photo_path),
                    'voice' => $toUrl($m->voice_path),
                    'created_at' => $m->created_at?->toIso8601String(),
                ])->values(),
                'resolution' => $dispute->resolution,
                'resolved_at' => $dispute->resolved_at?->toIso8601String(),
                'created_at' => $dispute->created_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Résolution : remboursement total ou partiel, ou arbitrage simple.
     */
    public function resolve(Request $request, Dispute $dispute): JsonResponse
    {
        if ($dispute->status === 'resolved') {
            throw ValidationException::withMessages(['dispute' => ['Ce litige est déjà résolu.']]);
        }

        $validated = $request->validate([
            'action' => ['required', 'in:no_refund,refund_full,refund_partial'],
            'amount_minor' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $order = $dispute->order->loadMissing('seller');

        if ($validated['action'] === 'refund_partial') {
            $amount = (int) ($validated['amount_minor'] ?? 0);
            if ($amount <= 0) {
                throw ValidationException::withMessages(['amount_minor' => ['Indiquez le montant à rembourser.']]);
            }
            if ($amount > (int) $order->total_minor) {
                throw ValidationException::withMessages(['amount_minor' => ['Le remboursement ne peut pas dépasser le total de la commande.']]);
            }
        } elseif ($validated['action'] === 'refund_full') {
            $amount = (int) $order->total_minor;
        } else {
            $amount = 0;
        }

        $resolution = [
            'action' => $validated['action'],
            'amount_minor' => $amount,
            'note' => $validated['note'] ?? null,
            'resolved_by' => $request->user()->name,
        ];

        $dispute->forceFill([
            'status' => 'resolved',
            'resolution' => $resolution,
            'resolved_at' => now(),
            'resolved_by' => $request->user()->id,
        ])->save();

        if ($amount > 0) {
            $order->forceFill([
                'payment_status' => $validated['action'] === 'refund_full'
                    ? PaymentStatus::Refunded->value
                    : 'partially_refunded',
            ])->save();

            if ($validated['action'] === 'refund_full' && $order->seller !== null) {
                $this->trust->apply(
                    $order->seller,
                    -30,
                    'Litige résolu en faveur de l\'acheteur avec remboursement total. -30 points.',
                );
            }
        }

        if ($validated['action'] === 'no_refund' && $order->seller !== null) {
            $this->trust->apply(
                $order->seller,
                -10,
                'Litige résolu sans remboursement. -10 points.',
            );
        }

        Notification::create([
            'user_id' => $dispute->user_id,
            'type' => 'dispute.resolved',
            'title' => 'Litige résolu',
            'message' => $amount > 0
                ? 'Votre litige sur la commande '.$order->order_number.' est résolu : '.number_format($amount).' FCFA vous seront remboursés.'
                : 'Votre litige sur la commande '.$order->order_number.' a été clôturé.',
            'data' => ['order_number' => $order->order_number, 'dispute_id' => $dispute->id],
            'action_url' => '/orders/'.$order->order_number,
            'action_text' => 'Voir la commande',
            'priority' => 'high',
        ]);

        if ($order->seller_id !== null) {
            Notification::create([
                'user_id' => $order->seller->user_id,
                'type' => 'dispute.resolved',
                'title' => 'Litige clôturé',
                'message' => 'Le litige sur la commande '.$order->order_number.' est résolu : '.$this->actionLabel($validated['action']).'.',
                'data' => ['order_number' => $order->order_number],
                'action_url' => '/seller/orders',
                'action_text' => 'Mes commandes',
                'priority' => 'high',
            ]);
        }

        AuditService::log(AuditEvent::DisputeResolved, $dispute, $resolution);

        return response()->json([
            'message' => 'Litige résolu.',
            'data' => ['id' => $dispute->id, 'status' => 'resolved'],
        ]);
    }

    private function actionLabel(string $action): string
    {
        return match ($action) {
            'refund_full' => 'remboursement intégral',
            'refund_partial' => 'remboursement partiel',
            default => 'arbitrage sans remboursement',
        };
    }
}