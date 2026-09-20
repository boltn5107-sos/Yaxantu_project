# Yaxantu — Marketplace africaine

Plateforme de e-commerce panafricaine connectée : catalogue, panier, commandes, avis, favoris, espace vendeur (onboarding, produits, commandes, finances, analytics) et livraison avec validation explicite des frais.

## Stack

| Couche   | Technologie                                  |
| -------- | -------------------------------------------- |
| Backend  | Laravel 12 (PHP ≥ 8.2) + Sanctum (auth SPA)  |
| Frontend | Next.js 16 · React 19 · Tailwind CSS 4        |
| BDD      | MySQL / MariaDB (XAMPP) — PostgreSQL prévu   |
| Images   | Unsplash (saveurs, marchés et artisanat africains), servies via `Media::url` |

## Structure

```
Yaxantu/
├─ backend/    API REST Laravel (http://localhost:8000/api)
│  ├─ app/Http/Resources/    ressources normalisées (images → Media::url)
│  ├─ app/Support/Media.php  helper d'URL image (http(s)/data: ou Storage::url)
│  └─ database/seeders/      rôles, catégories, produits, config business
├─ frontend/   Application Next.js (http://localhost:3000)
│  └─ src/app, src/components, src/lib (api, auth, utils…)
└─ README.md
```

## Prérequis

- PHP ≥ 8.2, Composer
- Node.js ≥ 20
- MySQL / MariaDB (ex. XAMPP)

## Installation

### 1. Backend

```bash
cd backend
composer install
cp .env.example .env          # ou déjà fourni en local
php artisan key:generate
```

Créez la base `yaxantu` puis, dans `.env` :

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=yaxantu
DB_USERNAME=root            # adapter à XAMPP (ou user dédié)
DB_PASSWORD=
FRONTEND_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000
```

```bash
php artisan migrate --seed
php artisan serve            # API sur http://localhost:8000
```

Le seeder crée un compte administrateur de démo :

```
admin@yaxantu.local / ChangeMe2026!
```

### 2. Frontend

```bash
cd frontend
npm install
```

Créez `frontend/.env.local` :

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

```bash
npm run dev                  # application sur http://localhost:3000
```

## Tests & qualité

```bash
# Backend (100 tests / 457 assertions)
cd backend && vendor\bin\phpunit

# Frontend
cd frontend
npm run lint
npm run build
```

## Fonctionnalités clés

- **Catalogue** produit par catégorie, recherche, fiches produit avec galerie et avis.
- **Panier** lié à la session ; **checkout** avec adresse de livraison.
- **Livraison** : les frais ne sont appliqués qu'avec accord explicite de l'acheteur (`shipping_approved`) via la checkbox de confirmation.
- **Commandes** client (suivi, statuts) et vendeur.
- **Espace vendeur** : onboarding, dépôt de produits, gestion des commandes, finances, analytics.
- **Favoris** et **avis** notés 1–5 étoiles.
- **Auth SPA** par cookies Sanctum (pas de token dans le frontend ; pas de XSRF requis sur `/api`).

## Images

La vitrine utilise de vraies images Unsplash (thèmes africains : marché, tissus, artisanat, cuisine) :

- produits de démo → URLs absolues définies dans `ProductSeeder` ;
- images "tout usage" → `fallbackImage(width, height, seed)` dans `frontend/src/lib/utils.ts` (panier, favoris, commandes, cartes produit) ;
- les ressources PHP normalisent `thumbnail`, `logo`, `avatar`… via `App\Support\Media::url()`.

## Notes

- Panier et session SQL (`SESSION_DRIVER=database`) ; files d'attente et cache en base (prévoir Redis/PostgreSQL pour la prod).
- `backend/public/storage` (symlink) : uniquement nécessaire si vous servez des fichiers uploadés avec `Storage::url` ; le socle démo utilise des URLs web.