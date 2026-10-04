import type en from "./locales/en.json"

// Typed translation keys: a typo in t("...") becomes a compile error.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: { translation: typeof en }
  }
}
