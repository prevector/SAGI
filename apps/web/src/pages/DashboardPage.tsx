import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/ui";

// Phase 0/1 placeholder. Replaced by the 8-widget grid in Phase 3.
export default function DashboardPage() {
  const { username } = useAuth();

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome, ${username}.`}
        subtitle="Scaffold and design system are live. Widgets land in the next phases."
      />
      <p style={{ color: "var(--text-muted)" }}>
        Preview the design system at <Link to="/sandbox">/sandbox</Link>.
      </p>
    </div>
  );
}
