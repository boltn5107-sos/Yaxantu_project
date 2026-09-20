<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Courier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCourierController extends Controller
{
    /**
     * Tous les livreurs (la validation à deux mains reste dans CourierApprovalController).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,approved,rejected'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Courier::query()->with('user:id,name,email,phone');

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $couriers = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        return response()->json([
            'data' => $couriers->map(fn (Courier $courier) => [
                'id' => $courier->id,
                'status' => $courier->status,
                'approved_at' => $courier->approved_at?->toIso8601String(),
                'reject_reason' => $courier->reject_reason,
                'transport_type' => $courier->transport_type,
                'zone_address' => $courier->zone_address,
                'available' => (bool) $courier->available,
                'deliveries_count' => (int) $courier->deliveries()->count(),
                'owner' => $courier->user ? [
                    'name' => $courier->user->name,
                    'email' => $courier->user->email,
                    'phone' => $courier->user->phone,
                ] : null,
                'created_at' => $courier->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $couriers->currentPage(),
                'last_page' => $couriers->lastPage(),
                'per_page' => $couriers->perPage(),
                'total' => $couriers->total(),
            ],
        ]);
    }
}