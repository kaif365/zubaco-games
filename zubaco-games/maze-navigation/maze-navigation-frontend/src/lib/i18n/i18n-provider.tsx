import i18next from "i18next";
import { useEffect, type ReactNode } from "react";
import { initReactI18next, useTranslation } from "react-i18next";

import { en } from "@/locales/en";
import { hi } from "@/locales/hi";

import {
  getLangFromSearch,
  normalizeLang,
  readLangCookie,
  writeLangCookie,
} from "./lang-cookie";

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    debug: false,
    ns: Object.keys(en),
    defaultNS: "translation",
    fallbackNS: "translation",
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "hi"],
    resources: { en, hi },
    interpolation: {
      prefix: "{",
      suffix: "}",
      escapeValue: false,
    },
  });
}

interface I18nProviderProps {
  readonly children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const langParam = getLangFromSearch(globalThis.window.location.search);
    const cookieLang = readLangCookie();
    const resolvedLanguage = normalizeLang(langParam ?? cookieLang ?? "en");
    writeLangCookie(resolvedLanguage);
    void i18n.changeLanguage(resolvedLanguage);
    document.documentElement.lang = resolvedLanguage;
  }, [i18n]);

  useEffect(() => {
    const onLanguageChanged = (lng: string) => {
      document.documentElement.lang = normalizeLang(lng);
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [i18n]);

  return children;
}
