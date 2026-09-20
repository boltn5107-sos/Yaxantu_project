<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Yaxantu v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // ── Santé / publique ───────────────────────────────────────────────

    Route::get('/health', App\Http\Controllers\Api\V1\HealthController::class)
        ->middleware('throttle:health');

    Route::get('/categories', [App\Http\Controllers\Api\V1\CategoryController::class, 'index'])
        ->name('api.v1.categories.index');

    // Bannières actives de la vitrine (lancement / promo).

    Route::get('/banners', [App\Http\Controllers\Api\V1\Banner\BannerController::class, 'index'])
        ->name('api.v1.banners.index');

    // ── Catalogue public ───────────────────────────────────────────────
    // Produits : liste + recherche + filtres, puis fiche détaillée.

    Route::get('/products', [App\Http\Controllers\Api\V1\ProductController::class, 'index'])
        ->name('api.v1.products.index');

    Route::get('/products/{slug}', [App\Http\Controllers\Api\V1\ProductController::class, 'show'])
        ->name('api.v1.products.show');

    // ── Avis publics par produit ────────────────────────────────────────

    Route::get('/products/{product}/reviews', [App\Http\Controllers\Api\V1\Review\ReviewController::class, 'index'])
        ->name('api.v1.products.reviews.index');

    // Boutique publique : fiche + produits, appelée aussi par les liens
    // partagés (le parrainage est compté via le paramètre « ref »).

    Route::get('/sellers/{slug}', [App\Http\Controllers\Api\V1\ShopController::class, 'show'])
        ->name('api.v1.sellers.show');

    // ── Méthodes de paiement (publique, consultée au moment de la commande)
    //    Le montant, lui, reste calculé côté serveur.

    Route::get('/payment-methods', [App\Http\Controllers\Api\V1\Payment\PaymentController::class, 'methods'])
        ->name('api.v1.payments.methods');

    // ── Authentification SPA ───────────────────────────────────────────

    Route::post('/auth/register', [App\Http\Controllers\Api\V1\Auth\AuthController::class, 'register'])
        ->middleware('throttle:10,1')
        ->name('api.v1.auth.register');

    Route::post('/auth/login', [App\Http\Controllers\Api\V1\Auth\AuthController::class, 'login'])
        ->middleware('throttle:10,1')
        ->name('api.v1.auth.login');

    Route::post('/auth/logout', [App\Http\Controllers\Api\V1\Auth\AuthController::class, 'logout'])
        ->middleware('auth:sanctum')
        ->name('api.v1.auth.logout');

    // ── Réinitialisation mot de passe ──────────────────────────────────

    Route::post('/auth/forgot-password', [App\Http\Controllers\Api\V1\Auth\PasswordResetController::class, 'forgotPassword'])
        ->middleware('throttle:5,1')
        ->name('api.v1.auth.forgot-password');

    Route::post('/auth/reset-password', [App\Http\Controllers\Api\V1\Auth\PasswordResetController::class, 'resetPassword'])
        ->middleware('throttle:5,1')
        ->name('api.v1.auth.reset-password');

    // ── Connexion / inscription par numéro de téléphone (phase 3) ────────
    // Pas d'email ni de mot de passe : code SMS (lu à voix haute possible).

    Route::post('/auth/phone/request-code', [App\Http\Controllers\Api\V1\Auth\PhoneAuthController::class, 'requestCode'])
        ->middleware('throttle:otp')
        ->name('api.v1.auth.phone.request-code');

    Route::post('/auth/phone/verify-code', [App\Http\Controllers\Api\V1\Auth\PhoneAuthController::class, 'verifyCode'])
        ->middleware('throttle:otp')
        ->name('api.v1.auth.phone.verify-code');

    // ── Utilisateur courant (session SPA) ──────────────────────────────

    Route::middleware('auth:sanctum')->group(function () {

        Route::get('/me', [App\Http\Controllers\Api\V1\Auth\AuthController::class, 'me'])
            ->name('api.v1.me');

        // ── Panier ──────────────────────────────────────────────────────

        Route::get('/cart', [App\Http\Controllers\Api\V1\Cart\CartController::class, 'index'])
            ->name('api.v1.cart.index');

        Route::post('/cart/items', [App\Http\Controllers\Api\V1\Cart\CartController::class, 'add'])
            ->name('api.v1.cart.add');

        Route::patch('/cart/items/{item}', [App\Http\Controllers\Api\V1\Cart\CartController::class, 'update'])
            ->name('api.v1.cart.update');

        Route::delete('/cart/items/{item}', [App\Http\Controllers\Api\V1\Cart\CartController::class, 'remove'])
            ->name('api.v1.cart.remove');

        Route::delete('/cart', [App\Http\Controllers\Api\V1\Cart\CartController::class, 'clear'])
            ->name('api.v1.cart.clear');

        // ── Adresses ────────────────────────────────────────────────────

        Route::get('/addresses', [App\Http\Controllers\Api\V1\Address\AddressController::class, 'index'])
            ->name('api.v1.addresses.index');

        Route::post('/addresses', [App\Http\Controllers\Api\V1\Address\AddressController::class, 'store'])
            ->name('api.v1.addresses.store');

        Route::put('/addresses/{address}', [App\Http\Controllers\Api\V1\Address\AddressController::class, 'update'])
            ->name('api.v1.addresses.update');

        Route::delete('/addresses/{address}', [App\Http\Controllers\Api\V1\Address\AddressController::class, 'destroy'])
            ->name('api.v1.addresses.destroy');

        // ── Commandes & checkout ────────────────────────────────────────

        Route::post('/checkout', [App\Http\Controllers\Api\V1\Checkout\CheckoutController::class, 'store'])
            ->name('api.v1.checkout.store');

        Route::get('/orders', [App\Http\Controllers\Api\V1\Order\OrderController::class, 'index'])
            ->name('api.v1.orders.index');

        Route::post('/orders/{orderNumber}/cancel', [App\Http\Controllers\Api\V1\Order\OrderController::class, 'cancel'])
            ->name('api.v1.orders.cancel');

        Route::get('/orders/{orderNumber}', [App\Http\Controllers\Api\V1\Order\OrderController::class, 'show'])
            ->name('api.v1.orders.show');

        // ── Paiement (webhook fournisseur simulé) ───────────────────────

        Route::post('/payments/{payment}/callback', [App\Http\Controllers\Api\V1\Payment\PaymentController::class, 'callback'])
            ->name('api.v1.payments.callback');

        // ── Favoris ─────────────────────────────────────────────────────

        Route::get('/favorites', [App\Http\Controllers\Api\V1\Favorite\FavoriteController::class, 'index'])
            ->name('api.v1.favorites.index');

        Route::post('/favorites/{productId}', [App\Http\Controllers\Api\V1\Favorite\FavoriteController::class, 'store'])
            ->name('api.v1.favorites.store');

        Route::delete('/favorites/{productId}', [App\Http\Controllers\Api\V1\Favorite\FavoriteController::class, 'destroy'])
            ->name('api.v1.favorites.destroy');

        // ── Avis (authentifié) ──────────────────────────────────────────

        Route::post('/products/{product}/reviews', [App\Http\Controllers\Api\V1\Review\ReviewController::class, 'store'])
            ->name('api.v1.products.reviews.store');

        // ── Notifications ───────────────────────────────────────────────

        Route::get('/notifications', [App\Http\Controllers\Api\V1\Notification\NotificationController::class, 'index'])
            ->name('api.v1.notifications.index');

        Route::get('/notifications/unread-count', [App\Http\Controllers\Api\V1\Notification\NotificationController::class, 'unreadCount'])
            ->name('api.v1.notifications.unread-count');

        Route::patch('/notifications/{id}/read', [App\Http\Controllers\Api\V1\Notification\NotificationController::class, 'markRead'])
            ->name('api.v1.notifications.mark-read');

        Route::patch('/notifications/read-all', [App\Http\Controllers\Api\V1\Notification\NotificationController::class, 'markAllRead'])
            ->name('api.v1.notifications.mark-all-read');

        // ── Choix de profil (phase 3) : Acheteur / Vendeur / Livreur ─────

        Route::post('/auth/profile', [App\Http\Controllers\Api\V1\Auth\PhoneAuthController::class, 'chooseProfile'])
            ->name('api.v1.auth.profile');

        // ── Paramètres (phase 3) ─────────────────────────────────────────

        Route::get('/settings', [App\Http\Controllers\Api\V1\Settings\SettingsController::class, 'index'])
            ->name('api.v1.settings.index');

        Route::patch('/settings', [App\Http\Controllers\Api\V1\Settings\SettingsController::class, 'update'])
            ->name('api.v1.settings.update');

        Route::post('/settings/help/contact', [App\Http\Controllers\Api\V1\Settings\SettingsController::class, 'contact'])
            ->name('api.v1.settings.help.contact');

        // Sécurité : code PIN 4 chiffres + biométrie (WebAuthn navigateur).

        Route::patch('/settings/security/pin', [App\Http\Controllers\Api\V1\Settings\SecurityController::class, 'updatePin'])
            ->name('api.v1.settings.security.pin');

        Route::post('/settings/security/pin/verify', [App\Http\Controllers\Api\V1\Settings\SecurityController::class, 'verifyPin'])
            ->name('api.v1.settings.security.pin.verify');

        Route::get('/settings/security', [App\Http\Controllers\Api\V1\Settings\SecurityController::class, 'securityOverview'])
            ->name('api.v1.settings.security');

        Route::post('/settings/security/biometric/challenge', [App\Http\Controllers\Api\V1\Settings\SecurityController::class, 'biometricChallenge'])
            ->name('api.v1.settings.security.biometric.challenge');

        Route::post('/settings/security/biometric/register', [App\Http\Controllers\Api\V1\Settings\SecurityController::class, 'biometricRegister'])
            ->name('api.v1.settings.security.biometric.register');

        Route::post('/settings/security/biometric/unlock', [App\Http\Controllers\Api\V1\Settings\SecurityController::class, 'biometricUnlock'])
            ->name('api.v1.settings.security.biometric.unlock');

        // ── Onboarding vendeur (5 étapes) + parrainage (phase 3) ─────────

        Route::prefix('seller')->group(function () {
            Route::get('/onboarding', [App\Http\Controllers\Api\V1\Seller\SellerOnboardingController::class, 'progress'])
                ->name('api.v1.seller.onboarding.progress');

            Route::get('/onboarding/step', [App\Http\Controllers\Api\V1\Seller\SellerOnboardingController::class, 'progress'])
                ->name('api.v1.seller.onboarding.current');

            Route::post('/onboarding/step1', [App\Http\Controllers\Api\V1\Seller\SellerOnboardingController::class, 'step1'])
                ->name('api.v1.seller.onboarding.step1');

            Route::post('/onboarding/step/{step}', [App\Http\Controllers\Api\V1\Seller\SellerOnboardingController::class, 'step'])
                ->whereIn('step', [2, 3, 4, 5])
                ->name('api.v1.seller.onboarding.step');

            Route::post('/onboarding/sponsor', [App\Http\Controllers\Api\V1\Auth\PhoneAuthController::class, 'sponsor'])
                ->name('api.v1.seller.onboarding.sponsor');

            // Commandes vendeur segmentées + actions rapides.

            Route::get('/orders', [App\Http\Controllers\Api\V1\Seller\SellerOrderController::class, 'index'])
                ->name('api.v1.seller.orders.index');

            Route::get('/orders/{orderNumber}', [App\Http\Controllers\Api\V1\Seller\SellerOrderController::class, 'show'])
                ->name('api.v1.seller.orders.show');

            Route::post('/orders/{orderNumber}/accept', [App\Http\Controllers\Api\V1\Seller\SellerOrderController::class, 'accept'])
                ->name('api.v1.seller.orders.accept');

            Route::post('/orders/{orderNumber}/refuse', [App\Http\Controllers\Api\V1\Seller\SellerOrderController::class, 'refuse'])
                ->name('api.v1.seller.orders.refuse');

            Route::post('/orders/{orderNumber}/ship', [App\Http\Controllers\Api\V1\Seller\SellerOrderController::class, 'ship'])
                ->name('api.v1.seller.orders.ship');

            Route::post('/orders/{orderNumber}/delivered', [App\Http\Controllers\Api\V1\Seller\SellerOrderController::class, 'delivered'])
                ->name('api.v1.seller.orders.delivered');

            // Finances + analyse vendeur.

            Route::get('/finances', [App\Http\Controllers\Api\V1\Seller\SellerFinanceController::class, 'index'])
                ->name('api.v1.seller.finances');

            Route::post('/payouts', [App\Http\Controllers\Api\V1\Seller\SellerFinanceController::class, 'payout'])
                ->name('api.v1.seller.payouts');

            Route::get('/analytics', [App\Http\Controllers\Api\V1\Seller\SellerAnalyticsController::class, 'index'])
                ->name('api.v1.seller.analytics');

            // Produits du vendeur (la boutique doit exister pour créer).
            Route::get('/products', [App\Http\Controllers\Api\V1\Seller\SellerProductController::class, 'index'])
                ->name('api.v1.seller.products.index');

            Route::post('/products', [App\Http\Controllers\Api\V1\Seller\SellerProductController::class, 'store'])
                ->name('api.v1.seller.products.store');

            Route::patch('/products/{product}', [App\Http\Controllers\Api\V1\Seller\SellerProductController::class, 'update'])
                ->name('api.v1.seller.products.update');

            Route::delete('/products/{product}', [App\Http\Controllers\Api\V1\Seller\SellerProductController::class, 'destroy'])
                ->name('api.v1.seller.products.destroy');
        });

        // Boutique : point de vue vendeur + comptage des partages.

        Route::get('/seller/shop', [App\Http\Controllers\Api\V1\ShopController::class, 'mine'])
            ->name('api.v1.seller.shop');

        Route::post('/seller/shop/share', [App\Http\Controllers\Api\V1\ShopController::class, 'trackShare'])
            ->name('api.v1.seller.shop.share');

        // ── Marketing : codes promo + parrainage ─────────────────────────

        Route::post('/promo-codes/validate', [App\Http\Controllers\Api\V1\Promo\PromoController::class, 'validate'])
            ->name('api.v1.promo-codes.validate');

        Route::get('/referrals', [App\Http\Controllers\Api\V1\Promo\ReferralController::class, 'index'])
            ->name('api.v1.referrals.index');

        // ── Litiges (phase 3) : photo + message vocal ─────────────────────

        Route::get('/disputes', [App\Http\Controllers\Api\V1\DisputeController::class, 'index'])
            ->name('api.v1.disputes.index');

        Route::post('/disputes', [App\Http\Controllers\Api\V1\DisputeController::class, 'store'])
            ->name('api.v1.disputes.store');

        Route::get('/disputes/{dispute}', [App\Http\Controllers\Api\V1\DisputeController::class, 'show'])
            ->name('api.v1.disputes.show');

        Route::post('/disputes/{dispute}/messages', [App\Http\Controllers\Api\V1\DisputeController::class, 'message'])
            ->name('api.v1.disputes.messages');

        // ── Livreur (phase 3) ─────────────────────────────────────────────

        Route::prefix('delivery')->group(function () {
            Route::get('/onboarding', [App\Http\Controllers\Api\V1\Delivery\CourierOnboardingController::class, 'progress'])
                ->name('api.v1.delivery.onboarding.progress');

            Route::post('/onboarding/step1', [App\Http\Controllers\Api\V1\Delivery\CourierOnboardingController::class, 'step1'])
                ->name('api.v1.delivery.onboarding.step1');

            Route::post('/onboarding/step/{step}', [App\Http\Controllers\Api\V1\Delivery\CourierOnboardingController::class, 'step'])
                ->whereIn('step', [2, 3, 4])
                ->name('api.v1.delivery.onboarding.step');

            Route::patch('/availability', [App\Http\Controllers\Api\V1\Delivery\CourierOnboardingController::class, 'availability'])
                ->name('api.v1.delivery.availability');

            Route::get('/jobs', [App\Http\Controllers\Api\V1\Delivery\CourierJobController::class, 'index'])
                ->name('api.v1.delivery.jobs');

            Route::post('/jobs/{delivery}/pickup', [App\Http\Controllers\Api\V1\Delivery\CourierJobController::class, 'pickup'])
                ->name('api.v1.delivery.jobs.pickup');

            Route::post('/jobs/{delivery}/deliver', [App\Http\Controllers\Api\V1\Delivery\CourierJobController::class, 'deliver'])
                ->name('api.v1.delivery.jobs.deliver');
        });

        // ── Administration : console de pilotage de la place ──────────────
        // Lecture pour admin + modérateur (admin.access), écritures sensibles
        // réservées aux rôles disposant de la permission dédiée (admin : '*').

        Route::prefix('admin')->middleware('can:admin.access')->group(function () {

            Route::get('/dashboard', [App\Http\Controllers\Api\V1\Admin\AdminDashboardController::class, 'index'])
                ->name('api.v1.admin.dashboard');

            // Validation des livreurs (modérateur et admin).
            Route::get('/couriers/pending', [App\Http\Controllers\Api\V1\Admin\CourierApprovalController::class, 'pending'])
                ->name('api.v1.admin.couriers.pending');

            Route::post('/couriers/{courier}/approve', [App\Http\Controllers\Api\V1\Admin\CourierApprovalController::class, 'approve'])
                ->name('api.v1.admin.couriers.approve');

            Route::post('/couriers/{courier}/reject', [App\Http\Controllers\Api\V1\Admin\CourierApprovalController::class, 'reject'])
                ->name('api.v1.admin.couriers.reject');

            Route::get('/couriers', [App\Http\Controllers\Api\V1\Admin\AdminCourierController::class, 'index'])
                ->name('api.v1.admin.couriers.index');

            // Boutiques : vérification + pilotage (modérateur et admin).
            Route::get('/sellers', [App\Http\Controllers\Api\V1\Admin\AdminSellerController::class, 'index'])
                ->name('api.v1.admin.sellers.index');

            Route::post('/sellers/{seller}/verify', [App\Http\Controllers\Api\V1\Admin\AdminSellerController::class, 'verify'])
                ->name('api.v1.admin.sellers.verify');

            Route::post('/sellers/{seller}/reject', [App\Http\Controllers\Api\V1\Admin\AdminSellerController::class, 'reject'])
                ->name('api.v1.admin.sellers.reject');

            Route::patch('/sellers/{seller}', [App\Http\Controllers\Api\V1\Admin\AdminSellerController::class, 'update'])
                ->name('api.v1.admin.sellers.update');

            // Commandes : suivi global.
            Route::get('/orders', [App\Http\Controllers\Api\V1\Admin\AdminOrderController::class, 'index'])
                ->name('api.v1.admin.orders.index');

            Route::get('/orders/{orderNumber}', [App\Http\Controllers\Api\V1\Admin\AdminOrderController::class, 'show'])
                ->name('api.v1.admin.orders.show');

            Route::patch('/orders/{order}', [App\Http\Controllers\Api\V1\Admin\AdminOrderController::class, 'updateStatus'])
                ->name('api.v1.admin.orders.status');

            Route::post('/orders/{order}/cancel', [App\Http\Controllers\Api\V1\Admin\AdminOrderController::class, 'cancel'])
                ->name('api.v1.admin.orders.cancel');

            // Produits : modération du catalogue.
            Route::get('/products', [App\Http\Controllers\Api\V1\Admin\AdminProductController::class, 'index'])
                ->name('api.v1.admin.products.index');

            Route::patch('/products/{product}', [App\Http\Controllers\Api\V1\Admin\AdminProductController::class, 'update'])
                ->middleware('can:products.moderate')
                ->name('api.v1.admin.products.update');

            // Utilisateurs : gestion des comptes et des rôles.
            Route::get('/users', [App\Http\Controllers\Api\V1\Admin\AdminUserController::class, 'index'])
                ->name('api.v1.admin.users.index');

            Route::patch('/users/{user}', [App\Http\Controllers\Api\V1\Admin\AdminUserController::class, 'update'])
                ->middleware('can:users.manage')
                ->name('api.v1.admin.users.update');

            Route::patch('/users/{user}/role', [App\Http\Controllers\Api\V1\Admin\AdminUserController::class, 'updateRole'])
                ->middleware('can:users.manage')
                ->name('api.v1.admin.users.role');

            // Marketing : bannières + codes promo + parrainages.
            Route::get('/banners', [App\Http\Controllers\Api\V1\Admin\AdminBannerController::class, 'index'])
                ->name('api.v1.admin.banners.index');

            Route::post('/banners', [App\Http\Controllers\Api\V1\Admin\AdminBannerController::class, 'store'])
                ->middleware('can:banners.manage')
                ->name('api.v1.admin.banners.store');

            Route::put('/banners/{banner}', [App\Http\Controllers\Api\V1\Admin\AdminBannerController::class, 'update'])
                ->middleware('can:banners.manage')
                ->name('api.v1.admin.banners.update');

            Route::delete('/banners/{banner}', [App\Http\Controllers\Api\V1\Admin\AdminBannerController::class, 'destroy'])
                ->middleware('can:banners.manage')
                ->name('api.v1.admin.banners.destroy');

            Route::get('/promo-codes', [App\Http\Controllers\Api\V1\Admin\AdminPromoCodeController::class, 'index'])
                ->name('api.v1.admin.promo-codes.index');

            Route::post('/promo-codes', [App\Http\Controllers\Api\V1\Admin\AdminPromoCodeController::class, 'store'])
                ->middleware('can:promocodes.manage')
                ->name('api.v1.admin.promo-codes.store');

            Route::put('/promo-codes/{promoCode}', [App\Http\Controllers\Api\V1\Admin\AdminPromoCodeController::class, 'update'])
                ->middleware('can:promocodes.manage')
                ->name('api.v1.admin.promo-codes.update');

            Route::delete('/promo-codes/{promoCode}', [App\Http\Controllers\Api\V1\Admin\AdminPromoCodeController::class, 'destroy'])
                ->middleware('can:promocodes.manage')
                ->name('api.v1.admin.promo-codes.destroy');

            Route::get('/referrals', [App\Http\Controllers\Api\V1\Admin\AdminReferralController::class, 'index'])
                ->name('api.v1.admin.referrals.index');
        });

    });

});
