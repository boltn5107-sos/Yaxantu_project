<?php

use App\Models\ProductImage;
use App\Support\ImageHash;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('product:image-hashes {--force : Recalcule les signatures existantes}', function () {
    $this->info('Calcul des signatures perceptuelles (dHash) des images produits…');

    $query = ProductImage::query()
        ->where('kind', 'image')
        ->whereNotNull('path');

    if (! $this->option('force')) {
        $query->whereNull('image_hash');
    }

    $total = (int) $query->count();
    $updated = 0;
    $skipped = 0;

    $query->orderBy('id')->chunkById(200, function ($images) use (&$updated, &$skipped) {
        foreach ($images as $image) {
            $path = (string) $image->path;

            // Les URLs distantes (Unsplash…) ne sont pas lisibles en local.
            if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
                $skipped++;
                continue;
            }

            $hash = ImageHash::compute(Storage::disk('public')->path($path));

            if ($hash === null) {
                $skipped++;
                continue;
            }

            $image->forceFill(['image_hash' => $hash])->save();
            $updated++;
        }
    });

    $this->info("Terminé : {$updated} signature(s) calculée(s), {$skipped} ignorée(s) (sur {$total}).");
})->purpose('Calcule/recalcule les signatures perceptuelles des images produits pour la recherche visuelle');
