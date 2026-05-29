export const LANG_COOKIE_NAME = 'bf_lang';
export const DEFAULT_LANG = 'en';
export const SUPPORTED_LANGS = ['en', 'hi'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

export const isSupportedLang = (value: string): value is AppLang =>
  (SUPPORTED_LANGS as readonly string[]).includes(value);

export const normalizeLang = (raw: string): AppLang =>
  isSupportedLang(raw) ? raw : DEFAULT_LANG;

export const getLangFromSearch = (search: string): AppLang | null => {
  const param = new URLSearchParams(search).get('lang');
  return param && isSupportedLang(param) ? param : null;
};

export const readLangCookie = (): AppLang | null => {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${LANG_COOKIE_NAME}=`));
  if (!match) return null;
  const value = match.split('=')[1];
  return value && isSupportedLang(value) ? value : null;
};

export const writeLangCookie = (lang: AppLang): void => {
  document.cookie = `${LANG_COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
};
