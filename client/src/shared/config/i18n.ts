import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ko from "../locales/ko.json";
import en from "../locales/en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
    },
    fallbackLng: "ko",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

// Function to sync with server setting
export const syncLanguageWithServer = async () => {
  try {
    const res = await fetch("/api/settings/config");
    const config = await res.json();
    if (config.language && i18n.language !== config.language) {
      i18n.changeLanguage(config.language);
    }
  } catch (e) {
    console.error("Failed to sync language with server", e);
  }
};

export default i18n;
