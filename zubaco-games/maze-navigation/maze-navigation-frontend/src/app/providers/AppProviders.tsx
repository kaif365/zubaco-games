import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { MazeAppShell } from "@/components/layout/maze-app-shell";
import { MazeToaster } from "@/components/maze-toaster";
import { useStageBootstrap } from "@/hooks/use-stage-bootstrap";
import { useDevAuth } from "@/hooks/use-dev-auth";
import { I18nProvider } from "@/lib/i18n/i18n-provider";
import { APP_COLOR } from "@/theme/color";

interface AppProvidersProps {
  readonly children: ReactNode;
}

const bodyStyle: CSSProperties = {
  background: APP_COLOR.background,
  color: APP_COLOR.white,
  "--app-background": APP_COLOR.background,
  "--app-foreground": APP_COLOR.accent,
} as CSSProperties;

function AppProvidersInner({ children }: AppProvidersProps) {
  const { isReady, error } = useDevAuth();
  const { t } = useTranslation();
  useStageBootstrap(isReady);

  if (error) {
    return (
      <div
        className="flex min-h-dvh w-full flex-col items-center justify-center gap-3"
        style={{ background: APP_COLOR.background }}
      >
        <p className="text-sm font-medium text-red-400">{t("auth.failed")}</p>
        <p className="max-w-xs text-center text-xs text-zinc-500">{error}</p>
      </div>
    );
  }

  return (
    <MazeAppShell>
      {children}
      <MazeToaster />
    </MazeAppShell>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <I18nProvider>
      <div
        className="antialiased min-h-dvh w-full select-none"
        style={bodyStyle}
      >
        <AppProvidersInner>{children}</AppProvidersInner>
      </div>
    </I18nProvider>
  );
}
