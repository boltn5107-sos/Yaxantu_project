"use client";

import { useState } from "react";
import Link from "next/link";
import { User, MapPin, Bell, Shield, LogOut, Package, Heart } from "lucide-react";

type Section = "profile" | "addresses" | "notifications" | "security";

const sections = [
  { id: "profile", label: "Profil", icon: User, description: "Informations personnelles" },
  { id: "addresses", label: "Adresses", icon: MapPin, description: "Gestion des adresses" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Préférences de notification" },
  { id: "security", label: "Sécurité", icon: Shield, description: "Mot de passe et sécurité" },
] as const;

export default function ProfilePage() {
  const [active, setActive] = useState<Section>("profile");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mon compte</h1>
        <p className="mt-1 text-gray-600">Gérez vos informations et préférences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-lg font-semibold">
                  JD
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Jean Dupont</p>
                  <p className="text-xs text-gray-600">jean.dupont@example.com</p>
                </div>
              </div>
            </div>
            <nav className="p-2">
              {sections.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActive(item.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="text-left">
                      <div>{item.label}</div>
                      <div className={`text-xs ${isActive ? "text-blue-600" : "text-gray-500"}`}>{item.description}</div>
                    </div>
                  </button>
                );
              })}
              <div className="my-1 border-t border-gray-100" />
              <Link
                href="/"
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Link>
            </nav>
          </div>
        </aside>

        <section className="lg:col-span-3">
          {active === "profile" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Profil</h2>
                <p className="text-sm text-gray-600">Modifiez vos informations personnelles.</p>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xl font-semibold">
                  JD
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">Jean Dupont</p>
                  <p className="text-sm text-gray-600">jean.dupont@example.com</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" defaultValue="Dupont" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" defaultValue="Jean" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" defaultValue="+237 6XX XXX XXX" />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Link href="/orders" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors">
                    <Package className="h-4 w-4" />
                    Mes commandes
                  </Link>
                  <Link href="/favorites" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors">
                    <Heart className="h-4 w-4" />
                    Favoris
                  </Link>
                </div>
                <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  Enregistrer
                </button>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-gray-100 pt-4">
                <Link href="/seller/orders" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                  Mes ventes
                </Link>
                <Link href="/seller/finances" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                  Mes finances
                </Link>
                <Link href="/settings" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  Paramètres &amp; sécurité
                </Link>
              </div>
            </div>
          )}

          {active === "addresses" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Adresses</h2>
                <p className="text-sm text-gray-600">Ajoutez une adresse de livraison par défaut.</p>
              </div>
              <button className="rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                + Ajouter une adresse
              </button>
            </div>
          )}

          {active === "notifications" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-600">Gérez vos préférences de notification.</p>
              </div>
              <div className="space-y-4">
                {["Notifications par email", "Notifications SMS", "Notifications push"].map((label) => (
                  <label key={label} className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                    <span className="text-sm font-medium text-gray-900">{label}</span>
                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                  </label>
                ))}
              </div>
            </div>
          )}

          {active === "security" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Sécurité</h2>
                <p className="text-sm text-gray-600">Modifiez votre mot de passe et sécurisez votre compte.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
                  <input type="password" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                  <input type="password" className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="mt-6">
                <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                  Mettre à jour
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
