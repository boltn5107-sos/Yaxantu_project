<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Delivery extends Model
{
    protected $fillable = [
        'order_id',
        'provider',
        'tracking_number',
        'status',
        'estimated_delivery',
        'actual_delivery',
        'carrier_name',
        'tracking_url',
        'shipping_address_id',
        'courier_id',
        'assigned_at',
        'picked_at',
        'delivered_proof_path',
        'deliverer_notes',
        'courier_notes',
    ];

    protected function casts(): array
    {
        return [
            'estimated_delivery' => 'datetime',
            'actual_delivery' => 'datetime',
            'assigned_at' => 'datetime',
            'picked_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function shippingAddress(): BelongsTo
    {
        return $this->belongsTo(Address::class, 'shipping_address_id');
    }

    public function courier(): BelongsTo
    {
        return $this->belongsTo(Courier::class);
    }
}