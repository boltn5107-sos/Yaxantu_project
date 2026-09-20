export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Données collectées</h2>
          <p className="mt-2">
            Nous collectons les informations fournies lors de la création du
            compte (nom, e-mail, téléphone), les adresses de livraison, les
            commandes et les échanges avec notre support.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. Utilisation des données</h2>
          <p className="mt-2">
            Vos données servent à traiter vos commandes, vous livrer, gérer votre
            compte, prévenir la fraude et améliorer nos services. Nous ne vendons
            jamais vos données personnelles à des tiers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. Partage encadré</h2>
          <p className="mt-2">
            Les informations nécessaires (adresse de livraison, coordonnées)
            sont partagées uniquement avec le vendeur et le livreur en charge de
            votre commande.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. Sécurité</h2>
          <p className="mt-2">
            Vos données sont protégées par des mesures techniques et
            organisationnelles adaptées (chiffrement en transit, accès
            restreints, journaux d&apos;audit).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Conservation</h2>
          <p className="mt-2">
            Nous conservons vos données le temps nécessaire au fonctionnement du
            service et au respect de nos obligations légales, puis elles sont
            supprimées ou anonymisées.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Vos droits</h2>
          <p className="mt-2">
            Vous pouvez demander l&apos;accès, la rectification ou la suppression de
            vos données personnelles à tout moment en nous contactant à
            privacy@yaxantu.com.
          </p>
        </section>
      </div>
    </div>
  );
}