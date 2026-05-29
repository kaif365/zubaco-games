"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/utils/cn";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebarCollapsed") === "true";
  });
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    window.localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const effectiveCollapsed = isDesktop ? sidebarCollapsed : !sidebarOpen;

  return (
    <div className="h-screen bg-background text-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={effectiveCollapsed}
        onToggleCollapsed={() => {
          if (isDesktop) setSidebarCollapsed((v) => !v);
          else setSidebarOpen((v) => !v);
        }}
      />

      <div
        className={cn(
          "h-screen overflow-y-auto overflow-x-hidden custom-scrollbar",
          // Keep sidebar visible on small screens (collapsed by default)
          sidebarOpen ? "pl-60" : "pl-16",
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-60",
        )}
      >
        <Topbar
          onMenuClick={() => setSidebarOpen((v) => !v)}
          sidebarCollapsed={effectiveCollapsed}
        />
        <main className="min-h-screen px-4 pt-16 pb-4 lg:px-6 bg-card">
          {children}
        </main>
      </div>
    </div>
  );
}
