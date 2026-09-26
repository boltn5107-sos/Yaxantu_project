import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("legal");

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900">
        {t("privacy.title")}
      </h1>
      <p className="mt-2 text-sm text-gray-500">{t("privacy.lastUpdated")}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("privacy.sections.collected.title")}
          </h2>
          <p className="mt-2">{t("privacy.sections.collected.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("privacy.sections.usage.title")}
          </h2>
          <p className="mt-2">{t("privacy.sections.usage.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("privacy.sections.sharing.title")}
          </h2>
          <p className="mt-2">{t("privacy.sections.sharing.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("privacy.sections.security.title")}
          </h2>
          <p className="mt-2">{t("privacy.sections.security.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("privacy.sections.retention.title")}
          </h2>
          <p className="mt-2">{t("privacy.sections.retention.body")}</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            {t("privacy.sections.rights.title")}
          </h2>
          <p className="mt-2">{t("privacy.sections.rights.body")}</p>
        </section>
      </div>
    </div>
  );
}
