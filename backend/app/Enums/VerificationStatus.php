<?php

namespace App\Enums;

enum VerificationStatus: string
{
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case Approved = 'approved';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Submitted => 'Soumise',
            self::UnderReview => 'En cours de validation',
            self::Approved => 'Validée',
            self::Rejected => 'Rejetée',
        };
    }
}