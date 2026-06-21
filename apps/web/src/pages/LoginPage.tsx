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
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && username) {
    return <Navigate to="/app" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) {
      setError("Enter a username to continue.");
      return;
    }
    if (!password.trim()) {
      setError("Enter a password to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(value, password);
      navigate("/app", { replace: true });
    } catch {
      setError("Could not sign in. Check username and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{config.brand.name}</p>
        <h1 className={styles.title}>Enter the lab.</h1>
        <p className={styles.lede}>Sign in with a username and password to continue into the live search for general intelligence.</p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.label}>
            Username
            <input
              className={styles.input}
              type="text"
              name="username"
              autoComplete="username"
              placeholder="tim"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? (
            <p className={styles.error} role="alert">
              <AlertCircle size={16} aria-hidden /> {error}
            </p>
          ) : null}

          <button className={styles.button} type="submit" disabled={submitting}>
            {submitting ? "Entering…" : "Enter SAGI"}
          </button>
        </form>

        <p className={styles.mode}>mode: {mode}</p>
        {mode === "development" ? (
          <p className={styles.mode}>dev users: `tim / tim`, `demo / demo`</p>
        ) : null}
      </section>
    </main>
  );
}
