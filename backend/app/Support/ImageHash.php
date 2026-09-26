<?php

namespace App\Support;

use RuntimeException;

/**
 * Empreinte perceptuelle d'image pour la recherche visuelle.
 *
 * Algorithme retenu : Difference Hash (dHash) 8×8 = 64 bits.
 * Robuste aux variations de luminosité/couleur, sans dépendance externe
 * (GD uniquement). Deux dHash identiques ou très proches ⇒ images perçues
 * comme « mêmes » ou « similaires ».
 */
final class ImageHash
{
    private const WIDTH = 9;
    private const HEIGHT = 8;

    /**
     * Calcule la signature dHash (16 caractères hexadécimaux) de l'image.
     * Retourne null si l'image ne peut pas être décodée (GD indisponible,
     * fichier illisible) ou s'il s'agit d'une vidéo/URL distante.
     */
    public static function compute(string $path): ?string
    {
        $bytes = @file_get_contents($path);

        if ($bytes === false) {
            return null;
        }

        $source = @imagecreatefromstring($bytes);

        if ($source === false) {
            return null;
        }

        try {
            // Réduit en niveaux de gris 9×8 : un pixel par cellule.
            $small = imagecreatetruecolor(self::WIDTH, self::HEIGHT);

            if ($small === false) {
                return null;
            }

            imagecopyresampled($small, $source, 0, 0, 0, 0, self::WIDTH, self::HEIGHT, imagesx($source), imagesy($source));
            imagefilter($small, IMG_FILTER_GRAYSCALE);

            $bits = '';

            for ($y = 0; $y < self::HEIGHT; $y++) {
                for ($x = 0; $x < self::WIDTH - 1; $x++) {
                    $left = imagecolorat($small, $x, $y) & 0xFF;
                    $right = imagecolorat($small, $x + 1, $y) & 0xFF;
                    $bits .= ($left > $right) ? '1' : '0';
                }
            }

            $hash = '';

            foreach (str_split($bits, 4) as $nibble) {
                $hash .= dechex(bindec($nibble));
            }

            return str_pad($hash, 16, '0', STR_PAD_LEFT);
        } finally {
            imagedestroy($small);
            imagedestroy($source);
        }
    }

    /**
     * Distance de Hamming entre deux signatures hexadécimales (0 = identiques).
     */
    public static function hamming(string $a, string $b): int
    {
        $a = str_pad($a, 16, '0', STR_PAD_LEFT);
        $b = str_pad($b, 16, '0', STR_PAD_LEFT);

        $distance = 0;

        // Groupes de 4 chiffres hexadécimaux (≤ 0xFFFF) pour rester portables.
        foreach ([0, 4, 8, 12] as $offset) {
            $left = (int) hexdec(substr($a, $offset, 4));
            $right = (int) hexdec(substr($b, $offset, 4));
            $xor = $left ^ $right;

            while ($xor !== 0) {
                $distance += $xor & 1;
                $xor >>= 1;
            }
        }

        return $distance;
    }

    /**
     * Vrai si les deux signatures sont suffisamment proches (≤ seuil).
     */
    public static function similar(string $a, string $b, int $threshold = 12): bool
    {
        return self::hamming($a, $b) <= $threshold;
    }

    /** Vrai si la signature a bien un format attendu (16 hex). */
    public static function valid(?string $hash): bool
    {
        return $hash !== null
            && strlen($hash) === 16
            && ctype_xdigit($hash);
    }
}