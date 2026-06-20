// The GA/ES learning loop — headless and deterministic. reset() builds the maze
// + population from the seed; step() advances one generation (evaluate, select,
// breed, mutate). The champion is the current best policy; its rollout path
// feeds the visual. All randomness derives from `seed` so a session replays
// identically (PLAN-3D.md §5).

import { generateMaze, type Grid } from "../maze/generate";
import { subRng, type RNG } from "../rng";
import { VISUAL_CONFIG } from "../config";
import {
  distanceField,
  fitnessOf,
  maxFiniteDistance,
  rollout,
  type RolloutResult,
} from "./fitness";
import { PlaceholderAlgorithm } from "./placeholderAlgorithm";
import type { Algorithm, Seed, Trainer, TrainerStats } from "./types";

interface Individual {
  genome: Float32Array;
  fitness: number;
  result: RolloutResult;
}

export interface TrainerOptions {
  cols: number;
  rows: number;
  algorithm?: Algorithm<Float32Array>;
}

export class GaTrainer implements Trainer {
  private readonly algo: Algorithm<Float32Array>;
  private readonly cols: number;
  private readonly rows: number;

  private rng: RNG = () => 0;
  private grid!: Grid;
  private dist!: Int32Array;
  private maxDist = 1;
  private maxSteps = 1;
  private population: Individual[] = [];
  private generation = 0;

  constructor(opts: TrainerOptions) {
    this.cols = opts.cols;
    this.rows = opts.rows;
    this.algo = opts.algorithm ?? new PlaceholderAlgorithm();
  }

  reset(seed: Seed): void {
    this.rng = subRng(seed, "ga");
    this.grid = generateMaze(subRng(seed, "maze"), this.cols, this.rows);
    this.dist = distanceField(this.grid);
    this.maxDist = maxFiniteDistance(this.dist);
    this.maxSteps = 4 * this.cols * this.rows;
    this.generation = 0;
    const { populationSize } = VISUAL_CONFIG.ga;
    this.population = [];
    for (let i = 0; i < populationSize; i++) {
      this.population.push(this.evaluate(this.algo.random(this.rng)));
    }
    this.sort();
  }

  private evaluate(genome: Float32Array): Individual {
    const policy = this.algo.build(genome);
    const result = rollout(this.grid, this.dist, policy, this.maxSteps);
    return { genome, fitness: fitnessOf(result, this.maxDist, this.maxSteps), result };
  }

  private sort(): void {
    this.population.sort((a, b) => b.fitness - a.fitness);
  }

  private tournament(): Individual {
    const { tournamentSize } = VISUAL_CONFIG.ga;
    let best: Individual | null = null;
    for (let i = 0; i < tournamentSize; i++) {
      const cand = this.population[Math.floor(this.rng() * this.population.length)];
      if (!best || cand.fitness > best.fitness) best = cand;
    }
    return best!;
  }

  step(): void {
    const { eliteCount, crossoverRate, populationSize, immigrantCount } = VISUAL_CONFIG.ga;
    const next: Individual[] = [];
    // Elitism: carry the best forward unchanged.
    for (let i = 0; i < eliteCount && i < this.population.length; i++) {
      next.push(this.population[i]);
    }
    // Fresh random immigrants keep diversity high so every seed converges.
    for (let i = 0; i < immigrantCount && next.length < populationSize; i++) {
      next.push(this.evaluate(this.algo.random(this.rng)));
    }
    // Breed the rest.
    while (next.length < populationSize) {
      const parentA = this.tournament();
      let childGenome: Float32Array;
      if (this.rng() < crossoverRate) {
        const parentB = this.tournament();
        childGenome = this.algo.crossover(parentA.genome, parentB.genome, this.rng);
      } else {
        childGenome = parentA.genome;
      }
      childGenome = this.algo.mutate(childGenome, this.rng);
      next.push(this.evaluate(childGenome));
    }
    this.population = next;
    this.sort();
    this.generation += 1;
  }

  champion() {
    return this.algo.build(this.population[0].genome);
  }

  championPath(): ReadonlyArray<readonly [number, number]> {
    return this.population[0].result.path;
  }

  attemptsPaths(): ReadonlyArray<ReadonlyArray<readonly [number, number]>> {
    const n = Math.min(VISUAL_CONFIG.perf.maxGhostTrails, this.population.length);
    return this.population.slice(1, n + 1).map((ind) => ind.result.path);
  }

  stats(): TrainerStats {
    const best = this.population[0];
    return {
      generation: this.generation,
      bestFitness: best.fitness,
      bestSteps: best.result.reached ? best.result.steps : 0,
      solved: best.result.reached,
    };
  }

  /** Exposed for the visual (maze geometry) and tests. */
  getGrid(): Grid {
    return this.grid;
  }

  bestGenome(): Float32Array {
    return this.population[0].genome;
  }
}
