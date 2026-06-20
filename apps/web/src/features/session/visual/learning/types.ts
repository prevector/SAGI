// Contracts for the "brain" being trained. Per PLAN-3D.md these are the
// swappable seams: the PlaceholderAlgorithm (a GA-evolved MLP) implements
// `Algorithm` now; a real model drops in later behind the same interface. The
// `TrainingSource` seam lets the visual run the in-browser GA (local) now and
// consume engine telemetry (remote) later, with no scene changes.

import type { RNG } from "../rng";

export type Seed = string; // = session.id

/** Maps a sensor observation to an action [turn, move], both in [-1, 1]. */
export interface Policy {
  act(obs: Float32Array): Float32Array;
}

/** Genetic operators over a policy genome `G`. */
export interface Algorithm<G = unknown> {
  random(rng: RNG): G;
  build(genome: G): Policy;
  mutate(genome: G, rng: RNG): G;
  crossover(a: G, b: G, rng: RNG): G;
}

export interface TrainerStats {
  generation: number;
  bestFitness: number;
  bestSteps: number; // steps the champion took to reach the exit (0 if unsolved)
  solved: boolean;
}

export interface Trainer {
  reset(seed: Seed): void;
  /** Advance one generation (headless). */
  step(): void;
  champion(): Policy;
  /** Champion's path through the maze this generation (cell coords). */
  championPath(): ReadonlyArray<readonly [number, number]>;
  /** A few top attempts' paths (for ghost trails). */
  attemptsPaths(): ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  stats(): TrainerStats;
}

export interface TrainingUpdate extends TrainerStats {
  /** Opaque champion genome for replay (engine seam). */
  bestGenome?: unknown;
}

/** Where training comes from: in-browser GA now, engine telemetry later. */
export type TrainingSource =
  | { kind: "local"; trainer: Trainer }
  | {
      kind: "remote";
      subscribe(seed: Seed, cb: (u: TrainingUpdate) => void): () => void;
    };
