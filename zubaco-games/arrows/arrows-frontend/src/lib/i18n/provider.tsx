"use client";

import {
  getLangFromSearch,
  normalizeLang,
  readLangStorage,
  writeLangStorage,
} from "@/lib/i18n/lang-storage";
import { en } from "@/locales/en";
import { hi } from "@/locales/hi";
import i18next from "i18next";
import * as React from "react";
import { initReactI18next, useTranslation } from "react-i18next";

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    debug: false,
    ns: Object.keys(en),
    defaultNS: "translation",
    fallbackNS: "translation",
    lng: "en",
    fallbackLng: "en",
    resources: {
      en,
      hi,
    },
    interpolation: {
      prefix: "{",
      suffix: "}",
      escapeValue: false,
    },
  });
}

export interface I18nProviderProps {
  readonly children: React.ReactNode;
  readonly lng?: string;
}

export function I18nProvider({
  children,
  lng = "en",
}: Readonly<I18nProviderProps>): React.JSX.Element {
  const { i18n } = useTranslation();

  React.useEffect(() => {
    const langParam = getLangFromSearch(globalThis.window.location.search);
    const storedLang = readLangStorage();
    const resolvedLanguage = normalizeLang(langParam ?? storedLang ?? lng);
    writeLangStorage(resolvedLanguage);
    void i18n.changeLanguage(resolvedLanguage);
  }, [i18n, lng]);

  return <React.Fragment>{children}</React.Fragment>;
}
