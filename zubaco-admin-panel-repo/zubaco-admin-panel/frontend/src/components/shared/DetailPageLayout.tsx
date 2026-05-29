"use client";

import { cn } from "@/utils/cn";

interface Tab {
  id: string;
  label: string;
}

interface DetailPageLayoutProps {
  backHref?: string;
  backLabel?: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export function DetailPageLayout({
  // backHref,
  // backLabel,
  title,
  subtitle,
  badge,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
}: DetailPageLayoutProps) {
  return (
    <div className="space-y-6">
      {/* <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </Link> */}

      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm text-white/50">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="border-b border-white/8">
          <div className="flex flex-wrap items-center gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative -mb-px px-1 pb-1 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-primary"
                    : "text-white/55 hover:text-white",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] rounded-full transition-opacity",
                    activeTab === tab.id
                      ? "bg-primary opacity-100"
                      : "bg-transparent opacity-0",
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
