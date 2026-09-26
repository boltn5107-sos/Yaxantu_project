<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\SellerExpense;
use App\Services\SellerAccountingService;
use App\Support\Media;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Module Comptabilité du vendeur : rapport périodisé (synthèse, évolution,
 * répartition des dépenses, top produits, ventes, dépenses), enregistrement
 * des dépenses avec pièce justificative et objectif de ventes mensuel.
 */
class SellerAccountingController extends Controller
{
    public function __construct(private readonly SellerAccountingService $accounting) {}

    public function report(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        $validated = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($validated['from']) ? Carbon::parse($validated['from']) : now()->startOfMonth();
        $to = isset($validated['to']) ? Carbon::parse($validated['to']) : now();

        return response()->json(['data' => $this->accounting->report($seller, $from, $to)]);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        $validated = $request->validate([
            'amount_minor' => ['required', 'integer', 'min:1'],
            'category' => ['required', 'in:'.implode(',', SellerAccountingService::CATEGORIES)],
            'incurred_at' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:500'],
            'receipt' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $expense = new SellerExpense([
            'seller_id' => $seller->getKey(),
            'amount_minor' => (int) $validated['amount_minor'],
            'currency' => $seller->currency,
            'category' => $validated['category'],
            'incurred_at' => Carbon::parse($validated['incurred_at'])->startOfDay(),
            'description' => $validated['description'] ?? null,
        ]);

        if ($request->hasFile('receipt')) {
            $expense->receipt_path = $request->file('receipt')->store('expenses/'.$seller->getKey(), 'public');
        }

        $expense->save();

        return response()->json([
            'message' => 'Dépense enregistrée.',
            'data' => ['expense' => $this->expensePayload($expense)],
        ], 201);
    }

    public function destroyExpense(Request $request, SellerExpense $expense): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        if ($expense->seller_id !== $seller->getKey()) {
            abort(403, 'Dépense introuvable.');
        }

        if ($expense->receipt_path) {
            Storage::disk('public')->delete($expense->receipt_path);
        }

        $expense->delete();

        return response()->json(['message' => 'Dépense supprimée.']);
    }

    public function updateGoal(Request $request): JsonResponse
    {
        $seller = $request->user()->seller ?: abort(403, 'Profil Vendeur requis.');

        $validated = $request->validate([
            'monthly_minor' => ['required', 'integer', 'min:0'],
        ]);

        $seller->monthly_goal_minor = (int) $validated['monthly_minor'];
        $seller->save();

        return response()->json(['message' => 'Objectif enregistré.']);
    }

    private function expensePayload(SellerExpense $expense): array
    {
        return [
            'id' => $expense->id,
            'amount_minor' => (int) $expense->amount_minor,
            'category' => $expense->category,
            'incurred_at' => $expense->incurred_at?->toDateString(),
            'description' => $expense->description,
            'receipt_url' => Media::url($expense->receipt_path),
        ];
    }
}