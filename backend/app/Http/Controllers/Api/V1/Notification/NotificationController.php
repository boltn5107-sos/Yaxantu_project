<?php

namespace App\Http\Controllers\Api\V1\Notification;

use App\Http\Controllers\Api\V1\Controller;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class NotificationController extends Controller
{
    /**
     * Notifications de l'utilisateur (cahier des charges §33).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()->notifications()
            ->orderByDesc('created_at');

        if ($request->boolean('unread_only')) {
            $query->where('is_read', false);
        }

        return NotificationResource::collection($query->paginate(20)->withQueryString());
    }

    /**
     * Nombre de notifications non lues.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'data' => ['count' => (int) $request->user()->notifications()->where('is_read', false)->count()],
        ]);
    }

    /**
     * Marque une notification comme lue.
     */
    public function markRead(Request $request, int $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);

        $notification->forceFill(['is_read' => true, 'read_at' => now()])->save();

        return response()->json(['message' => 'Notification marquée comme lue.']);
    }

    /**
     * Marque toutes les notifications comme lues.
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->notifications()->where('is_read', false)->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'Toutes les notifications sont marquées comme lues.']);
    }
}