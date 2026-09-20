<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuditEvent;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Dispute;
use App\Models\DisputeMessage;
use App\Models\Order;
use App\Services\AuditService;
use App\Services\TrustScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Litiges simples (phase 3) : une photo + un message vocal pour expliquer.
 * Sans jargon : le client ou le vendeur choisit la commande concernée,
 * photographie le problème et/ou explique à voix haute.
 */
class DisputeController extends Controller
{
    public function __construct(
        private readonly TrustScoreService $trust,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $sellerId = $request->user()->seller?->id;
        $canModerate = $request->user()->isAdmin() || $request->user()->isModerator();

        $query = Dispute::query()
            ->with(['order', 'messages'])
            ->orderByDesc('created_at');

        if (! $canModerate) {
            if ($sellerId !== null) {
                $query->where(fn ($w) => $w->where('user_id', $request->user()->id)
                    ->orWhere('seller_id', $sellerId));
            } else {
                $query->where('user_id', $request->user()->id);
            }
        }

        $disputes = $query->get();

        return response()->json([
            'data' => $disputes->map(fn (Dispute $d) => [
                'id' => $d->id,
                'order_number' => $d->order?->order_number,
                'status' => $d->status,
                'title' => $d->title,
                'photos' => [$d->photo_path],
                'voice' => $d->voice_path,
                'messages_count' => $d->messages->count(),
                'created_at' => $d->created_at?->toIso8601String(),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
            'title' => ['nullable', 'string', 'max:190'],
            'description' => ['nullable', 'string', 'max:5000'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'voice_note' => ['nullable', 'file', 'mimes:mp3,wav,oga,m4a,webm', 'max:10240'],
        ]);

        $order = Order::with('seller')->findOrFail($validated['order_id']);
        $user = $request->user();
        $sellerId = $user->seller?->id;

        $involved = $order->user_id === $user->id
            || ($sellerId !== null && $order->seller_id === $sellerId)
            || $user->isAdmin()
            || $user->isModerator();

        if (! $involved) {
            throw ValidationException::withMessages(['order_id' => ['Cette commande ne vous concerne pas.']]);
        }

        $photoPath = $request->hasFile('photo')
            ? $request->file('photo')->store('disputes/photos', 'public')
            : null;

        $voicePath = $request->hasFile('voice_note')
            ? $request->file('voice_note')->store('disputes/voices', 'public')
            : null;

        if ($photoPath === null && $voicePath === null && blank($validated['description'] ?? null)) {
            throw ValidationException::withMessages(['description' => ['Expliquez le problème (texte ou message vocal).']]);
        }

        $dispute = Dispute::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'seller_id' => $order->seller_id,
            'type' => 'general',
            'status' => 'open',
            'title' => $validated['title'] ?? ('Commande '.$order->order_number),
            'description' => $validated['description'] ?? null,
            'photo_path' => $photoPath,
            'voice_path' => $voicePath,
        ]);

        // Un litige entamé fait baisser la confiance du vendeur concerné.
        if ($order->seller_id !== null) {
            $this->trust->apply($order->seller, -15, 'Un litige a été ouvert sur une commande. -15 points, il est résolu comme il se doit.');
        }

        \App\Models\Notification::create([
            'user_id' => $order->seller?->user_id ?? $order->user_id,
            'type' => 'dispute.opened',
            'title' => 'Litige ouvert',
            'message' => 'Un litige concerne la commande '.$order->order_number.'.',
            'data' => ['order_number' => $order->order_number],
            'action_url' => '/orders/'.$order->order_number,
            'action_text' => 'Voir le litige',
            'priority' => 'high',
        ]);

        AuditService::log(AuditEvent::RefundRequested, $dispute);

        return response()->json([
            'message' => 'Litige ouvert. Une personne de confiance va vous répondre.',
            'data' => ['id' => $dispute->id, 'status' => $dispute->status],
        ], 201);
    }

    public function show(Request $request, Dispute $dispute): JsonResponse
    {
        $user = $request->user();

        $involved = $dispute->user_id === $user->id
            || ($user->seller !== null && $dispute->seller_id === $user->seller->id)
            || $user->isAdmin()
            || $user->isModerator();

        if (! $involved) {
            abort(403);
        }

        $dispute->load(['order', 'messages.user']);

        return response()->json([
            'data' => [
                'id' => $dispute->id,
                'order_number' => $dispute->order?->order_number,
                'status' => $dispute->status,
                'title' => $dispute->title,
                'description' => $dispute->description,
                'photo' => $dispute->photo_path,
                'voice' => $dispute->voice_path,
                'messages' => $dispute->messages->map(fn ($m) => [
                    'id' => $m->id,
                    'by' => $m->user?->name,
                    'text' => $m->text,
                    'photo' => $m->photo_path,
                    'voice' => $m->voice_path,
                    'created_at' => $m->created_at?->toIso8601String(),
                ])->values(),
                'created_at' => $dispute->created_at?->toIso8601String(),
            ],
        ]);
    }

    public function message(Request $request, Dispute $dispute): JsonResponse
    {
        $user = $request->user();

        $involved = $dispute->user_id === $user->id
            || ($user->seller !== null && $dispute->seller_id === $user->seller->id)
            || $user->isAdmin()
            || $user->isModerator();

        if (! $involved) {
            abort(403);
        }

        $validated = $request->validate([
            'text' => ['nullable', 'string', 'max:5000'],
            'photo' => ['nullable', 'image', 'max:5120'],
            'voice_note' => ['nullable', 'file', 'mimes:mp3,wav,oga,m4a,webm', 'max:10240'],
        ]);

        $photoPath = $request->hasFile('photo')
            ? $request->file('photo')->store('disputes/photos', 'public')
            : null;

        $voicePath = $request->hasFile('voice_note')
            ? $request->file('voice_note')->store('disputes/voices', 'public')
            : null;

        if ($photoPath === null && $voicePath === null && blank($validated['text'] ?? null)) {
            throw ValidationException::withMessages(['text' => ['Ajoutez un message, une photo ou un vocal.']]);
        }

        $message = DisputeMessage::create([
            'dispute_id' => $dispute->id,
            'user_id' => $user->id,
            'text' => $validated['text'] ?? null,
            'photo_path' => $photoPath,
            'voice_path' => $voicePath,
        ]);

        if ($dispute->status === 'open' && ($user->isAdmin() || $user->isModerator())) {
            $dispute->forceFill(['status' => 'moderating'])->save();
        }

        return response()->json([
            'message' => 'Message envoyé.',
            'data' => [
                'id' => $message->id,
                'by' => $user->name,
                'text' => $message->text,
                'photo' => $message->photo_path,
                'voice' => $message->voice_path,
                'created_at' => $message->created_at?->toIso8601String(),
            ],
        ], 201);
    }
}