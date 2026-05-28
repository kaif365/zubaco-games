import { useDemoStore } from "@/store/demo";
import { APP_COLOR } from "@/theme/color";
import { isDemoTutorialActive } from "@/utils/maze/demo-tutorial";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

interface DemoTutorialScrimProps {
  readonly show: boolean;
  readonly className?: string;
}

export function DemoTutorialScrim({ show, className }: DemoTutorialScrimProps) {
  if (!show) {
    return null;
  }

  const scrimStyle: CSSProperties = { background: APP_COLOR.overlay };

  return (
    <div
      className={`pointer-events-none ${className ?? ""}`}
      style={scrimStyle}
      aria-hidden
    />
  );
}

export function DemoTutorialTapLayer() {
  const { t } = useTranslation();
  const demoTutorialStep = useDemoStore((s) => s.demoTutorialStep);
  const advanceDemoTutorial = useDemoStore((s) => s.advanceDemoTutorial);

  if (!isDemoTutorialActive(demoTutorialStep)) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[30]">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer border-0 bg-transparent p-0"
        aria-label={t("tutorial.tapToContinue")}
        onClick={() => advanceDemoTutorial()}
      />
      <p
        className="pointer-events-none absolute bottom-6 left-1/2 z-[1] -translate-x-1/2 rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] motion-reduce:animate-none animate-pulse"
        style={{
          color: APP_COLOR.infoBright,
          background: APP_COLOR.panelSoft,
          border: `1px solid ${APP_COLOR.infoSoft40}`,
          boxShadow: `0 0 18px ${APP_COLOR.infoGlow}`,
        }}
      >
        {t("tutorial.tapToContinue")}
      </p>
    </div>
  );
}
