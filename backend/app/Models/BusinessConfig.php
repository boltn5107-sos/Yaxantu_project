<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessConfig extends Model
{
    protected $fillable = ['key', 'value', 'description'];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }
}