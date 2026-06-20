// Contracts for the compute-metrics widget. One seam, three tiers — only the
// `mock` tier is implemented (see SAGI-compute-metrics-feasibility.md for why a
// web app can't read true CPU/GPU utilization; the realtime % is fabricated).
// Mirrors the train-visual PopulationSource seam: swap the source later with
// zero widget changes.

export type ComputeSourceKind = "mock" | "browser" | "agent";

export interface ComputeMetrics {
  cpu: { label: string; cores: number | null; usagePct: number }; // usagePct 0..100 (mocked)
  gpu: { label: string; usagePct: number }; // mocked
  throughput?: number; // optional evals/sec (mocked)
  source: ComputeSourceKind;
}

export interface ComputeMetricsSource {
  kind: ComputeSourceKind;
  /** Begin emitting metrics (mock: an ~1 Hz timer of smoothed values). */
  start(emit: (m: ComputeMetrics) => void): void;
  /** Stop emitting and release any timers. Safe to call repeatedly. */
  stop(): void;
  /** Bias the fabricated % toward "busy" (a session is running) or idle. */
  setBusy?(busy: boolean): void;
}
