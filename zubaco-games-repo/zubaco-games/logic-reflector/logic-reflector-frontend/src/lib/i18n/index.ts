import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { type ReactNode, useEffect } from 'react';

import { en } from '@/locales/en';
import { hi } from '@/locales/hi';
import { getLangFromSearch, normalizeLang, readLangStorage, writeLangStorage } from './lang-storage';

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    resources: { en, hi },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      prefix: '{',
      suffix: '}',
      escapeValue: false,
    },
    returnNull: false,
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const langParam = getLangFromSearch(globalThis.location?.search ?? '');
    const storedLang = readLangStorage();
    const resolvedLang = normalizeLang(langParam ?? storedLang ?? 'en');
    writeLangStorage(resolvedLang);
    void i18n.changeLanguage(resolvedLang);
  }, [i18n]);

  return children as React.ReactElement;
}
