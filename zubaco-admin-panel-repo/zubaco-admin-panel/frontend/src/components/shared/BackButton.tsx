"use client";

import { useRouter, usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";


interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps): React.ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Only show if we are deep in the navigation (not on a sidebar root)
  const isVisible = segments.length > 1;

  const handleBack = () => {
    if (segments.length <= 1) return;

    // Navigate according to the breadcrumb flow (one level up)
    // If the parent is the intermediate "game" segment, go up two levels
    let parentSegments = segments.slice(0, -1);
    if (
      parentSegments.length > 0 &&
      parentSegments[parentSegments.length - 1].toLowerCase() === "game"
    ) {
      parentSegments = parentSegments.slice(0, -1);
    }

    const parentPath = `/${parentSegments.join("/")}`;
    router.push(parentPath);
  };

  return (
    <div
      className={cn(
        "flex items-center transition-all duration-300 ease-in-out overflow-hidden shrink-0",
        isVisible ? "opacity-100" : "w-0 opacity-0 pointer-events-none",
      )}
    >
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "px-[10px] rounded-md border border-slate-200 bg-white text-muted-foreground hover:text-foreground hover:bg-slate-50 transition-all duration-200 shadow-none ring-0",
          className,
        )}
        onClick={handleBack}
      >
        <ArrowLeft className="h-3 w-3" />
        {/* <span className="sr-only">Back</span> */}
      </Button>
    </div>
  );
}
