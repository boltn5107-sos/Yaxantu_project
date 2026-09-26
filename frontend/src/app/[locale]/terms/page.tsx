import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900">{t("terms.title")}</h1>
      <p className="mt-2 text-sm text-gray-500">{t("terms.lastUpdated")}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("terms.sections.purpose.title")}
          </h2>
          <p className="mt-2">{t("terms.sections.purpose.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("terms.sections.account.title")}
          </h2>
          <p className="mt-2">{t("terms.sections.account.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("terms.sections.orders.title")}
          </h2>
          <p className="mt-2">{t("terms.sections.orders.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("terms.sections.sellers.title")}
          </h2>
          <p className="mt-2">{t("terms.sections.sellers.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("terms.sections.influencers.title")}
          </h2>
          <p className="mt-2">{t("terms.sections.influencers.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("terms.sections.disputes.title")}
          </h2>
          <p className="mt-2">{t("terms.sections.disputes.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("terms.sections.responsibility.title")}
          </h2>
          <p className="mt-2">{t("terms.sections.responsibility.body")}</p>
        </section>
      </div>
    </div>
  );
}
