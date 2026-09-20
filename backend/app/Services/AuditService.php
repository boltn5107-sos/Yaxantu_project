<?php

namespace App\Services;

use App\Enums\AuditEvent;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

/**
 * Journal d'audit immuable et append-only (table audit_logs).
 *
 * Utilisé pour toutes les actions sensibles : authentification, rôles,
 * vérifications vendeurs, finance, configuration. La ligne n'est jamais
 * modifiée, seulement lue.
 */
class AuditService
{
    public static function log(
        AuditEvent|string $event,
        ?Model $auditable = null,
        array $data = [],
        ?User $user = null,
        bool $withRequestContext = true,
    ): AuditLog {
        $event = $event instanceof AuditEvent ? $event->value : $event;

        if ($user === null && $withRequestContext) {
            $user = auth()->user();
        }

        return AuditLog::create([
            'user_id' => $user?->getKey(),
            'ip_address' => $withRequestContext ? Request::ip() : null,
            'user_agent' => $withRequestContext ? substr((string) Request::userAgent(), 0, 500) : null,
            'event' => $event,
            'auditable_type' => $auditable?->getMorphClass(),
            'auditable_id' => $auditable?->getKey(),
            'data' => $data === [] ? null : $data,
            'created_at' => now(),
        ]);
    }
}