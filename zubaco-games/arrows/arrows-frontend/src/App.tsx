import { disableDevTools } from "@/utils/security";
import { AppProviders } from "@app/providers/AppProviders";
import { AppRouter } from "@app/router/AppRouter";
import { I18nProvider } from "@/lib/i18n/provider";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function CompactLandscapeNotice() {
  const { t } = useTranslation();

  return (
    <div className="w-full h-[100vh] overflow-hidden flex flex-col items-center justify-center px-4 text-center backdrop-blur bg-[#1c1b20]">
      <div
        className="pointer-events-none absolute inset-0 scale-150 bg-contain bg-center bg-no-repeat opacity-20 h-full md:h-[80vh] top-1/2 -translate-y-1/2"
        style={{ backgroundImage: `url('../../public/assets/mandala-vector.png')` }}
      />
      <div className="phone" />
      <div className="message">
        <p className="text-lg tracking-[0.14em] gradient-text uppercase font-bold">
          {t("app.tiltDetected")}
        </p>
        <p className="max-w-[340px] mx-auto text-center text-[14px] tracking-[0.13em] text-white/80">
          {t("app.switchToPortrait")}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);
  useEffect(() => {
    const cleanupDevTools = disableDevTools();

    return () => {
      cleanupDevTools();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape) and (max-height: 610px)');
    /**
     * Handles change.
     *
     * @param {MediaQueryListEvent} event - The event.
     *
     * @returns {void} No return value.
     */
    const handleChange = (event: MediaQueryListEvent) => {
      setIsCompactLandscape(event.matches);
    };

    setIsCompactLandscape(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);


  return (
    <I18nProvider>
    <AppProviders>
      {isCompactLandscape ? (
        <CompactLandscapeNotice />
      ) :
        <AppRouter />}
    </AppProviders>
    </I18nProvider>
  );
}
