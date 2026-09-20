<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\UserStatus;
use App\Http\Controllers\Api\V1\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\PromoCode;
use App\Models\Referral;
use App\Models\Seller;
use App\Models\Courier;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    /**
     * Tableau de bord : indicateurs clés pour le pilotage de la place.
     */
    public function index(): JsonResponse
    {
        $activeOrders = [
            'created',
            'payment_pending',
            'paid',
            'preparation',
            'shipped',
            'in_delivery',
        ];

        $revenue = (int) Order::query()
            ->whereNotIn('status', ['cancelled', 'returned'])
            ->sum('total_minor');

        $revenueToday = (int) Order::query()
            ->whereNotIn('status', ['cancelled', 'returned'])
            ->whereDate('created_at', today())
            ->sum('total_minor');

        $topProducts = DB::table('order_items')
            ->select('product_id', 'name', DB::raw('SUM(quantity) as sold'))
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->groupBy('product_id', 'name')
            ->orderByDesc('sold')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->product_id,
                'name' => $row->name,
                'sold' => (int) $row->sold,
            ]);

        $recentOrders = Order::query()
            ->with(['user:id,name', 'seller:id,shop_name'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'total' => (int) $order->total_minor,
                'customer' => $order->user?->name,
                'shop' => $order->seller?->shop_name,
                'placed_at' => $order->created_at?->toIso8601String(),
            ]);

        $data = [
            'users' => [
                'total' => (int) User::count(),
                'active' => (int) User::where('status', UserStatus::Active->value)->count(),
                'suspended' => (int) User::where('status', UserStatus::Suspended->value)->count(),
                'banned' => (int) User::where('status', UserStatus::Banned->value)->count(),
            ],
            'orders' => [
                'total' => (int) Order::count(),
                'active' => (int) Order::whereIn('status', $activeOrders)->count(),
                'delivered' => (int) Order::where('status', 'delivered')->count(),
                'cancelled' => (int) Order::where('status', 'cancelled')->count(),
                'revenue' => $revenue,
                'revenue_today' => $revenueToday,
            ],
            'sellers' => [
                'total' => (int) Seller::count(),
                'pending' => (int) Seller::where('status', 'pending_verification')->count(),
                'active' => (int) Seller::where('status', 'active')->count(),
            ],
            'couriers' => [
                'total' => (int) Courier::count(),
                'pending' => (int) Courier::where('status', 'pending')->count(),
                'approved' => (int) Courier::where('status', 'approved')->count(),
            ],
            'products' => [
                'total' => (int) Product::count(),
                'active' => (int) Product::where('is_active', true)->count(),
                'featured' => (int) Product::where('is_featured', true)->count(),
            ],
            'marketing' => [
                'promo_codes' => (int) PromoCode::count(),
                'active_promo_codes' => (int) PromoCode::where('is_active', true)->count(),
                'referrals' => (int) Referral::count(),
                'rewarded_referrals' => (int) Referral::where('status', 'rewarded')->count(),
            ],
            'top_products' => $topProducts,
            'recent_orders' => $recentOrders,
        ];

        return response()->json(['data' => $data]);
    }
}