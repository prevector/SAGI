import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { config } from "./lib/config";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

// Authenticated pages are code-split so the initial (login) bundle stays small
// and recharts only loads with the pages that use it.
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const TokensPage = lazy(() => import("./pages/TokensPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const BountiesPage = lazy(() => import("./pages/BountiesPage"));
const BountyDetailPage = lazy(() => import("./pages/BountyDetailPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const NetworkPage = lazy(() => import("./pages/NetworkPage"));
const SessionPage = lazy(() => import("./pages/SessionPage"));
const SandboxPage = lazy(() => import("./pages/SandboxPage"));
const LedgerPage = lazy(() => import("./pages/LedgerPage"));

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/tokens" element={<TokensPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/bounties" element={<BountiesPage />} />
          <Route path="/bounties/:id" element={<BountyDetailPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/network" element={<NetworkPage />} />
          {config.features.ledgerExplorer ? <Route path="/ledger" element={<LedgerPage />} /> : null}
          <Route path="/session" element={<SessionPage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
