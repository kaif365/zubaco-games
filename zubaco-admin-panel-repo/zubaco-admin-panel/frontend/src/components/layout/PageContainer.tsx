"use client";

import { cn } from "@/utils/cn";
import { BackButton, Breadcrumbs } from "@/components/shared";
import { usePathname } from "next/navigation";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  showNavigation?: boolean;
}

export function PageContainer({
  children,
  className,
  showNavigation = true,
}: PageContainerProps) {
  const pathname = usePathname();
  const isInnerPage = pathname.split("/").filter(Boolean).length > 1;

  return (
    <div
      className={cn(
        "px-0 space-y-3 lg:space-y-5 animate-in fade-in slide-in-from-top-1 duration-500",
        className,
      )}
    >
      {showNavigation && isInnerPage && (
        <div className="flex items-center gap-2.5 min-h-[32px]">
          <BackButton />
          <Breadcrumbs />
        </div>
      )}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
