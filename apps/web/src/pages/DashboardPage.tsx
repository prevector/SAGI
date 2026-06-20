import { useAuth } from "../auth/AuthContext";
import { config } from "../lib/config";

// Phase 0 placeholder. Replaced by the AppShell + 8-widget grid in Phase 3.
export default function DashboardPage() {
  const { username, logout } = useAuth();

  return (
    <main style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "var(--s7) var(--s5)" }}>
      <p
        className="mono"
        style={{
          color: "var(--accent)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: "var(--fs-mono)"
        }}
      >
        {config.brand.name} dashboard
      </p>
      <h1 style={{ fontSize: "var(--fs-display)", margin: "var(--s3) 0 var(--s2)" }}>
        Welcome, <span className="mono">{username}</span>.
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "var(--s6)" }}>
        Scaffold is live. Widgets land in the next phases.
      </p>
      <button
        type="button"
        onClick={() => void logout()}
        style={{
          border: "1px solid var(--border-strong)",
          background: "transparent",
          color: "var(--text)",
          borderRadius: "var(--radius-pill)",
          padding: "var(--s3) var(--s5)",
          cursor: "pointer"
        }}
      >
        Log out
      </button>
    </main>
  );
}
