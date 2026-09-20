<?php

namespace App\Http\Resources;

use App\Models\Category;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Category */
class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $locale = $request->header('X-Locale', $request->query('locale', 'fr'));
        $translation = $this->translations->firstWhere('locale', $locale);

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $translation->name ?? $this->translations->first()?->name ?? $this->slug,
            'description' => $translation->description ?? null,
            'icon' => $this->icon,
            'image' => Media::url($this->image_path),
            'is_main' => $this->is_main,
            'products_count' => (int) ($this->products_count ?? 0),
            'children' => CategoryResource::collection($this->whenLoaded('children')),
        ];
    }
}
