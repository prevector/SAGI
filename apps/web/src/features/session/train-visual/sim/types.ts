// Finalized contracts for the genome-field data layer (PLAN-TRAIN-ANIM §3).
// The local sim and (later) the engine's remote telemetry both produce these.

export type Seed = string; // == session.id; all RNG derives from makeRng(seed)

export interface Genome {
  id: string;
  chars: string; // the visible genome row (fixed length L)
  fitness: number; // 0..1; drives highlight + propagation
  highlighted: boolean; // resolved/stable vs noisy — derived: fitness >= threshold
  age: number; // generations survived
  /** Per-position 0..1 match against the hidden target (1 = locked). */
  locked: readonly number[];
}

export interface PopulationStats {
  generation: number;
  bestFitness: number; // 0..1
  populationSize: number;
  evaluationsPerSec: number; // populationSize * generationsPerSec (display)
  highlightedFraction: number; // 0..1 — fraction of rows resolved
}

export interface PopulationSim {
  reset(seed: Seed): void;
  step(): void; // one generation: mutate → evaluate → select → propagate
  population(): readonly Genome[];
  stats(): PopulationStats;
}

export interface PopulationUpdate extends PopulationStats {
  genomes?: ReadonlyArray<Pick<Genome, "id" | "chars" | "fitness">>;
}

export type PopulationSource =
  | { kind: "local"; sim: PopulationSim }
  | { kind: "remote"; subscribe(seed: Seed, cb: (u: PopulationUpdate) => void): () => void };
