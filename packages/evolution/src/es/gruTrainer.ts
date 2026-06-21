import { gaussian, makeRng } from "../rng.js";
import { GruModel, gruGenomeLength, type GruShape } from "./gru.js";
import { OpenAiEsOptimizer, type OpenAiEsConfig } from "./openaiEs.js";
import type { TokenTaskDataset } from "./tokenTask.js";

export interface GruEsTrainConfig {
  hiddenSize: number;
  es: Omit<OpenAiEsConfig, "dimensions">;
}

export interface GruEsTrainResult {
  initialLoss: number;
  initialAccuracy: number;
  finalLoss: number;
  finalAccuracy: number;
  bestLoss: number;
  bestAccuracy: number;
  genome: Float32Array;
  history: Array<{ iteration: number; loss: number; accuracy: number; bestLoss: number }>;
}

export interface GruEsTrainingStep {
  iteration: number;
  loss: number;
  accuracy: number;
  bestLoss: number;
  bestAccuracy: number;
  genome: Float32Array;
  done: boolean;
}

export function randomGruGenome(shape: GruShape, seed: string, std = 0.18): Float32Array {
  const rng = makeRng(`${seed}:gru-init`);
  const genome = new Float32Array(gruGenomeLength(shape));
  for (let index = 0; index < genome.length; index += 1) {
    genome[index] = gaussian(rng, 0, std);
  }
  return genome;
}

export function trainGruWithEs(
  dataset: TokenTaskDataset,
  config: GruEsTrainConfig,
  iterations: number
): GruEsTrainResult {
  const shape: GruShape = {
    vocabSize: dataset.vocab.length,
    hiddenSize: config.hiddenSize
  };
  const model = new GruModel(shape);
  const initial = randomGruGenome(shape, config.es.seed);
  const optimizer = new OpenAiEsOptimizer({
    ...config.es,
    dimensions: initial.length,
    initial
  });

  const history: GruEsTrainResult["history"] = [];
  const initialMetrics = model.evaluateDataset(initial, dataset);
  let bestMetrics = initialMetrics;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const step = optimizer.step((params) => -model.evaluateDataset(params, dataset).loss);
    const metrics = model.evaluateDataset(step.params, dataset);
    if (metrics.loss < bestMetrics.loss) {
      bestMetrics = metrics;
    }
    history.push({
      iteration: step.iteration,
      loss: metrics.loss,
      accuracy: metrics.accuracy,
      bestLoss: bestMetrics.loss
    });
  }

  const finalGenome = optimizer.snapshot().bestParams;
  const finalMetrics = model.evaluateDataset(finalGenome, dataset);

  return {
    initialLoss: initialMetrics.loss,
    initialAccuracy: initialMetrics.accuracy,
    finalLoss: finalMetrics.loss,
    finalAccuracy: finalMetrics.accuracy,
    bestLoss: Math.min(bestMetrics.loss, finalMetrics.loss),
    bestAccuracy: Math.max(bestMetrics.accuracy, finalMetrics.accuracy),
    genome: finalGenome,
    history
  };
}

export class GruEsTrainingSession {
  private readonly dataset: TokenTaskDataset;
  private readonly config: GruEsTrainConfig;
  private readonly model: GruModel;
  private readonly optimizer: OpenAiEsOptimizer;
  private maxIterations: number;
  private iteration = 0;
  private bestLoss = Number.POSITIVE_INFINITY;
  private bestAccuracy = 0;
  private lastGenome: Float32Array;
  private readonly initialMetrics: { loss: number; accuracy: number };

  constructor(dataset: TokenTaskDataset, config: GruEsTrainConfig, maxIterations: number) {
    this.dataset = dataset;
    this.config = config;
    this.maxIterations = maxIterations;
    const shape: GruShape = {
      vocabSize: dataset.vocab.length,
      hiddenSize: config.hiddenSize
    };
    this.model = new GruModel(shape);
    const initial = randomGruGenome(shape, config.es.seed);
    this.optimizer = new OpenAiEsOptimizer({
      ...config.es,
      dimensions: initial.length,
      initial
    });
    this.lastGenome = initial;
    this.initialMetrics = this.model.evaluateDataset(initial, dataset);
    this.bestLoss = this.initialMetrics.loss;
    this.bestAccuracy = this.initialMetrics.accuracy;
  }

  initial(): GruEsTrainingStep {
    return {
      iteration: 0,
      loss: this.initialMetrics.loss,
      accuracy: this.initialMetrics.accuracy,
      bestLoss: this.bestLoss,
      bestAccuracy: this.bestAccuracy,
      genome: this.lastGenome.slice(),
      done: this.maxIterations <= 0
    };
  }

  setMaxIterations(value: number) {
    this.maxIterations = Math.max(0, Math.round(value));
  }

  step(): GruEsTrainingStep {
    if (this.iteration >= this.maxIterations) {
      const metrics = this.model.evaluateDataset(this.optimizer.snapshot().bestParams, this.dataset);
      return {
        iteration: this.iteration,
        loss: metrics.loss,
        accuracy: metrics.accuracy,
        bestLoss: this.bestLoss,
        bestAccuracy: this.bestAccuracy,
        genome: this.optimizer.snapshot().bestParams.slice(),
        done: true
      };
    }

    const step = this.optimizer.step((params) => -this.model.evaluateDataset(params, this.dataset).loss);
    const metrics = this.model.evaluateDataset(this.optimizer.snapshot().bestParams, this.dataset);
    this.iteration = step.iteration;
    this.lastGenome = this.optimizer.snapshot().bestParams.slice();
    this.bestLoss = Math.min(this.bestLoss, metrics.loss);
    this.bestAccuracy = Math.max(this.bestAccuracy, metrics.accuracy);

    return {
      iteration: this.iteration,
      loss: metrics.loss,
      accuracy: metrics.accuracy,
      bestLoss: this.bestLoss,
      bestAccuracy: this.bestAccuracy,
      genome: this.lastGenome.slice(),
      done: this.iteration >= this.maxIterations
    };
  }
}
