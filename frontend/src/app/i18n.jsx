import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

 
import translationEN from "./Locales/en/translation.json";
import translationFA from "./Locales/fa/translation.json";

const resources = {
  en: { translation: translationEN },
  fa: { translation: translationFA },
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector) // تشخیص خودکار زبان از localStorage یا مرورگر
  .init({
    resources,
    fallbackLng: "fa", // زبان پیش‌فرض (فارسی)
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"], // ابتدا localStorage و بعد زبان مرورگر را بررسی می‌کند
      caches: ["localStorage"],
    },
  });

export default i18n;
