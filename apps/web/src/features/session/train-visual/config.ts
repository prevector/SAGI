// Module-local tunables for the compute/train genome-field visual.
// Everything here is safe to tweak without touching the renderer or the sim.

export type SessionStatus = "queued" | "running" | "completed" | "failed";

export const TRAIN_CONFIG = {
  // Swap point for the data seam (PLAN-TRAIN-ANIM §3). "local" runs the
  // deterministic in-browser sim; "remote" would consume engine telemetry.
  populationSource: "local" as "local" | "remote",

  // The seed/genome register (lowercase alphanumeric + dash), matching the
  // hero's TokenResolution scramble charset.
  charset: "abcdefghijklmnopqrstuvwxyz0123456789-",

  sim: {
    genomeLength: 24, // L — chars per genome row
    populationSize: 28, // N — rows on screen
    elite: 3, // top genomes copied unchanged each generation
    tournament: 3, // tournament size for parent selection
    mutationRate: 0.08, // per-position mutation chance (scaled down by fitness)
    maxGenerations: 60, // sim converges to best fitness within this cap
    highlightThreshold: 0.7, // fitness at/above which a genome reads "resolved"
  },

  render: {
    // The field is text-dense; the hero deliberately runs ~20fps. We cap the
    // draw rate (ms between frames) rather than burning a full 60.
    frameIntervalMs: 40, // ~25fps
    fontPx: 15, // Geist Mono cell size
    cellAdvance: 0.62, // monospace advance as a fraction of fontPx
    rowHeight: 1.7, // row pitch as a multiple of fontPx
    leftFade: 0.12, // fraction of width over which the left edge fades in
    // Flip cadence (ms) — resolved cells shimmer fast & alive; noise cells
    // barely twitch. Straight from EmergenceField.
    flipFastMin: 70,
    flipFastJitter: 150,
    flipSlowMin: 360,
    flipSlowJitter: 1500,
    glowAlpha: 0.3, // peak alpha of the teal glow behind resolved rows
  },

  // status / progress → behaviour (PLAN-TRAIN-ANIM §4).
  // generationsPerSec: how fast the sim advances while running. Eased by
  // progress so the field reads as "your compute doing work".
  pacing: {
    baseGenPerSec: 1.2,
    progressGenPerSec: 5, // added at progress = 1
  },
} as const;

/** Generations/sec the sim should advance for a given status + progress. */
export function generationsPerSec(status: SessionStatus, progress: number): number {
  if (status !== "running") return 0; // queued/completed/failed don't advance
  const p = Math.max(0, Math.min(1, progress));
  return TRAIN_CONFIG.pacing.baseGenPerSec + TRAIN_CONFIG.pacing.progressGenPerSec * p;
}
