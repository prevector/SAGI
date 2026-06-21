import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import LandingPage from "./marketing/LandingPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";

// Public SDK docs — code-split so they never weigh on the marketing bundle.
const DocsPage = lazy(() => import("./marketing/DocsPage"));

const GeneLabPage = lazy(() => import("./pages/GeneLabPage"));

// The public marketing site lives at "/"; the authenticated terminal workspace
// lives at "/app" (login at "/app/login").
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/docs" element={<Suspense fallback={null}><DocsPage /></Suspense>} />
      <Route path="/app/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<GeneLabPage />} />
        <Route path="/app/genes" element={<Navigate to="/app" replace />} />
        <Route path="/app/*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
