<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class Media
{
    /**
     * Résout un chemin d'image vers une URL affichable :
     *  - URL web (http/https/data:) inchangée ;
     *  - chemin stocké localement (relatif) transformé en URL publique /storage/…
     */
    public static function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, 'data:')) {
            return $path;
        }

        return Storage::disk('public')->url(ltrim($path, '/'));
    }
}