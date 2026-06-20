// usePopulation — the driver hook between the data layer and the renderer.
//
// C1: returns a static field of noise rows (fitness 0) + idle stats, so the
// scaffold renders the hero's glyph-noise look with no sim yet. C3 replaces the
// body with the real PopulationSim driver (throttled step() bound to status /
// progress); GenomeField does not change.

import { useMemo } from "react";
import type { RowState } from "./render/GlyphGrid";
import type { PopulationStats, Seed } from "./sim/types";
import type { SessionStatus } from "./config";
import { TRAIN_CONFIG } from "./config";
import { makeRng } from "./rng";

export interface PopulationView {
  rows: RowState[];
  stats: PopulationStats;
}

/** Deterministic noise rows for the idle/scaffold state. */
function noiseRows(seed: Seed): RowState[] {
  const rng = makeRng(`${seed}:noise`);
  const chars = TRAIN_CONFIG.charset;
  const { populationSize, genomeLength } = TRAIN_CONFIG.sim;
  return Array.from({ length: populationSize }, () => {
    let s = "";
    for (let i = 0; i < genomeLength; i++) s += chars[Math.floor(rng() * chars.length)];
    return { chars: s, fitness: 0, locked: undefined };
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function usePopulation(seed: Seed, _status: SessionStatus, _progress: number): PopulationView {
  // C1 placeholder: idle noise. Real sim wiring lands in C3.
  const rows = useMemo(() => noiseRows(seed), [seed]);
  const stats = useMemo<PopulationStats>(
    () => ({
      generation: 0,
      bestFitness: 0,
      populationSize: TRAIN_CONFIG.sim.populationSize,
      evaluationsPerSec: 0,
      highlightedFraction: 0,
    }),
    []
  );
  return { rows, stats };
}
