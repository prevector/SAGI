// usePopulation — the driver between the data layer and the renderer.
//
// Owns a deterministic PopulationSim (recreated only when the seed changes) and
// advances it on a time-accumulating loop whose rate is bound to the session
// (generationsPerSec(status, progress) — PLAN-TRAIN-ANIM §4). It publishes the
// current population as renderer rows + the HUD stats. GenomeField reads these;
// the swap to a remote PopulationSource later changes only this file.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RowState } from "./render/GlyphGrid";
import type { PopulationStats, Seed } from "./sim/types";
import { TRAIN_CONFIG, generationsPerSec, type SessionStatus } from "./config";
import { createLocalSource } from "./sim/localSource";
import type { PopulationSim } from "./sim/PopulationSim";
import { useReducedMotion } from "./render/useReducedMotion";

export interface PopulationView {
  rows: RowState[];
  stats: PopulationStats;
}

const MAX_GEN = TRAIN_CONFIG.sim.maxGenerations;

function toView(sim: PopulationSim, genPerSec: number): PopulationView {
  const rows: RowState[] = sim.population().map((g) => ({
    chars: g.chars,
    fitness: g.fitness,
    locked: g.locked,
  }));
  const base = sim.stats();
  return {
    rows,
    stats: { ...base, evaluationsPerSec: sim.evaluationsPerGeneration() * genPerSec },
  };
}

/** For the static reduced-motion frame: how resolved the field should look. */
function reducedTargetGen(status: SessionStatus, progress: number): number {
  if (status === "completed") return MAX_GEN;
  if (status === "running") return Math.round(Math.max(0, Math.min(1, progress)) * MAX_GEN);
  return 0; // queued / failed → noise
}

function fastForward(sim: PopulationSim, targetGen: number): void {
  while (sim.stats().generation < targetGen) sim.step();
}

export function usePopulation(seed: Seed, status: SessionStatus, progress: number): PopulationView {
  const reduced = useReducedMotion();
  const simRef = useRef<PopulationSim | null>(null);

  // Keep the latest status/progress readable by the loop without restarting it.
  const statusRef = useRef(status);
  statusRef.current = status;
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [view, setView] = useState<PopulationView>(() => {
    const sim = createLocalSource(seed).sim;
    return toView(sim, generationsPerSec(status, progress));
  });

  const publish = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    setView(toView(sim, generationsPerSec(statusRef.current, progressRef.current)));
  }, []);

  // Create/reset the sim on seed (or reduced-motion) change only.
  useEffect(() => {
    const sim = createLocalSource(seed).sim;
    simRef.current = sim;
    if (reduced) fastForward(sim, reducedTargetGen(statusRef.current, progressRef.current));
    publish();
  }, [seed, reduced, publish]);

  // The stepping loop: rate bound to the session; paused via the document
  // visibility the browser already gives RAF (and GenomeField's own gate).
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = 0;
    let acc = 0; // accumulated generations owed
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const sim = simRef.current;
      if (!sim) return;
      const st = statusRef.current;

      // On completion, snap the field to a fully-resolved state once.
      if (st === "completed") {
        if (sim.stats().generation < MAX_GEN) {
          fastForward(sim, MAX_GEN);
          publish();
        }
        last = 0;
        return;
      }

      const gps = generationsPerSec(st, progressRef.current);
      if (gps <= 0) {
        last = 0; // queued/failed: idle, reset the clock
        return;
      }
      if (!last) {
        last = now;
        return;
      }
      acc += ((now - last) / 1000) * gps;
      last = now;
      let stepped = false;
      while (acc >= 1 && sim.stats().generation < MAX_GEN) {
        sim.step();
        acc -= 1;
        stepped = true;
      }
      if (sim.stats().generation >= MAX_GEN) acc = 0;
      if (stepped) publish();
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, seed, publish]);

  return useMemo(() => view, [view]);
}
