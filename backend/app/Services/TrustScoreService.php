<?php

namespace App\Services;

use App\Models\Seller;
use App\Models\TrustScoreEvent;

/**
 * Score de confiance du vendeur (analyse phase 3).
 *
 * Un événement explique toujours la variation : ce qui a fait monter ou
 * baisser le score, en langage simple. Le score reste borné à [0, 100].
 */
class TrustScoreService
{
    public function apply(Seller $seller, int $delta, string $reason, array $data = []): TrustScoreEvent
    {
        $next = max(0, min(100, (int) $seller->trust_score + $delta));

        $event = TrustScoreEvent::create([
            'seller_id' => $seller->id,
            'delta' => $delta,
            'score_after' => $next,
            'reason' => $reason,
            'data' => $data,
        ]);

        $seller->forceFill(['trust_score' => $next])->save();

        return $event;
    }
}