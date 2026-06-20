import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { config } from "../lib/config";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const { username, login, mode, loading } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated (incl. dev auto-auth) → straight to the dashboard.
  if (!loading && username) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) {
      setError("Pick a username to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(value);
      navigate("/", { replace: true });
    } catch {
      setError("Could not sign in. Pick a username and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{config.brand.name} access</p>
        <h1 className={styles.title}>Enter the network.</h1>
        <p className={styles.lede}>{config.brand.tagline}.</p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.label}>
            Username
            <input
              className={styles.input}
              type="text"
              name="username"
              autoComplete="username"
              placeholder="e.g. ada"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          </label>

          {error ? (
            <p className={styles.error} role="alert">
              <AlertCircle size={16} aria-hidden /> {error}
            </p>
          ) : null}

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Entering…" : "Enter network"}
          </button>
        </form>

        <p className={styles.mode}>mode: {mode}</p>
      </section>
    </main>
  );
}
