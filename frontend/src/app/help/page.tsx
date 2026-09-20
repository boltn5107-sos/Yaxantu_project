import Link from "next/link";

const faqs = [
  {
    question: "Comment passer une commande ?",
    answer:
      "Ajoutez des articles au panier, validez vos adresses, choisissez votre moyen de paiement (dont le paiement à la livraison) et confirmez. Vous pouvez suivre votre commande depuis « Mes commandes ».",
  },
  {
    question: "Comment utiliser un code promo ?",
    answer:
      "Saisissez votre code promo à l'étape de validation du panier. Les codes de nos influenceurs offrent des réductions immédiates sur votre commande.",
  },
  {
    question: "Quels moyens de paiement sont disponibles ?",
    answer:
      "Nous acceptons le paiement à la livraison (COD), le Mobile Money, Wave et le virement bancaire selon les régions desservies.",
  },
  {
    question: "Comment suivre ma livraison ?",
    answer:
      "Une fois votre commande expédiée, son statut passe à « Expédiée » puis « En livraison ». Un livreur partenaire vous contacte avant la remise.",
  },
  {
    question: "Comment devenir vendeur ?",
    answer:
      "Depuis la page « Vendre », créez votre boutique, renseignez vos produits et vos conditions de livraison. Un modérateur valide votre boutique avant sa mise en ligne.",
  },
  {
    question: "Comment devenir influenceur ?",
    answer:
      "Crééez un compte, puis postulez depuis la page « Espace influenceur ». Après validation, vous obtenez un code promo et gagnez une commission sur chaque vente.",
  },
  {
    question: "Comment récupérer mon mot de passe ?",
    answer:
      "Utilisez « Mot de passe oublié » sur la page de connexion pour recevoir un lien de réinitialisation par e-mail.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Centre d&apos;aide</h1>
      <p className="mt-2 text-gray-600">
        Les réponses aux questions les plus fréquentes.
      </p>

      <div className="mt-8 space-y-4">
        {faqs.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-2xl border border-gray-200 bg-white p-5"
          >
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-900">
              {faq.question}
              <span className="ml-3 text-blue-700 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-blue-200 bg-blue-50 p-6 text-center">
        <p className="text-sm text-blue-800">
          Besoin d&apos;autre chose ?
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Contacter le support
        </Link>
      </div>
    </div>
  );
}