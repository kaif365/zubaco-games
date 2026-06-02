// /app/layout.tsx
import { DevToolsDisabler } from "@/components/dev-tools-disabler";
import { MobileLandscapePortraitOverlay } from "@/components/organisms/mobile-landscape-portrait-overlay";
import { Toaster } from "@/components/organisms/sonner";
import { UserProvider } from "@/context/user-context";
import { LANG_COOKIE_NAME, normalizeLang } from "@/lib/i18n/lang-cookie";
import { I18nProvider } from "@/lib/i18n/provider";
import { getTranslation } from "@/lib/i18n/server";
import QueryProvider from "@/lib/query-provider";
import { SocketProvider } from "@/lib/socket-provider";
import type { Metadata } from "next";
import { Outfit, Orbitron } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
});

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = await getTranslation();
  return {
    title: t("meta.title"),
    description: t("meta.description"),
  };
};

export default async function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANG_COOKIE_NAME)?.value;
  const locale = cookieLang ? normalizeLang(cookieLang) : "en";

  return (
    <html
      lang={locale}
      className={`${outfit.variable} ${orbitron.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(){var t=localStorage.getItem('zubaco_theme')||'dark';if(t==='system')t=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t)}()`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-black text-slate-100 antialiased flex justify-center"
      >
        <I18nProvider lng={locale}>
          <QueryProvider>
            <Suspense fallback={null}>
              <UserProvider>
                <SocketProvider>
                  <div className="w-full min-h-[100dvh] relative overflow-hidden">
                    <DevToolsDisabler />
                    {children}
                    <MobileLandscapePortraitOverlay />
                    <Toaster
                      position="bottom-center"
                      expand={false}
                      richColors
                    />
                  </div>
                </SocketProvider>
              </UserProvider>
            </Suspense>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
