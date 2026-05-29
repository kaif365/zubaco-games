export const LANG_COOKIE_NAME = 'sr_lang';
export const DEFAULT_LANG = 'en' as const;
export const SUPPORTED_LANGS = ['en', 'hi'] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGS);

export function isSupportedLang(value: string | null | undefined): value is AppLang {
  return typeof value === 'string' && SUPPORTED_LANG_SET.has(value);
}

export function normalizeLang(value: string | null | undefined): AppLang {
  return isSupportedLang(value) ? value : DEFAULT_LANG;
}

export function getLangFromSearch(search: string): AppLang | null {
  const value = new URLSearchParams(search).get('lang');
  return isSupportedLang(value) ? value : null;
}

export function readLangCookie(): AppLang | null {
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${LANG_COOKIE_NAME}=`));
    const value = match?.split('=')[1] ?? null;
    return isSupportedLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLangCookie(lang: AppLang): void {
  try {
    document.cookie = `${LANG_COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // ignore
  }
}
