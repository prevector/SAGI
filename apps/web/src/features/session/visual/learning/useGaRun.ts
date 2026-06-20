// React hook that runs the in-browser GA for the visual. Owns a GaTrainer
// (created synchronously from the seed so the maze is available on first
// render), exposes a snapshot (stats + champion/attempt paths), and an
// `advance()` that steps one generation — throttled so each generation is
// on-screen long enough to read. Stops stepping once solved (or at the cap);
// the creature then loops the solved route.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VISUAL_CONFIG } from "../config";
import type { Grid } from "../maze/generate";
import { createLocalSource } from "./localSource";
import type { CellPathSnapshot } from "./snapshot";
import { snapshot } from "./snapshot";

/** Minimum on-screen time per generation (ms), even for trivial paths. */
const MIN_GEN_MS = 420;

export interface GaRun {
  grid: Grid;
  snap: CellPathSnapshot;
  /** Called by the path-follower when it finishes traversing the champion path. */
  advance: () => void;
  /** Bumps when a new champion path should restart traversal. */
  runKey: number;
}

export function useGaRun(seed: string): GaRun {
  const source = useMemo(() => createLocalSource(seed), [seed]);
  const [snap, setSnap] = useState<CellPathSnapshot>(() => snapshot(source.trainer));
  const [runKey, setRunKey] = useState(0);
  const lastStep = useRef(0);

  // Reset snapshot/timeline when the session (seed) changes.
  useEffect(() => {
    setSnap(snapshot(source.trainer));
    setRunKey(0);
    lastStep.current = 0;
  }, [source]);

  const advance = useCallback(() => {
    const t = source.trainer;
    const s = t.stats();
    if (s.solved || s.generation >= VISUAL_CONFIG.ga.maxGenerations) return; // done evolving
    const now = performance.now();
    if (now - lastStep.current < MIN_GEN_MS) return; // throttle: hold each generation
    lastStep.current = now;
    t.step();
    setSnap(snapshot(t));
    setRunKey((k) => k + 1);
  }, [source]);

  return { grid: source.trainer.getGrid(), snap, advance, runKey };
}
