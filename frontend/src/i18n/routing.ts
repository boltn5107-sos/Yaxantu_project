import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "wo"],
  defaultLocale: "fr",
  localePrefix: "always",
});