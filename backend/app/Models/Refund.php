<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    protected $fillable = [
        'payment_id',
        'amount_minor',
        'currency',
        'reason',
        'status',
        'requested_at',
        'processed_at',
        'processor_id',
        'gateway_response',
    ];

    protected function casts(): array
    {
        return [
            'amount_minor' => 'integer',
            'requested_at' => 'datetime',
            'processed_at' => 'datetime',
            'gateway_response' => 'array',
        ];
    }
}