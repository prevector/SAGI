import {
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

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/tokens", label: "Tokens", icon: Coins },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/bounties", label: "Bounties", icon: Target },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/network", label: "Network", icon: Radio },
  { to: "/session", label: "Session", icon: Zap }
];
