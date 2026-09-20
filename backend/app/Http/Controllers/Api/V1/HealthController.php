<?php

namespace App\Http\Controllers\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __invoke(Request $request): array
    {
        $dbOk = false;

        try {
            DB::select('select 1');
            $dbOk = true;
        } catch (\Throwable) {
            $dbOk = false;
        }

        return [
            'status' => 'ok',
            'service' => (string) config('app.name'),
            'version' => '0.1.0',
            'environment' => app()->environment(),
            'database' => $dbOk ? 'connected' : 'unreachable',
            'time' => now()->toIso8601String(),
        ];
    }
}