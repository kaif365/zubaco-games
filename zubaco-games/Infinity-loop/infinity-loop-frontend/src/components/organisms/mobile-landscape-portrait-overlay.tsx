"use client";

import { useTiltDetection } from "@/hooks/use-tilt-detection";
import { Smartphone } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

const PHONE_TILT_MANDALA_OVERLAY_SRC = "/assets/overlays/end_overlay.svg";

export const MobileLandscapePortraitOverlay = () => {
  const { t } = useTranslation();
  const active = useTiltDetection();
  const reactId = useId();
  const titleId = `mobile-portrait-title-${reactId}`;
  const descId = `mobile-portrait-desc-${reactId}`;
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mql = globalThis.window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const sync = () => setPrefersReducedMotion(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  if (!active) return null;

  return (
    <dialog
      open
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="pointer-events-auto fixed inset-0 z-10000 m-0 flex h-dvh max-h-none w-dvw max-w-none flex-col items-center justify-center overflow-hidden border-0 bg-transparent px-6 py-0 text-center backdrop:bg-transparent open:flex"
      style={{
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
      }}
    >
      <div className="absolute inset-0 bg-[#24140f]" />
      <Image
        src={PHONE_TILT_MANDALA_OVERLAY_SRC}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="pointer-events-none object-cover opacity-35"
        unoptimized
      />

      <div className="relative z-10 flex max-w-md flex-col items-center gap-2.5">
        <div
          aria-hidden="true"
          className="flex h-[min(26vh,132px)] w-[min(42vw,132px)] items-center justify-center"
        >
          <Smartphone
            className={`text-slate-100 drop-shadow-[0_0_16px_rgba(255,255,255,0.28)] ${prefersReducedMotion ? "" : "animate-device-wiggle"}`}
            size={74}
            strokeWidth={1.7}
          />
        </div>

        <div className="flex flex-col gap-2">
          <h2
            id={titleId}
            className="font-display text-lg font-semibold tracking-tight text-slate-50 sm:text-xl"
          >
            {t("game.portraitOnlyTitle")}
          </h2>
          <p id={descId} className="text-sm leading-relaxed text-slate-300/95">
            {t("game.portraitOnlyDescription")}
          </p>
        </div>
      </div>
    </dialog>
  );
};
