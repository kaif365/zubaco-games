import i18next from 'i18next';
import { type ReactNode, useEffect } from 'react';
import { initReactI18next, useTranslation } from 'react-i18next';
import { en } from '@/locales/en';
import { hi } from '@/locales/hi';
import {
  getLangFromSearch,
  normalizeLang,
  readLangCookie,
  writeLangCookie,
} from './lang-cookie';

if (!i18next.isInitialized) {
  void i18next.use(initReactI18next).init({
    debug: false,
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'translation',
    resources: {
      en,
      hi,
    },
    interpolation: {
      prefix: '{',
      suffix: '}',
      escapeValue: false,
    },
  });
}

interface I18nProviderProps {
  children: ReactNode;
  lng?: string;
}

export function I18nProvider({ children, lng = 'en' }: I18nProviderProps) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const langParam = getLangFromSearch(window.location.search);
    const cookieLang = readLangCookie();
    const resolvedLanguage = normalizeLang(langParam ?? cookieLang ?? lng);
    writeLangCookie(resolvedLanguage);
    void i18n.changeLanguage(resolvedLanguage);
  }, [i18n, lng]);

  return children;
}
