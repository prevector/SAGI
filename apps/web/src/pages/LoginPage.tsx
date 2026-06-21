import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { SagiLogo } from "../components/ui/SagiLogo";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
  const { username, login, mode, loading } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated (incl. dev auto-auth) → straight to the terminal.
  if (!loading && username) {
    return <Navigate to="/app" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) {
      setError("Enter a name to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(value);
      navigate("/app", { replace: true });
    } catch {
      setError("Could not sign in. Enter a name and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.shell}>
      <section className={styles.card}>
        <SagiLogo height={32} className={styles.eyebrow} />
        <h1 className={styles.title}>Enter the lab.</h1>
        <p className={styles.lede}>Choose a name and continue into the live search for general intelligence.</p>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.label}>
            Your name
            <input
              className={styles.input}
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Ada"
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
            {submitting ? "Entering…" : "Enter SAGI"}
          </button>
        </form>

        <p className={styles.mode}>mode: {mode}</p>
      </section>
    </main>
  );
}
