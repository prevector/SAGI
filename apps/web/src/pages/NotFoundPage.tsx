import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main style={{ display: "grid", placeContent: "center", minHeight: "100vh", textAlign: "center", gap: "var(--s4)" }}>
      <p className="mono" style={{ color: "var(--accent)", fontSize: "var(--fs-mono)" }}>
        404
      </p>
      <h1 style={{ fontSize: "var(--fs-h1)" }}>This page is off the map.</h1>
      <Link to="/app">Back to the dashboard</Link>
    </main>
  );
}
