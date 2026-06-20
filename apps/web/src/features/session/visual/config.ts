// Module-local tunables for the session visual. Kept separate from the app's
// lib/config.ts (which only owns the `features.session3dVisual` flag). Tweak GA
// behaviour, the performance budget, and LOD thresholds here.

export const VISUAL_CONFIG = {
  /** Where training comes from: in-browser GA now ("local"), engine telemetry
   *  later ("remote"). The remote source is a typed stub until the engine
   *  streams training (RESEARCH-3D.md §3). */
  trainingSource: "local" as "local" | "remote",

  /** Genetic algorithm (the placeholder "brain" being trained). */
  ga: {
    populationSize: 80,
    eliteCount: 4,
    tournamentSize: 3,
    crossoverRate: 0.6,
    mutationRate: 0.12, // per-weight probability
    mutationStd: 0.18, // Gaussian sigma on a mutated weight
    /** Fresh random individuals injected each generation (diversity / escapes
     *  local optima so every seed converges). */
    immigrantCount: 3,
    /** Hidden-layer width of the MLP policy. */
    hiddenUnits: 8,
    /** Max generations before we stop (visual + headless cap). */
    maxGenerations: 120,
  },

  /** Maze sizing (cell counts). Shrinks on small screens (see scene). */
  maze: {
    cols: 11,
    rows: 11,
    cellSize: 1, // world units per cell
    wallHeight: 0.7,
    mobileCols: 7,
    mobileRows: 7,
  },

  /** Performance / level-of-detail budget. */
  perf: {
    dprDesktop: [1, 1.5] as [number, number],
    dprMobile: [1, 1] as [number, number],
    /** Max ghost trails rendered for non-champion attempts. */
    maxGhostTrails: 8,
    /** Bloom resolution divisor (higher = cheaper, softer). */
    bloomMipmapBlur: true,
    /** Sustained FPS below this auto-downgrades the quality tier (one-way). */
    downgradeFps: 42,
    /** Frames the FPS must stay low before a downgrade fires (hysteresis). */
    downgradeAfterFrames: 90,
  },
} as const;

export type VisualConfig = typeof VISUAL_CONFIG;

/* ------------------------------ quality ladder ----------------------------- */

// One named tier collapses the device signals (reduced-motion, mobile, live
// FPS) into a single object every renderer reads. Heavy fidelity work (Tiers
// 1–3) is gated *only* through these flags, so the perf budget and the
// reduced-motion / mobile fallbacks stay intact no matter how much detail the
// "high" path grows. Never branch on `isMobile`/`reducedMotion` inside a
// renderer — branch on the resolved QualitySettings instead.

export type QualityTier = "high" | "medium" | "low";

export interface QualitySettings {
  tier: QualityTier;

  /* scene / post — the expensive passes */
  shadows: boolean; // real-time shadow map at all
  softShadows: boolean; // PCSS soft-shadow shader (high only)
  reflections: boolean; // MeshReflectorMaterial floor vs. matte plane
  ao: boolean; // N8AO ambient occlusion pass
  dof: boolean; // depth-of-field pass
  chromaticAberration: boolean;
  godRays: boolean; // volumetric shafts from the exit
  environment: boolean; // inline-lightformer reflection environment

  /* atmosphere */
  dustMotes: number; // floating-mote particle count (0 = off)
  footParticles: boolean; // per-step dust/sparks
  energyTrail: boolean; // champion energy ribbon

  /* geometry level-of-detail */
  bodySegments: number; // creature sphere lat/long detail
  limbRadial: number; // limb cylinder radial segments
  wallBevel: boolean; // beveled/chamfered wall tops
  circuitTraces: boolean; // emissive flow lines on wall tops

  /* render */
  shadowMapSize: number;
  dprCap: number; // upper DPR bound this tier allows
}

const HIGH: QualitySettings = {
  tier: "high",
  shadows: true,
  softShadows: true,
  reflections: true,
  ao: true,
  dof: true,
  chromaticAberration: true,
  godRays: true,
  environment: true,
  dustMotes: 120,
  footParticles: true,
  energyTrail: true,
  bodySegments: 32,
  limbRadial: 16,
  wallBevel: true,
  circuitTraces: true,
  shadowMapSize: 2048,
  dprCap: 1.5,
};

const MEDIUM: QualitySettings = {
  tier: "medium",
  shadows: true,
  softShadows: false,
  reflections: false,
  ao: false,
  dof: false,
  chromaticAberration: true,
  godRays: false,
  environment: true,
  dustMotes: 48,
  footParticles: true,
  energyTrail: true,
  bodySegments: 20,
  limbRadial: 10,
  wallBevel: true,
  circuitTraces: true,
  shadowMapSize: 1024,
  dprCap: 1.25,
};

const LOW: QualitySettings = {
  tier: "low",
  shadows: false,
  softShadows: false,
  reflections: false,
  ao: false,
  dof: false,
  chromaticAberration: false,
  godRays: false,
  environment: false,
  dustMotes: 0,
  footParticles: false,
  energyTrail: false,
  bodySegments: 14,
  limbRadial: 8,
  wallBevel: false,
  circuitTraces: false,
  shadowMapSize: 0,
  dprCap: 1,
};

export const QUALITY_PRESETS: Record<QualityTier, QualitySettings> = {
  high: HIGH,
  medium: MEDIUM,
  low: LOW,
};

/** Tier order for one-way perf downgrades. */
export const QUALITY_ORDER: QualityTier[] = ["high", "medium", "low"];
