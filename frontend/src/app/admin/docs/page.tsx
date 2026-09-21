"use client";

import {
  Store,
  Bike,
  Megaphone,
  Scale,
  Wallet,
  Image,
  BadgePercent,
  Gift,
  BookOpen,
  ShieldCheck,
} from "lucide-react";

const sections = [
  {
    icon: Store,
    title: "Boutiques",
    subtitle: "Vérification et pilotage des vendeurs",
    items: [
      "Vérification d'identité : niveaux 1 à 3 (signalétique, identité confirmée, renforcée) via le bouton « Valider ».",
      "Statuts : à vérifier, active, suspendue, fermée. La suspension désactive immédiatement la boutique et prévient le vendeur.",
      "Score de confiance (0-100) ajustable dans « Réglages » — visible sur le profil vendeur.",
      "Commission personnalisée en points de base : laisser vide pour reprendre la commission par défaut de la plateforme.",
      "Recherche par nom de boutique ou propriétaire, filtre par statut.",
    ],
  },
  {
    icon: Bike,
    title: "Livreurs",
    subtitle: "Candidatures et opérationnel",
    items: [
      "Le dossier de candidature affiche les pièces (pièce d'identité, selfie) en cliquant dessus.",
      "« Approuver » envoie une confirmation au livreur et débloque sa bascule de disponibilité.",
      "« Réfuser » exige un motif qui sera transmis à l'intéressé.",
      "Un livreur approuvé peut être suspendu à tout moment (plus aucune livraison assignée), puis réactivé.",
      "Statuts possibles : brouillon, en attente, approuvé, refusé, suspendu.",
    ],
  },
  {
    icon: Megaphone,
    title: "Influenceurs",
    subtitle: "Affiliation et commissions",
    items: [
      "Candidatures à examiner : chaque influenceur fournit une description et un lien.",
      "Après approbation + activation, il touche une commission sur les commandes générées par son code.",
      "Les retraits de gain sont traités dans cette section (suivi par statut).",
    ],
  },
  {
    icon: Scale,
    title: "Litiges",
    subtitle: "Gestion des réclamations",
    items: [
      "Chaque litige est lié à une commande et à son créateur (client, vendeur ou livreur).",
      "Résolutions possibles : remboursement client, compensation du vendeur, remboursement + compensation.",
      "Una résolution clôture le litige et ajuste les versements concernés.",
    ],
  },
  {
    icon: Wallet,
    title: "Versements",
    subtitle: "Paiements des vendeurs",
    items: [
      "Les versements sont générés à partir des commandes livrées et du solde disponible.",
      "Statuts : en attente, payé, échoué, annulé. Chaque versement conserve l'historique et le récapitulatif des commandes.",
    ],
  },
  {
    icon: Image,
    title: "Bannières",
    subtitle: "Bandeaux de la page d'accueil",
    items: [
      "Importez une photo directement (JPG, PNG, WebP, GIF — 4 Mo max) ou indiquez une URL d'image.",
      "Les champs titre, sous-titre, lien au clic et ordre d'affichage sont modifiables après création.",
      "Un lien interne (/categories/...) ou externe (https://...) peut être ajouté pour rediriger les visiteurs.",
      "Désactivez une bannière sans la supprimer via la bascule Active / Inactive.",
    ],
  },
  {
    icon: BadgePercent,
    title: "Codes promo",
    subtitle: "Campagnes de remise",
    items: [
      "Création de codes avec type de remise (pourcentage / montant fixe / livraison gratuite).",
      "Périmètre : site entier, sélection de boutiques ou de groupes clients.",
      "Limite d'usage, période de validité et cumul autorisé à configurer.",
    ],
  },
  {
    icon: Gift,
    title: "Parrainages",
    subtitle: "Programme de fidélité",
    items: [
      "Suivi des parrains, des filleuls et du statut des récompenses.",
      "Les récompenses sont attribuées quand le parrainage est validé.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Modération",
    subtitle: "Actions transverses",
    items: [
      "Utilisateurs : recherche, activation / désactivation des comptes.",
      "Produits : approuver, désactiver, mener un produit à la conformité.",
      "Toute action est journalisée (traçabilité) et le créateur est notifié.",
    ],
  },
];

export default function AdminDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen className="h-6 w-6 text-blue-700" />
          Documentation
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Guide d&apos;utilisation du panneau d&apos;administration — chaque section de la barre latérale.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-sm leading-relaxed text-gray-700">
          Ce panneau est réservé aux administrateurs et modérateurs. Les actions sensibles (validation,
          suspension, versement) déclenchent toujours une notification vers la personne concernée et sont
          enregistrées dans le journal d&apos;audit. En cas de doute sur une action irréversible (fermeture,
          versement), confirmez toujours auprès du vendeur concerné.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-xs text-gray-500">{section.subtitle}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}