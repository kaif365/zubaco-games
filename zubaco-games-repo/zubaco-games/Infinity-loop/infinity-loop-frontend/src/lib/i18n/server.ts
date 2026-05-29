import {
  DEFAULT_LANG,
  LANG_COOKIE_NAME,
  normalizeLang,
} from "@/lib/i18n/lang-cookie";
import { en } from "@/locales/en";
import { hi } from "@/locales/hi";
import { createInstance, type i18n } from "i18next";

async function initI18next(locale: string): Promise<i18n> {
  const i18nInstance = createInstance();

  await i18nInstance.init({
    debug: false,
    ns: Object.keys(en),
    defaultNS: "translation",
    fallbackNS: "translation",
    lng: normalizeLang(locale),
    fallbackLng: DEFAULT_LANG,
    supportedLngs: ["en", "hi"],
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

  return i18nInstance;
}

export async function getTranslation(): Promise<{ t: i18n["t"]; i18n: i18n }> {
  let locale: string = DEFAULT_LANG;
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    locale = cookieStore.get(LANG_COOKIE_NAME)?.value ?? DEFAULT_LANG;
  } catch {
    locale = DEFAULT_LANG;
  }
  const i18nextInstance = await initI18next(locale);

  return {
    t: i18nextInstance.t,
    i18n: i18nextInstance,
  };
}
