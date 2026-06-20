// Top-bar compute HUD. Shows best-effort real specs + animated (fabricated)
// CPU/GPU usage, biased by whether the user has a running session. Mock only —
// it makes NO claim of real metrics (SAGI-compute-metrics-feasibility.md).
// Colourblind-safe: % is carried by bar length + a tabular number + a threshold
// tick/icon, never hue alone.

import { TriangleAlert } from "lucide-react";
import { useComputeMetrics } from "./useComputeMetrics";
import { useSessionActivity } from "./useSessionActivity";
import styles from "./ComputeMetricsWidget.module.css";

const SEGMENTS = 12; // bar resolution
const THRESHOLD = 80; // high-load mark (%)
const TICK_AT = Math.round((THRESHOLD / 100) * SEGMENTS); // segment index of the tick

/** A segmented bar with a fixed high-load tick. Length == value. */
function UsageBar({ pct, kind }: { pct: number; kind: "cpu" | "gpu" }) {
  const filled = Math.round((pct / 100) * SEGMENTS);
  const high = pct >= THRESHOLD;
  const segs = [];
  for (let i = 0; i < SEGMENTS; i++) {
    if (i === TICK_AT) segs.push(<span key={`t${i}`} className={styles.tick} aria-hidden />);
    segs.push(<span key={i} className={`${styles.seg} ${i < filled ? styles.on : ""}`} aria-hidden />);
  }
  return (
    <span className={`${styles.bar} ${styles[kind]} ${high ? styles.high : ""}`} aria-hidden>
      {segs}
    </span>
  );
}

function Row({
  tag,
  spec,
  pct,
  kind,
}: {
  tag: string;
  spec: string;
  pct: number;
  kind: "cpu" | "gpu";
}) {
  const high = pct >= THRESHOLD;
  return (
    <div
      className={`${styles.row} ${high ? styles.high : ""}`}
      aria-label={`${tag} ${spec}, ${Math.round(pct)} percent${high ? ", high load" : ""}`}
    >
      <span className={styles.tag}>{tag}</span>
      <span className={styles.spec} title={spec}>
        {spec}
      </span>
      <UsageBar pct={pct} kind={kind} />
      <span className={styles.pct}>
        {Math.round(pct)}%
        {high ? <TriangleAlert className={styles.alert} size={10} aria-hidden /> : null}
      </span>
    </div>
  );
}

export function ComputeMetricsWidget() {
  const busy = useSessionActivity();
  const metrics = useComputeMetrics(busy);

  // Non-mock tiers aren't built yet — stay quiet but keep the seam visible.
  if (!metrics) {
    return (
      <div className={styles.note} title="Compute metrics source not available">
        compute · —
      </div>
    );
  }

  const { cpu, gpu, throughput } = metrics;
  const cpuSpec = cpu.cores ? `${cpu.label} · ${cpu.cores}c` : cpu.label;

  return (
    <div className={styles.widget} aria-label="Compute usage (simulated)" title="Simulated compute usage — not real metrics">
      <Row tag="CPU" spec={cpuSpec} pct={cpu.usagePct} kind="cpu" />
      <Row tag="GPU" spec={gpu.label} pct={gpu.usagePct} kind="gpu" />
      {throughput && throughput > 0 ? (
        <div className={styles.throughput} aria-label={`${throughput} evaluations per second`}>
          <span className={styles.up} aria-hidden>
            ▲
          </span>
          {throughput.toLocaleString()}/s
        </div>
      ) : null}
    </div>
  );
}
