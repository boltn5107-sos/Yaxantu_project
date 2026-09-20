<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\PromoCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminPromoCodeController extends Controller
{
    /**
     * Codes promo : campagne complète, avec compteurs d'usage.
     */
    public function index(): JsonResponse
    {
        $codes = PromoCode::query()
            ->withCount('orders as orders_count')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (PromoCode $code) => [
                'id' => $code->id,
                'code' => $code->code,
                'description' => $code->description,
                'discount_type' => $code->discount_type,
                'discount_value' => (int) $code->discount_value,
                'is_fixed' => $code->isFixed(),
                'min_order_minor' => $code->min_order_minor,
                'max_uses' => $code->max_uses,
                'used_count' => (int) $code->used_count,
                'orders_count' => (int) $code->orders_count,
                'one_time' => (bool) $code->one_time,
                'is_active' => (bool) $code->is_active,
                'starts_at' => $code->starts_at?->toIso8601String(),
                'expires_at' => $code->expires_at?->toIso8601String(),
                'created_at' => $code->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $codes]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request);

        $code = PromoCode::create($validated);

        return response()->json([
            'message' => 'Code promo créé.',
            'data' => $code,
        ], 201);
    }

    public function update(Request $request, PromoCode $promoCode): JsonResponse
    {
        $validated = $this->validate($request, $promoCode);

        $promoCode->update($validated);

        return response()->json(['message' => 'Code promo mis à jour.']);
    }

    public function destroy(Request $request, PromoCode $promoCode): JsonResponse
    {
        $promoCode->delete();

        return response()->json(['message' => 'Code promo supprimé.']);
    }

    private function validate(Request $request, ?PromoCode $ignore = null): array
    {
        $rules = [
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Z0-9_.-]+$/'],
            'description' => ['nullable', 'string', 'max:255'],
            'discount_type' => ['required', Rule::in(['percent', 'fixed'])],
            'discount_value' => ['required', 'integer', 'min:1'],
            'min_order_minor' => ['nullable', 'integer', 'min:0'],
            'max_uses' => ['nullable', 'integer', 'min:1'],
            'one_time' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];

        $rules['discount_value'][] = function ($attribute, $value, $fail) use ($request) {
            if ($request->input('discount_type') === 'percent' && $value > 100) {
                $fail('Une réduction en pourcentage ne peut pas dépasser 100 %.');
            }
        };

        // Le code reste unique (sauf pour la mise à jour de lui-même).
        $unique = Rule::unique('promo_codes', 'code');
        if ($ignore !== null) {
            $unique->ignore($ignore->id);
        }
        $rules['code'][] = $unique;

        return $request->validate($rules);
    }
}