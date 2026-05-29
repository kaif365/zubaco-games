"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
  AlertCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ closeButton = true, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const { t } = useTranslation();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton={closeButton}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <AlertCircle className="w-5 h-5 text-red-300" strokeWidth={2.5} />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        close: <XIcon className="size-3.5" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      toastOptions={{
        closeButtonAriaLabel: t("common.closeToast"),
        classNames: {
          toast: "group relative flex !max-w-[520px] !mx-auto gap-4 rounded-2xl p-4 backdrop-blur-md shadow-2xl font-sans border items-center [&>[data-icon]]:shrink-0 [&>[data-icon]]:flex [&>[data-icon]]:items-center [&>[data-icon]]:justify-center [&>[data-icon]]:w-10 [&>[data-icon]]:h-10 [&>[data-icon]]:rounded-full [&>[data-icon]]:!m-0 [&>[data-icon]]:!mr-2",
          error: "!bg-red-950/40 !border-red-500/40 !text-red-100 [&>[data-icon]]:!bg-red-500/20",
          success: "!bg-emerald-950/40 !border-emerald-500/40 !text-emerald-100 [&>[data-icon]]:!bg-emerald-500/20",
          warning: "!bg-amber-950/40 !border-amber-500/40 !text-amber-100 [&>[data-icon]]:!bg-amber-500/20",
          info: "!bg-blue-950/40 !border-blue-500/40 !text-blue-100 [&>[data-icon]]:!bg-blue-500/20",
          content: "flex-1 flex flex-col justify-center min-w-0 py-0.5",
          title: "text-base font-semibold tracking-tight text-left",
          description: "text-sm mt-1 font-medium opacity-90 leading-snug text-left",
          closeButton:
            "!absolute !top-4 !right-4 !left-auto !translate-x-0 !translate-y-0 !p-1 !rounded-lg !opacity-70 hover:!opacity-100 hover:!bg-black/10 !transition-all !text-current !bg-transparent !border-none",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
