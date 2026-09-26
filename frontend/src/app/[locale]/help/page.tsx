import Link from "next/link";
import { useTranslations } from "next-intl";

const faqs = [
  {
    q: "faqs.order.question",
    a: "faqs.order.answer",
  },
  {
    q: "faqs.payment.question",
    a: "faqs.payment.answer",
  },
  {
    q: "faqs.delivery.question",
    a: "faqs.delivery.answer",
  },
  {
    q: "faqs.seller.question",
    a: "faqs.seller.answer",
  },
  {
    q: "faqs.password.question",
    a: "faqs.password.answer",
  },
] as const;

export default function HelpPage() {
  const t = useTranslations("help");

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mt-2 text-gray-600">{t("subtitle")}</p>

      <div className="mt-8 space-y-4">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-2xl border border-gray-200 bg-white p-5"
          >
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-gray-900">
              {t(faq.q)}
              <span className="ml-3 text-emerald-700 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{t(faq.a)}</p>
          </details>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-sm text-emerald-800">{t("needMore")}</p>
        <Link
          href="/contact"
          className="mt-3 inline-flex rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          {t("contactSupport")}
        </Link>
      </div>
    </div>
  );
}
