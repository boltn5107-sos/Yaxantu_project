<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Contrôle d'accès par rôle (RBAC léger)
    |--------------------------------------------------------------------------
    |
    | Chaque map d'un rôle vers ses permissions. Le joker '*' donne un accès
    | total (réservé à l'administration). Les Politiques Laravel (app/Policies)
    | s'appuient sur User::hasPermission().
    |
    */

    'roles' => [

        'buyer' => [
            'label' => 'Acheteur',
            'permissions' => [
                'catalog.view',
                'products.view',
                'categories.view',
                'orders.create',
                'orders.view_own',
                'carts.manage',
                'reviews.create',
                'reviews.view',
                'favorites.manage',
                'profile.manage',
            ],
        ],

        'seller' => [
            'label' => 'Vendeur',
            'permissions' => [
                'catalog.view',
                'products.view',
                'orders.view_own',
                'sellers.manage',
                'products.manage',
                'inventory.manage',
                'orders.manage',
                'payouts.request',
                'reviews.view',
                'reviews.reply',
                'statistics.view',
            ],
        ],

        'delivery' => [
            'label' => 'Livreur',
            'permissions' => [
                'catalog.view',
                'deliveries.manage',
                'profile.manage',
            ],
        ],

        'moderator' => [
            'label' => 'Modérateur',
            'permissions' => [
                'admin.access',
                'moderation.products',
                'products.moderate',
                'moderation.reviews',
                'moderation.disputes',
                'reports.manage',
                'sellers.verify',
                'couriers.verify',
            ],
        ],

        'admin' => [
            'label' => 'Administrateur',
            'permissions' => ['*'],
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Libellés de permissions (trace / UI)
    |--------------------------------------------------------------------------
    */

    'permissions' => [
        'catalog.view' => 'Consulter le catalogue',
        'products.view' => 'Consulter les produits',
        'categories.view' => 'Consulter les catégories',
        'orders.create' => 'Créer une commande',
        'orders.view_own' => 'Voir ses commandes',
        'carts.manage' => 'Gérer son panier',
        'reviews.create' => 'Rédiger un avis',
        'reviews.view' => 'Consulter les avis',
        'reviews.reply' => 'Répondre aux avis',
        'favorites.manage' => 'Gérer ses favoris',
        'profile.manage' => 'Gérer son profil',
        'sellers.manage' => 'Gérer sa boutique',
        'sellers.verify' => 'Vérifier les vendeurs',
        'deliveries.manage' => 'Gérer les livraisons',
        'couriers.verify' => 'Valider les livreurs',
        'products.manage' => 'Gérer ses produits',
        'inventory.manage' => 'Gérer son stock',
        'orders.manage' => 'Gérer ses commandes',
        'payouts.request' => 'Demander un retrait',
        'statistics.view' => 'Consulter ses statistiques',
        'moderation.products' => 'Modérer les produits',
        'moderation.reviews' => 'Modérer les avis',
        'moderation.disputes' => 'Gérer les litiges',
        'reports.manage' => 'Gérer les signalements',
        'admin.access' => 'Accéder à l\'administration',
        'users.manage' => 'Gérer les utilisateurs',
        'orders.manage_all' => 'Gérer toutes les commandes',
        'products.moderate' => 'Modérer tous les produits',
        'promocodes.manage' => 'Gérer les codes promo',
        'banners.manage' => 'Gérer les bannières',
        'affiliates.manage' => 'Gérer les influenceurs',
        'payouts.manage' => 'Superviser les versements vendeurs',
        'finances.view' => 'Consulter les finances locales',
    ],

];