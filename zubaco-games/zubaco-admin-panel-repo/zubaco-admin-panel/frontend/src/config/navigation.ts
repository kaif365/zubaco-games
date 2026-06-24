import { Gamepad2, Trophy } from "lucide-react";
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
    ],
  },
];
