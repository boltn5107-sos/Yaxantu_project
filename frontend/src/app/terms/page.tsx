export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Conditions générales</h1>
      <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : 2026</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. Objet</h2>
          <p className="mt-2">
            Les présentes conditions encadrent l&apos;utilisation de la plateforme
            Yaxantu, marketplace mettant en relation acheteurs, vendeurs,
            livreurs et influenceurs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. Compte utilisateur</h2>
          <p className="mt-2">
            Vous devez fournir des informations exactes lors de la création de
            votre compte. Vous êtes responsable des activités réalisées depuis
            votre compte et vous engagez à protéger vos identifiants.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">3. Commandes &amp; paiements</h2>
          <p className="mt-2">
            Une commande est ferme après confirmation. Les paiements à la
            livraison sont recouvrés à la remise du colis. Les codes promo ne
            sont pas cumulables entre eux et leur valeur est fixée par
            l&apos;émetteur du code.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">4. Vendeurs</h2>
          <p className="mt-2">
            Les vendeurs s&apos;engagent à fournir des produits conformes à leur
            description, à respecter les délais et à honorer les commandes
            acceptées. Tout manquement peut entraîner la suspension de la
            boutique.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">5. Programme influenceurs</h2>
          <p className="mt-2">
            Les influenceurs perçoivent une commission calculée sur les ventes
            réalisées via leur code promo. Les commissions sont créditées après
            approbation et ne sont pas versées pour les commandes annulées ou
            remboursées.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. Litiges</h2>
          <p className="mt-2">
            En cas de problème, ouvrez une réclamation depuis votre espace dans
            un délai de 14 jours après livraison. Notre équipe arbitre sur la
            base des preuves (photos, échanges, historiques de commande).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. Responsabilité</h2>
          <p className="mt-2">
            Yaxantu agit comme intermédiaire entre ses utilisateurs et ne saurait
            être tenu responsable des biens vendus ou livrés, ni des manquements
            contractuels des utilisateurs.
          </p>
        </section>
      </div>
    </div>
  );
}