import i18next from 'i18next';
import { useEffect, type ReactNode } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';

import { en } from '@/locales/en';
import { hi } from '@/locales/hi';

import { getLangFromSearch, normalizeLang, readLangCookie, writeLangCookie } from './lang-cookie';

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    debug: false,
    ns: Object.keys(en),
    defaultNS: 'translation',
    fallbackNS: 'translation',
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi'],
    resources: { en, hi },
    interpolation: {
      prefix: '{',
      suffix: '}',
      escapeValue: false,
    },
  });
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const langParam = getLangFromSearch(window.location.search);
    const cookieLang = readLangCookie();
    const resolvedLang = normalizeLang(langParam ?? cookieLang ?? 'en');
    writeLangCookie(resolvedLang);
    void i18n.changeLanguage(resolvedLang);
  }, [i18n]);

  return children as React.ReactElement;
}
