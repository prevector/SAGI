import type { RNG } from "../rng.js";

export type Seed = string;

export interface Policy {
  act(obs: Float32Array): Float32Array;
}

export interface Algorithm<G = unknown> {
  random(rng: RNG): G;
  build(genome: G): Policy;
  mutate(genome: G, rng: RNG): G;
  crossover(a: G, b: G, rng: RNG): G;
}

export interface TrainerStats {
  generation: number;
  bestFitness: number;
  bestSteps: number;
  solved: boolean;
}

export interface Trainer {
  reset(seed: Seed): void;
  step(): void;
  champion(): Policy;
  championPath(): ReadonlyArray<readonly [number, number]>;
  attemptsPaths(): ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  stats(): TrainerStats;
}

export interface TrainingUpdate extends TrainerStats {
  bestGenome?: unknown;
}

export type TrainingSource =
  | { kind: "local"; trainer: Trainer }
  | {
      kind: "remote";
      subscribe(seed: Seed, cb: (u: TrainingUpdate) => void): () => void;
    };
