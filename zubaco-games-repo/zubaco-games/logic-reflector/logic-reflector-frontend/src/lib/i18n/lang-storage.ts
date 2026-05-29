const LANG_KEY = 'lr_lang';

const SUPPORTED_LANGS = ['en', 'hi'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const normalizeLang = (raw: string | null | undefined): SupportedLang => {
  const lower = raw?.toLowerCase().slice(0, 2) ?? '';
  return (SUPPORTED_LANGS as readonly string[]).includes(lower)
    ? (lower as SupportedLang)
    : 'en';
};

export const getLangFromSearch = (search: string): string | null => {
  try {
    return new URLSearchParams(search).get('lang');
  } catch {
    return null;
  }
};

export const readLangStorage = (): string | null => {
  try {
    return globalThis.localStorage?.getItem(LANG_KEY) ?? null;
  } catch {
    return null;
  }
};

export const writeLangStorage = (lang: string): void => {
  try {
    globalThis.localStorage?.setItem(LANG_KEY, lang);
  } catch {
    // ignore storage errors (e.g. private browsing quota)
  }
};
