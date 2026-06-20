import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { config } from "./lib/config";
import LandingPage from "./marketing/LandingPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

// Authenticated pages are code-split so the initial bundle stays small
// and recharts only loads with the pages that use it.
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
const GeneLabPage = lazy(() => import("./pages/GeneLabPage"));

// The public marketing site lives at "/"; the authenticated terminal workspace
// lives at "/app" (login at "/app/login").
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<GeneLabPage />} />
        <Route path="/app/genes" element={<Navigate to="/app" replace />} />
        <Route path="/app" element={<AppShell />}>
          <Route path="profile" element={<ProfilePage />} />
          <Route path="tokens" element={<TokensPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="bounties" element={<BountiesPage />} />
          <Route path="bounties/:id" element={<BountyDetailPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="network" element={<NetworkPage />} />
          {config.features.ledgerExplorer ? <Route path="ledger" element={<LedgerPage />} /> : null}
          <Route path="session" element={<SessionPage />} />
          <Route path="sandbox" element={<SandboxPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
