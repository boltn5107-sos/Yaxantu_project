<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Banner;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBannerController extends Controller
{
    /**
     * Toutes les bannières (actives et inactives), tri par ordre d'affichage.
     */
    public function index(): JsonResponse
    {
        $banners = Banner::query()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Banner $banner) => $this->payload($banner));

        return response()->json(['data' => $banners]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request, true);

        if ($request->hasFile('image')) {
            $validated['image_url'] = $request->file('image')->store('banners', 'public');
        }
        unset($validated['image']);

        $banner = Banner::create($validated);

        return response()->json([
            'message' => 'Bannière créée.',
            'data' => $this->payload($banner),
        ], 201);
    }

    public function update(Request $request, Banner $banner): JsonResponse
    {
        $validated = $this->validate($request, false);

        if ($request->hasFile('image')) {
            $validated['image_url'] = $request->file('image')->store('banners', 'public');
        }
        unset($validated['image']);

        $banner->update($validated);

        return response()->json([
            'message' => 'Bannière mise à jour.',
            'data' => $this->payload($banner->refresh()),
        ]);
    }

    public function destroy(Request $request, Banner $banner): JsonResponse
    {
        $banner->delete();

        return response()->json(['message' => 'Bannière supprimée.']);
    }

    private function payload(Banner $banner): array
    {
        return [
            'id' => $banner->id,
            'title' => $banner->title,
            'subtitle' => $banner->subtitle,
            // Source brute (URL ou chemin stocké) + URL affichable.
            'image_url' => $banner->image_url,
            'image' => Media::url($banner->image_url),
            'link' => $banner->link,
            'sort_order' => (int) $banner->sort_order,
            'is_active' => (bool) $banner->is_active,
            'created_at' => $banner->created_at?->toIso8601String(),
        ];
    }

    private function validate(Request $request, bool $required): array
    {
        $imageUrlRules = $required
            ? ['required_without:image', 'nullable', 'string', 'max:500']
            : ['sometimes', 'nullable', 'string', 'max:500'];

        $imageRules = $required
            ? ['required_without:image_url', 'nullable', 'image', 'mimes:jpeg,png,webp,gif', 'max:4096']
            : ['sometimes', 'nullable', 'image', 'mimes:jpeg,png,webp,gif', 'max:4096'];

        return $request->validate([
            'title' => [($required ? 'required' : 'sometimes'), 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:220'],
            'image' => $imageRules,
            'image_url' => $imageUrlRules,
            'link' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}