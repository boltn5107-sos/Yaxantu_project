<?php

namespace App\Http\Resources;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Payment */
class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'method' => $this->method,
            'method_label' => $this->method === 'cod' ? 'Paiement à la livraison' : 'Mobile Money',
            'status' => $this->status,
            'status_label' => $this->safeStatusLabel(),
            'amount' => (int) $this->amount_minor,
            'currency' => $this->currency,
            'transaction_id' => $this->transaction_id,
            'provider' => $this->provider,
            'paid_at' => $this->paid_at?->toIso8601String(),
        ];
    }

    private function safeStatusLabel(): string
    {
        try {
            return PaymentStatus::from($this->status)->label();
        } catch (\ValueError) {
            return $this->status;
        }
    }
}