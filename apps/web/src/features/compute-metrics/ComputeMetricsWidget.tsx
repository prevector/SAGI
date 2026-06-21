// Top-bar compute HUD (centred). Best-effort real specs + animated (fabricated)
// CPU/GPU usage, biased by whether a session is running OR the demo oscillator —
// so the bars read like a real machine picking up and finishing work. Mock only:
// it makes NO claim of real metrics (SAGI-compute-metrics-feasibility.md).
// Colourblind-safe: % is carried by bar length + a tabular number + a threshold
// tick, never hue alone. Laid out as a single horizontal row to sit in the
// centre of the terminal menu bar.

import { useComputeMetrics } from "./useComputeMetrics";
import { useSessionActivity } from "./useSessionActivity";
import { useDemoBusy } from "./useDemoBusy";
import styles from "./ComputeMetricsWidget.module.css";

const SEGMENTS = 14; // bar resolution
const THRESHOLD = 80; // high-load mark (%)
const TICK_AT = Math.round((THRESHOLD / 100) * SEGMENTS); // segment index of the tick

/** A segmented bar with a fixed high-load tick. Filled length == value. */
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

function Gauge({
  tag,
  spec,
  title,
  pct,
  kind,
}: {
  tag: string;
  spec: string;
  title?: string;
  pct: number;
  kind: "cpu" | "gpu";
}) {
  const high = pct >= THRESHOLD;
  return (
    <div
      className={`${styles.gauge} ${high ? styles.high : ""}`}
      aria-label={`${tag} ${title ?? spec}, ${Math.round(pct)} percent${high ? ", high load" : ""}`}
    >
      <span className={styles.tag}>{tag}</span>
      <span className={styles.spec} title={title ?? spec}>
        {spec}
      </span>
      <UsageBar pct={pct} kind={kind} />
      <span className={styles.pct}>{Math.round(pct)}%</span>
    </div>
  );
}

export function ComputeMetricsWidget() {
  const sessionBusy = useSessionActivity();
  const demoBusy = useDemoBusy();
  const metrics = useComputeMetrics(sessionBusy || demoBusy);

  // Non-mock tiers aren't built yet — stay quiet but keep the seam visible.
  if (!metrics) {
    return (
      <div className={styles.note} title="Compute metrics source not available">
        compute · —
      </div>
    );
  }

  const { cpu, gpu, throughput } = metrics;
  const cpuSpec = cpu.cores ? `${cpu.cores}c` : cpu.label;
  // Keep the centred bar compact; the full GPU model stays in the tooltip.
  const gpuSpec = gpu.label.length > 18 ? `${gpu.label.slice(0, 18).trim()}…` : gpu.label;
  const live = (throughput ?? 0) > 0;

  return (
    <div
      className={styles.widget}
      aria-label="Compute usage (simulated)"
      title="Simulated local compute — not real metrics"
    >
      <span className={`${styles.status} ${live ? styles.statusLive : ""}`} aria-hidden />
      <Gauge tag="CPU" spec={cpuSpec} pct={cpu.usagePct} kind="cpu" />
      <span className={styles.divider} aria-hidden />
      <Gauge tag="GPU" spec={gpuSpec} title={gpu.label} pct={gpu.usagePct} kind="gpu" />
      <span className={styles.divider} aria-hidden />
      <div
        className={styles.throughput}
        aria-label={live ? `${throughput} evaluations per second` : "idle"}
      >
        <span className={styles.up} aria-hidden>
          ▲
        </span>
        <span className={styles.thrVal}>{live ? throughput!.toLocaleString() : "0"}</span>
        <span className={styles.thrUnit}>ev/s</span>
      </div>
    </div>
  );
}
