// usePopulation — the driver between the data layer and the renderer.
//
// Owns a deterministic PopulationSim (recreated only when the seed changes) and
// advances it on a time-accumulating loop whose rate is bound to the session
// (generationsPerSec(status, progress) — PLAN-TRAIN-ANIM §4). It publishes the
// current population as renderer rows + the HUD stats. GenomeField reads these;
// the swap to a remote PopulationSource later changes only this file.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RowState } from "./render/GlyphGrid";
import type { PopulationStats, PopulationUpdate, Seed } from "./sim/types";
import { TRAIN_CONFIG, generationsPerSec, type SessionStatus } from "./config";
import { createLocalSource } from "./sim/localSource";
import { createRemoteSource } from "./sim/remoteSource";
import type { PopulationSim } from "./sim/PopulationSim";
import { useReducedMotion } from "./render/useReducedMotion";

const REMOTE = TRAIN_CONFIG.populationSource === "remote";

/** Map an engine PopulationUpdate to a view (remote seam; stub emits nothing). */
function updateToView(u: PopulationUpdate): PopulationView {
  const rows: RowState[] = (u.genomes ?? []).map((g) => ({ chars: g.chars, fitness: g.fitness }));
  return {
    rows,
    stats: {
      generation: u.generation,
      bestFitness: u.bestFitness,
      populationSize: u.populationSize,
      evaluationsPerSec: u.evaluationsPerSec,
      highlightedFraction: u.highlightedFraction,
    },
  };
}

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

  // Remote seam: when the engine streams telemetry, subscribe and render its
  // updates. The stub emits nothing, so the initial idle view stays.
  useEffect(() => {
    if (!REMOTE) return;
    const src = createRemoteSource();
    return src.subscribe(seed, (u) => setView(updateToView(u)));
  }, [seed]);

  // Create/reset the sim on seed (or reduced-motion) change only. (local mode)
  useEffect(() => {
    if (REMOTE) return;
    simRef.current = createLocalSource(seed).sim;
    publish();
  }, [seed, reduced, publish]);

  // Reduced motion: no loop — render a single static frame that still reflects
  // the session state, updating discretely as status/progress change.
  useEffect(() => {
    if (!reduced || REMOTE) return;
    const sim = simRef.current;
    if (!sim) return;
    const target = reducedTargetGen(status, progress);
    if (sim.stats().generation > target) sim.reset(seed); // e.g. running → failed
    fastForward(sim, target);
    publish();
  }, [reduced, status, progress, seed, publish]);

  // The stepping loop: rate bound to the session; paused via the document
  // visibility the browser already gives RAF (and GenomeField's own gate).
  useEffect(() => {
    if (reduced || REMOTE) return;
    let raf = 0;
    let last = 0;
    let acc = 0; // accumulated generations owed
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const sim = simRef.current;
      if (!sim) return;
      const st = statusRef.current;

      // On failure, the field collapses back to noise (scramble-back).
      if (st === "failed") {
        if (sim.stats().generation > 0) {
          sim.reset(seed);
          publish();
        }
        last = 0;
        return;
      }

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
