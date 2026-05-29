export const LANG_STORAGE_KEY = "ag_lang";
export const DEFAULT_LANG = "en" as const;
export const SUPPORTED_LANGS = ["en", "hi"] as const;
export type AppLang = (typeof SUPPORTED_LANGS)[number];

const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGS);

export function isSupportedLang(
  value: string | null | undefined,
): value is AppLang {
  return typeof value === "string" && SUPPORTED_LANG_SET.has(value);
}

export function normalizeLang(value: string | null | undefined): AppLang {
  return isSupportedLang(value) ? value : DEFAULT_LANG;
}

export function getLangFromSearch(search: string): AppLang | null {
  const value = new URLSearchParams(search).get("lang");
  return isSupportedLang(value) ? value : null;
}

export function readLangStorage(): AppLang | null {
  try {
    const value = localStorage.getItem(LANG_STORAGE_KEY);
    return isSupportedLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLangStorage(lang: AppLang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore write failures (e.g. private browsing quota)
  }
}
