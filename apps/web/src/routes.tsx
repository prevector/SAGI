import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import LandingPage from "./marketing/LandingPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

const GeneLabPage = lazy(() => import("./pages/GeneLabPage"));
const LaunchBountyPage = lazy(() => import("./pages/LaunchBountyPage"));

// The public marketing site lives at "/"; the authenticated terminal workspace
// lives at "/app" (login at "/app/login").
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<GeneLabPage />} />
        <Route path="/app/launch-bounty" element={<LaunchBountyPage />} />
        <Route path="/app/genes" element={<Navigate to="/app" replace />} />
        <Route path="/app/*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
