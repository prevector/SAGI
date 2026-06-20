// Module-local tunables for the session visual. Kept separate from the app's
// lib/config.ts (which only owns the `features.session3dVisual` flag). Tweak GA
// behaviour, the performance budget, and LOD thresholds here.

export const VISUAL_CONFIG = {
  /** Genetic algorithm (the placeholder "brain" being trained). */
  ga: {
    populationSize: 64,
    eliteCount: 4,
    tournamentSize: 3,
    crossoverRate: 0.6,
    mutationRate: 0.1, // per-weight probability
    mutationStd: 0.15, // Gaussian sigma on a mutated weight
    /** Hidden-layer width of the MLP policy. */
    hiddenUnits: 8,
    /** Max generations before we stop (visual + headless cap). */
    maxGenerations: 80,
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
  },
} as const;

export type VisualConfig = typeof VISUAL_CONFIG;
