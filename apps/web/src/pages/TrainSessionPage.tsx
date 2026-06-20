import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/ui";
import { api } from "../lib/api";
import { config } from "../lib/config";
import type { Session } from "../lib/types";
import { VisualErrorBoundary } from "../features/session/visual/ErrorBoundary";
import styles from "./TrainSessionPage.module.css";

// Canvas-2D, but still code-split so it (and its sim) only load on this route.
const GenomeField = lazy(() => import("../features/session/train-visual"));

/**
 * /app/session/train — the compute/train session visual: genome strings
 * evolving. Distinct from the inference/learning maze on /app/session. Binds to
 * the latest session (running → most recent) just like the maze hero.
 */
export default function TrainSessionPage() {
  const { username } = useAuth();
  const userId = username ?? "";
  const [sessions, setSessions] = useState<Session[]>([]);

  const refresh = useCallback(async () => {
    setSessions(await api.getSessions(userId));
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while a session runs so progress (and the evolution pacing) advances.
  const hasRunning = sessions.some((s) => s.status === "running");
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => void refresh(), 800);
    return () => clearInterval(id);
  }, [hasRunning, refresh]);

  const heroSession = sessions.find((s) => s.status === "running") ?? sessions[0];
  const showVisual = config.features.sessionTrainVisual;

  return (
    <div>
      <div className={styles.backRow}>
        <Link to="/app/session" className={styles.back}>
          <ArrowLeft size={14} /> Back to session
        </Link>
      </div>
      <PageHeader
        eyebrow="Train the population"
        title="Genomes evolving"
        subtitle="Your compute mutates a population of candidate genomes; fitter strings highlight and propagate, generation over generation."
      />

      {showVisual ? (
        <div className={styles.hero}>
          <VisualErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              {heroSession ? (
                <GenomeField seed={heroSession.id} status={heroSession.status} progress={heroSession.progress} />
              ) : (
                <div className={styles.empty}>Start a session to watch the population evolve.</div>
              )}
            </Suspense>
          </VisualErrorBoundary>
        </div>
      ) : null}
    </div>
  );
}
