import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute() {
  const { username, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "grid", placeContent: "center", minHeight: "100vh" }}>
        <p className="mono" style={{ color: "var(--text-muted)" }}>
          Checking session…
        </p>
      </div>
    );
  }

  return username ? <Outlet /> : <Navigate to="/app/login" replace />;
}
