<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Taaba-taaba est une SPA (Next.js) qui consomme l'API Laravel avec des cookies
    | de session (Sanctum). `supports_credentials` DOIT rester à true pour que
    | les cookies httpOnly soient acceptés par le navigateur.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => env('CORS_ALLOWED_ORIGINS')
        ? explode(',', env('CORS_ALLOWED_ORIGINS'))
        : [env('FRONTEND_URL', 'http://localhost:3000')],

    'allowed_origins_patterns' => [],

    'allowed_headers' => [
        'Content-Type',
        'X-XSRF-TOKEN',
        'X-Requested-With',
        'Accept',
        'Authorization',
        'X-Locale',
    ],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => env('CORS_SUPPORTS_CREDENTIALS', true),

];