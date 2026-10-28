import { Gamepad2, Trophy, Users, Shield, Bell, Settings, FileText, BarChart3, Wallet, Calendar } from "lucide-react";
import { ROUTES } from "./routes";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Content",
    items: [
      {
        label: "Games",
        href: ROUTES.GAMES,
        icon: Gamepad2,
      },
      {
        label: "Tournaments",
        href: ROUTES.TOURNAMENTS,
        icon: Trophy,
      },
      {
        label: "Stages",
        href: ROUTES.STAGES,
        icon: Gamepad2,
      },
      {
        label: "Seasons",
        href: ROUTES.SEASONS,
        icon: Calendar,
      },
    ],
  },
  {
    label: "Users",
    items: [
      {
        label: "Users",
        href: ROUTES.USERS,
        icon: Users,
      },
      {
        label: "Flagged",
        href: ROUTES.FLAGGED,
        icon: Shield,
      },
      {
        label: "Wallets",
        href: ROUTES.WALLETS,
        icon: Wallet,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Analytics",
        href: ROUTES.ANALYTICS,
        icon: BarChart3,
      },
      {
        label: "Notifications",
        href: ROUTES.NOTIFICATIONS,
        icon: Bell,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Settings",
        href: ROUTES.SETTINGS,
        icon: Settings,
      },
      {
        label: "Audit Logs",
        href: ROUTES.AUDIT_LOGS,
        icon: FileText,
      },
    ],
  },
];
