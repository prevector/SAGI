import { DEFAULT_GA_CONFIG, type GaConfig } from "../config.js";
import { generateMaze, type Grid } from "../maze/generate.js";
import { subRng, type RNG } from "../rng.js";
import { distanceField, fitnessOf, maxFiniteDistance, rollout, type RolloutResult } from "./fitness.js";
import { PlaceholderAlgorithm } from "./placeholderAlgorithm.js";
import type { Algorithm, RunConfig, RunOutcome, Seed, Trainer, TrainerStats } from "./types.js";

interface Individual {
  genome: Float32Array;
  fitness: number;
  result: RolloutResult;
}

export interface TrainerOptions {
  cols: number;
  rows: number;
  gaConfig?: Partial<GaConfig>;
  algorithm?: Algorithm<Float32Array>;
}

export class GaTrainer implements Trainer {
  private readonly cols: number;
  private readonly rows: number;
  private readonly ga: GaConfig;
  private readonly algo: Algorithm<Float32Array>;

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
    this.ga = { ...DEFAULT_GA_CONFIG, ...opts.gaConfig };
    this.algo = opts.algorithm ?? new PlaceholderAlgorithm(this.ga);
  }

  reset(seed: Seed): void {
    this.rng = subRng(seed, "ga");
    this.grid = generateMaze(subRng(seed, "maze"), this.cols, this.rows);
    this.dist = distanceField(this.grid);
    this.maxDist = maxFiniteDistance(this.dist);
    this.maxSteps = 4 * this.cols * this.rows;
    this.generation = 0;
    this.population = [];
    for (let i = 0; i < this.ga.populationSize; i++) {
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
    let best: Individual | null = null;
    for (let i = 0; i < this.ga.tournamentSize; i++) {
      const cand = this.population[Math.floor(this.rng() * this.population.length)];
      if (!best || cand.fitness > best.fitness) {
        best = cand;
      }
    }
    return best!;
  }

  step(): void {
    const next: Individual[] = [];
    for (let i = 0; i < this.ga.eliteCount && i < this.population.length; i++) {
      next.push(this.population[i]);
    }
    for (let i = 0; i < this.ga.immigrantCount && next.length < this.ga.populationSize; i++) {
      next.push(this.evaluate(this.algo.random(this.rng)));
    }
    while (next.length < this.ga.populationSize) {
      const parentA = this.tournament();
      let childGenome: Float32Array;
      if (this.rng() < this.ga.crossoverRate) {
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
    const n = Math.min(8, this.population.length);
    return this.population.slice(1, n + 1).map((ind) => ind.result.path);
  }

  stats(): TrainerStats {
    const best = this.population[0];
    return {
      generation: this.generation,
      bestFitness: best.fitness,
      bestSteps: best.result.reached ? best.result.steps : 0,
      solved: best.result.reached
    };
  }

  getGrid(): Grid {
    return this.grid;
  }

  bestGenome(): Float32Array {
    return this.population[0].genome;
  }

  bestResult(): RolloutResult {
    return this.population[0].result;
  }

  maxGenerations(): number {
    return this.ga.maxGenerations;
  }

  dimensions(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }
}

export function trainOne(config: RunConfig): RunOutcome {
  const cols = config.cols ?? 11;
  const rows = config.rows ?? 11;
  const gaConfig = {
    ...(config.hiddenUnits === undefined ? {} : { hiddenUnits: config.hiddenUnits }),
    ...(config.maxGenerations === undefined ? {} : { maxGenerations: config.maxGenerations })
  };

  const trainer = new GaTrainer({ cols, rows, gaConfig });
  trainer.reset(config.seed);

  while (!trainer.stats().solved && trainer.stats().generation < trainer.maxGenerations()) {
    trainer.step();
  }

  const stats = trainer.stats();
  return {
    ...stats,
    genome: Array.from(trainer.bestGenome()),
    path: trainer.championPath().map(([x, y]) => [x, y]),
    attempts: trainer.attemptsPaths().map((path) => path.map(([x, y]) => [x, y])),
    cols,
    rows,
    maxGenerations: trainer.maxGenerations()
  };
}
