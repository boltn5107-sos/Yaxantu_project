<?php

namespace App\Http\Controllers\Api\V1\Banner;

use App\Http\Controllers\Api\V1\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;

class BannerController extends Controller
{
    /**
     * Bannières actives de la vitrine (tri par sort_order).
     */
    public function index(): JsonResponse
    {
        $banners = Banner::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Banner $banner) => $banner->toPublicArray());

        return response()->json(['data' => $banners]);
    }
}