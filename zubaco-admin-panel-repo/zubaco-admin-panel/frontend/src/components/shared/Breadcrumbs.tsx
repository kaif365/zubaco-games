"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BREADCRUMB_LABELS } from "@/config/routes";

interface BreadcrumbItem {
  label: string;
  href: string;
  isLast: boolean;
}

/**
 * Dynamic Breadcrumb component that auto-generates navigation flow based on current route.
 * Labels are strictly derived from route constants (BREADCRUMB_LABELS).
 */
export function Breadcrumbs(): React.ReactNode {
  const pathname = usePathname();

  // Split path and remove empty segments
  const segments = pathname.split("/").filter(Boolean);

  const getLabel = (segment: string, index: number): string => {
    // 1. Handle dynamic detail pages based on parent segment context
    if (index > 0) {
      const parentSegment = segments[index - 1].toLowerCase();
      const detailKey =
        `${parentSegment.replace(/s$/, "")}_detail` as keyof typeof BREADCRUMB_LABELS;

      // Specifically check for known detail pages requested by user
      if (
        parentSegment === "tournaments" ||
        parentSegment === "stages" ||
        parentSegment === "games" ||
        parentSegment === "game" ||
        parentSegment === "users"
      ) {
        const label = BREADCRUMB_LABELS[detailKey];
        if (label) return label;
      }
    }

    // 2. Try to find match in BREADCRUMB_LABELS constant
    const label =
      BREADCRUMB_LABELS[
        segment.toLowerCase() as keyof typeof BREADCRUMB_LABELS
      ];
    if (label) return label;

    // 3. Fallback for other segments (capitalize and remove dashes)
    return (
      segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
    );
  };

  const breadcrumbs: BreadcrumbItem[] = segments
    .map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const isLast = index === segments.length - 1;

      return {
        label: getLabel(segment, index),
        href,
        isLast,
      };
    })
    .filter((item) => item.label.toLowerCase() !== "game");

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-[13px]">
      <ol className="flex items-center">
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center">
            {index > 0 && (
              <span className="mx-2.5 text-muted-foreground/30 select-none font-normal">
                /
              </span>
            )}
            {item.isLast ? (
              <span className="relative text-foreground font-semibold py-1">
                {item.label}
                <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-primary" />
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap leading-none"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
