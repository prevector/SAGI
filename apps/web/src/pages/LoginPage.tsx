import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { SagiLogo } from "../lib/SagiLogo";
import styles from "./LoginPage.module.css";

type AuthView = "login" | "register";

export default function LoginPage() {
  const { username, login, register, mode, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>("login");
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
      setError(view === "login" ? "Enter a username to sign in." : "Enter a username to create an account.");
      return;
    }
    if (!password.trim()) {
      setError(view === "login" ? "Enter a password to sign in." : "Enter a password to create an account.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (view === "login") {
        await login(value, password);
      } else {
        await register(value, password);
      }
      navigate("/app", { replace: true });
    } catch {
      setError(view === "login" ? "Could not sign in. Check username and password." : "Could not create account. That username may already exist.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <SagiLogo height={28} className={styles.eyebrow} />
        <div className={styles.switcher} role="tablist" aria-label="Authentication mode">
          <button
            className={view === "login" ? styles.switcherActive : styles.switcherButton}
            type="button"
            onClick={() => {
              setView("login");
              setError(null);
            }}
          >
            Sign in
          </button>
          <button
            className={view === "register" ? styles.switcherActive : styles.switcherButton}
            type="button"
            onClick={() => {
              setView("register");
              setError(null);
            }}
          >
            Create account
          </button>
        </div>
        <h1 className={styles.title}>{view === "login" ? "Enter the lab." : "Create an account."}</h1>
        <p className={styles.lede}>
          {view === "login"
            ? "Sign in with a username and password to continue."
            : "Create a simple local account with a username and password, then enter the lab."}
        </p>

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
            {submitting ? (view === "login" ? "Signing in…" : "Creating…") : view === "login" ? "Sign in" : "Create account"}
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
