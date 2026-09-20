<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Banner;
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
            ->map(fn (Banner $banner) => [
                'id' => $banner->id,
                'title' => $banner->title,
                'subtitle' => $banner->subtitle,
                'image' => $banner->image_url,
                'link' => $banner->link,
                'sort_order' => (int) $banner->sort_order,
                'is_active' => (bool) $banner->is_active,
                'created_at' => $banner->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $banners]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validate($request);

        $banner = Banner::create($validated);

        return response()->json([
            'message' => 'Bannière créée.',
            'data' => $banner,
        ], 201);
    }

    public function update(Request $request, Banner $banner): JsonResponse
    {
        $validated = $this->validate($request);

        $banner->update($validated);

        return response()->json(['message' => 'Bannière mise à jour.']);
    }

    public function destroy(Request $request, Banner $banner): JsonResponse
    {
        $banner->delete();

        return response()->json(['message' => 'Bannière supprimée.']);
    }

    private function validate(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'subtitle' => ['nullable', 'string', 'max:220'],
            'image_url' => ['required', 'string', 'max:500', 'url'],
            'link' => ['nullable', 'string', 'max:255'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);
    }
}