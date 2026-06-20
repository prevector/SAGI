import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import BountiesPage from "./pages/BountiesPage";
import BountyDetailPage from "./pages/BountyDetailPage";
import DashboardPage from "./pages/DashboardPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LoginPage from "./pages/LoginPage";
import NetworkPage from "./pages/NetworkPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProfilePage from "./pages/ProfilePage";
import ProgressPage from "./pages/ProgressPage";
import SandboxPage from "./pages/SandboxPage";
import SessionPage from "./pages/SessionPage";
import TokensPage from "./pages/TokensPage";

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
          <Route path="/session" element={<SessionPage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
