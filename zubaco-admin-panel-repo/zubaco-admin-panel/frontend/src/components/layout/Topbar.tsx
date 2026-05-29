"use client";

import { Bell, LogOut, Search, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/AuthProvider";
import { ROUTES } from "@/config/routes";
import { useState } from "react";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { cn } from "@/utils/cn";

interface TopbarProps {
  onMenuClick: () => void;
  sidebarCollapsed?: boolean;
}

export function Topbar({ onMenuClick: _onMenuClick, sidebarCollapsed }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      router.replace(ROUTES.LOGIN);
    }
  };

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4 lg:px-6",
        sidebarCollapsed ? "left-16" : "left-60",
      )}
    >
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search..." className="h-8 w-full bg-background pl-8 text-xs" />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        </Button>

        <Button variant="ghost" size="icon" className="hidden h-8 w-8 sm:flex">
          <Settings className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                  {user?.name?.slice(0, 2).toUpperCase() ?? "SA"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-xs font-medium sm:inline-block">
                {user?.name ?? "Admin"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.name ?? "Admin User"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile Settings</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:bg-destructive/8 focus:text-destructive"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        description="Are you sure you want to sign out of the admin panel?"
        confirmLabel="Sign Out"
        variant="destructive"
        isLoading={isLoggingOut}
      />
    </header>
  );
}
