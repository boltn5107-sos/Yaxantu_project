<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class Media
{
    public const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];

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

    /** 'image' ou 'video' selon le type MIME (repli sur l'extension). */
    public static function kind(?string $mimeType, ?string $path = null): string
    {
        if ($mimeType !== null && str_starts_with(strtolower($mimeType), 'video/')) {
            return 'video';
        }

        $extension = strtolower((string) pathinfo((string) $path, PATHINFO_EXTENSION));

        return in_array($extension, self::VIDEO_EXTENSIONS, true) ? 'video' : 'image';
    }
}