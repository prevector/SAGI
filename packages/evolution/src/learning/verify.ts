import { DEFAULT_GA_CONFIG, type GaConfig } from "../config.js";
import { generateMaze } from "../maze/generate.js";
import { MLP_SHAPE, PlaceholderAlgorithm } from "./placeholderAlgorithm.js";
import { distanceField, fitnessOf, maxFiniteDistance, rollout, type RolloutResult } from "./fitness.js";
import { genomeLength } from "./mlp.js";
import { subRng } from "../rng.js";
import type { RunConfig, RunOutcome, Seed } from "./types.js";

export interface VerifyGenomeOptions {
  seed: Seed;
  genome: Float32Array;
  cols?: number;
  rows?: number;
  gaConfig?: Partial<GaConfig>;
}

export interface VerifyGenomeResult extends RolloutResult {
  fitness: number;
  cols: number;
  rows: number;
  maxSteps: number;
  expectedGenomeLength: number;
}

export function expectedGenomeLength(gaConfig: Partial<GaConfig> = {}): number {
  const hiddenUnits = gaConfig.hiddenUnits ?? DEFAULT_GA_CONFIG.hiddenUnits;
  return genomeLength(MLP_SHAPE(hiddenUnits));
}

export function verifyGenome(opts: VerifyGenomeOptions): VerifyGenomeResult {
  const ga = { ...DEFAULT_GA_CONFIG, ...opts.gaConfig };
  const cols = opts.cols ?? 11;
  const rows = opts.rows ?? 11;
  const expectedLength = expectedGenomeLength(ga);

  if (opts.genome.length !== expectedLength) {
    throw new Error(`Genome length mismatch. Expected ${expectedLength}, received ${opts.genome.length}.`);
  }

  const grid = generateMaze(subRng(opts.seed, "maze"), cols, rows);
  const dist = distanceField(grid);
  const maxDist = maxFiniteDistance(dist);
  const maxSteps = 4 * cols * rows;
  const algo = new PlaceholderAlgorithm(ga);
  const result = rollout(grid, dist, algo.build(opts.genome), maxSteps);

  return {
    ...result,
    fitness: fitnessOf(result, maxDist, maxSteps),
    cols,
    rows,
    maxSteps,
    expectedGenomeLength: expectedLength
  };
}

export function replayGenome(config: RunConfig & { genome: number[] }): RunOutcome {
  const result = verifyGenome({
    seed: config.seed,
    genome: Float32Array.from(config.genome),
    cols: config.cols,
    rows: config.rows,
    gaConfig: config.hiddenUnits === undefined ? undefined : { hiddenUnits: config.hiddenUnits }
  });

  return {
    generation: 0,
    bestFitness: result.fitness,
    bestSteps: result.reached ? result.steps : 0,
    solved: result.reached,
    genome: [...config.genome],
    path: result.path.map(([x, y]) => [x, y]),
    attempts: [],
    cols: result.cols,
    rows: result.rows,
    maxGenerations: config.maxGenerations ?? DEFAULT_GA_CONFIG.maxGenerations
  };
}
