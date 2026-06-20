import { Check, Circle } from "lucide-react";
import { Async, Card, MetricChart, PageHeader, ProgressBar, Stat } from "../components/ui";
import { api } from "../lib/api";
import { formatDate, formatInt } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import styles from "./ProgressPage.module.css";

export default function ProgressPage() {
  const state = useAsync(() => api.getProgress(), []);

  return (
    <div>
      <PageHeader eyebrow="The search" title="Progress to AGI" subtitle="An honest, data-driven read on how far the search has come — milestones reached and the metrics still climbing." />
      <Async state={state}>
        {(p) => (
          <div style={{ display: "grid", gap: "var(--s5)" }}>
            <Card style={{ display: "grid", gap: "var(--s4)" }}>
              <Stat label="Overall progress to general transfer" size="lg" value={`${Math.round(p.overallProgress * 100)}%`} />
              <ProgressBar value={p.overallProgress} showValue={false} />
              <p style={{ color: "var(--text-muted)", maxWidth: "70ch" }}>{p.headline}</p>
            </Card>

            <Card>
              <p className={styles.sectionLabel}>Milestones</p>
              <ol className={styles.stepper}>
                {p.milestones.map((m) => {
                  const reached = Boolean(m.reachedAt);
                  return (
                    <li key={m.id} className={styles.step}>
                      <span className={[styles.marker, reached ? styles.reached : styles.upcoming].join(" ")} aria-hidden>
                        {reached ? <Check size={14} /> : <Circle size={12} />}
                      </span>
                      <span className={styles.stepBody}>
                        <span className={styles.stepLabel}>{m.label}</span>
                        <span className={styles.stepMeta}>{reached ? `Reached ${formatDate(m.reachedAt!)}` : "Upcoming"}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <div className={styles.metrics}>
              {p.metrics.map((series) => {
                const latest = series.points[series.points.length - 1]?.v ?? 0;
                // Score-like metrics (<10) keep decimals; counts use grouped ints.
                const fmt = latest < 10 ? (n: number) => n.toFixed(2) : formatInt;
                return (
                  <Card key={series.key}>
                    <Stat label={series.label} value={<span className="mono">{fmt(latest)}{series.unit ? ` ${series.unit}` : ""}</span>} />
                    <div style={{ marginTop: "var(--s3)" }}>
                      <MetricChart series={[{ key: series.key, label: series.label, points: series.points, tone: series.unit ? "orange" : "teal" }]} valueFormat={fmt} height={140} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}
