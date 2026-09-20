<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\AuditEvent;
use App\Enums\Role;
use App\Enums\UserStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Liste des utilisateurs (filtres rôle / statut / recherche).
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['nullable', Rule::in(array_keys(config('access.roles')))],
            'status' => ['nullable', 'in:active,suspended,banned'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = User::query()->with(['roles', 'seller:id,user_id,shop_name,status', 'courier:id,user_id,status']);

        if (! empty($validated['role'])) {
            $query->whereHas('roles', fn ($q) => $q->where('slug', $validated['role']));
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['search'])) {
            $search = '%'.$validated['search'].'%';
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', $search)
                    ->orWhere('email', 'like', $search)
                    ->orWhere('phone', 'like', $search);
            });
        }

        $users = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        return response()->json([
            'data' => $users->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'status' => $user->status,
                'roles' => $user->roleSlugs(),
                'seller' => $user->seller ? [
                    'shop_name' => $user->seller->shop_name,
                    'status' => $user->seller->status,
                ] : null,
                'courier' => $user->courier ? [
                    'status' => $user->courier->status,
                ] : null,
                'created_at' => $user->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * Suspendre / bannir / réactiver un compte.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:active,suspended,banned'],
        ]);

        $user->update(['status' => $validated['status']]);

        \App\Models\Notification::create([
            'user_id' => $user->id,
            'type' => 'account.status_changed',
            'title' => 'État de votre compte',
            'message' => match ($validated['status']) {
                'suspended' => 'Votre compte est temporairement suspendu. Contactez l\'assistance pour plus de détails.',
                'banned' => 'Votre compte a été fermé. Contactez l\'assistance si vous pensez à une erreur.',
                default => 'Votre compte est de nouveau actif. Bienvenue !',
            },
            'data' => ['status' => $validated['status']],
            'priority' => 'high',
        ]);

        if ($validated['status'] === 'suspended') {
            AuditService::log(AuditEvent::UserSuspended, $user, ['status' => 'suspended']);
        } elseif ($validated['status'] === 'banned') {
            AuditService::log(AuditEvent::UserBanned, $user, ['status' => 'banned']);
        }

        return response()->json(['message' => 'Statut du compte mis à jour.']);
    }

    /**
     * Retirer / accorder un rôle (admin / modérateur / vendeur / livreur / acheteur).
     */
    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', Rule::in(array_keys(config('access.roles')))],
            'action' => ['required', 'in:assign,remove'],
        ]);

        // On ne se retire jamais le rôle admin à soi-même.
        if ($user->id === $request->user()->id && $validated['role'] === 'admin' && $validated['action'] === 'remove') {
            return response()->json(['message' => 'Impossible de retirer votre propre rôle administrateur.'], 422);
        }

        $role = Role::from($validated['role']);

        if ($validated['action'] === 'assign') {
            $user->assignRole($role);
        } else {
            $user->removeRole($role);
        }

        AuditService::log(AuditEvent::RoleChanged, $user, [
            'role' => $validated['role'],
            'action' => $validated['action'],
        ]);

        return response()->json(['message' => 'Rôle mis à jour.']);
    }
}