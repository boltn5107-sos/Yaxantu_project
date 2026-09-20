<?php

namespace App\Http\Resources;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Notification */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'message' => $this->message,
            'data' => $this->data,
            'is_read' => (bool) $this->is_read,
            'action_url' => $this->action_url,
            'action_text' => $this->action_text,
            'priority' => $this->priority,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}