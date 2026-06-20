import { Suspense, lazy, useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button, Card, PageHeader, ProgressBar, Tag } from "../components/ui";
import { api } from "../lib/api";
import { config } from "../lib/config";
import { formatDate, formatInt, formatTokens } from "../lib/format";
import type { Bounty, Session } from "../lib/types";
import { SessionStatusChip } from "../features/common/status";
import { VisualErrorBoundary } from "../features/session/visual/ErrorBoundary";
import styles from "./SessionPage.module.css";

// The 3D visual (three.js) is code-split: this import only pulls the heavy
// bundle when the feature flag is on and the page is opened.
const SessionVisual = lazy(() => import("../features/session/visual"));

export default function SessionPage() {
  const { username } = useAuth();
  const userId = username ?? "";
  const [params] = useSearchParams();

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [allBounties, setAllBounties] = useState<Bounty[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const [bountyId, setBountyId] = useState<string>(params.get("bounty") ?? "");
  const [compute, setCompute] = useState(400);
  const [duration, setDuration] = useState(30);
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    const list = await api.getSessions(userId);
    setSessions(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void api.getBounties().then((b) => {
      setAllBounties(b);
      setBounties(b.filter((x) => x.status !== "closed"));
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Poll while a session is running so the progress bar advances live.
  const hasRunning = sessions.some((s) => s.status === "running");
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => void refresh(), 800);
    return () => clearInterval(id);
  }, [hasRunning, refresh]);

  async function start(event: FormEvent) {
    event.preventDefault();
    setStarting(true);
    try {
      await api.startSession(userId, {
        bountyId: bountyId || undefined,
        computeAllocated: compute,
        durationMin: duration
      });
      await refresh();
    } finally {
      setStarting(false);
    }
  }

  const bountyTitle = (id?: string) => allBounties.find((b) => b.id === id)?.title ?? id;

  // Hero visual binds to the latest session: the running one if any, else the
  // most recent (sessions are sorted newest-first).
  const heroSession = sessions.find((s) => s.status === "running") ?? sessions[0];
  const showVisual = config.features.session3dVisual && heroSession;

  return (
    <div>
      <PageHeader eyebrow="Run the search" title="Start a session" subtitle="Allocate compute against a bounty or an open exploration, then watch it run and credit tokens." />

      {showVisual ? (
        <div className={styles.hero}>
          <VisualErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <SessionVisual
                seed={heroSession.id}
                status={heroSession.status}
                progress={heroSession.progress}
              />
            </Suspense>
          </VisualErrorBoundary>
        </div>
      ) : null}

      <div className={styles.layout}>
        <Card as="section" className={styles.form}>
          <form onSubmit={start} className={styles.formInner}>
            <label className={styles.field}>
              <span className={styles.label}>Target</span>
              <select className={styles.select} value={bountyId} onChange={(e) => setBountyId(e.target.value)}>
                <option value="">Open exploration</option>
                {bounties.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                Compute allocated <b className="mono">{formatInt(compute)} GFLOPS</b>
              </span>
              <input className={styles.range} type="range" min={100} max={2000} step={50} value={compute} onChange={(e) => setCompute(Number(e.target.value))} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>
                Duration <b className="mono">{duration} min</b>
              </span>
              <input className={styles.range} type="range" min={5} max={120} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </label>

            <Button type="submit" variant="primary" icon={<Zap size={16} />} disabled={starting}>
              {starting ? "Starting…" : "Start session"}
            </Button>
          </form>
        </Card>

        <div className={styles.sessions}>
          {loading ? (
            <Card><p style={{ color: "var(--text-muted)" }}>Loading sessions…</p></Card>
          ) : sessions.length === 0 ? (
            <Card><p style={{ color: "var(--text-muted)" }}>No sessions yet — start your first run.</p></Card>
          ) : (
            sessions.map((s) => (
              <Card key={s.id} className={styles.sessionCard}>
                <div className={styles.sessionTop}>
                  <span className="mono" style={{ color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>{s.id}</span>
                  <SessionStatusChip status={s.status} />
                </div>
                <div className={styles.sessionMeta}>
                  {s.bountyId ? <Tag tone="teal">{bountyTitle(s.bountyId)}</Tag> : <Tag>Open exploration</Tag>}
                  <span className={styles.metaItem}>{formatInt(s.computeAllocated)} GFLOPS</span>
                  <span className={styles.metaItem}>{formatDate(s.startedAt)}</span>
                </div>
                {s.status === "running" ? (
                  <ProgressBar value={s.progress} label="Running" tone="orange" />
                ) : (
                  <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                    {s.result}
                    {s.status === "completed" ? (
                      <> · earned <b className="mono" style={{ color: "var(--accent-2)" }}>{formatTokens(s.tokensEarned ?? 0)}</b></>
                    ) : null}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
