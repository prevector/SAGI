import {
  Boxes,
  Coins,
  LayoutDashboard,
  Radio,
  Target,
  TrendingUp,
  Trophy,
  User,
  Zap,
  type LucideIcon
} from "lucide-react";
import { config } from "../../lib/config";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/tokens", label: "Tokens", icon: Coins },
  { to: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/app/bounties", label: "Bounties", icon: Target },
  { to: "/app/progress", label: "Progress", icon: TrendingUp },
  { to: "/app/network", label: "Network", icon: Radio },
  ...(config.features.ledgerExplorer ? [{ to: "/app/ledger", label: "Ledger", icon: Boxes }] : []),
  { to: "/app/session", label: "Session", icon: Zap }
];
