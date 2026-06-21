import { gaussian, makeRng, type RNG } from "../rng.js";

export interface OpenAiEsConfig {
  seed: string;
  dimensions: number;
  sigma?: number;
  learningRate?: number;
  populationPairs?: number;
  momentum?: number;
  initial?: ArrayLike<number>;
  useCenteredRanks?: boolean;
}

export interface OpenAiEsStep {
  iteration: number;
  params: Float32Array;
  score: number;
  bestScore: number;
  gradientNorm: number;
}

export interface OpenAiEsState {
  iteration: number;
  params: Float32Array;
  velocity: Float32Array;
  bestScore: number;
  bestParams: Float32Array;
}

export class OpenAiEsOptimizer {
  private readonly rng: RNG;
  private readonly sigma: number;
  private readonly learningRate: number;
  private readonly populationPairs: number;
  private readonly momentum: number;
  private readonly useCenteredRanks: boolean;

  private iteration = 0;
  private params: Float32Array;
  private velocity: Float32Array;
  private bestScore = Number.NEGATIVE_INFINITY;
  private bestParams: Float32Array;

  constructor(config: OpenAiEsConfig) {
    if (!Number.isInteger(config.dimensions) || config.dimensions <= 0) {
      throw new Error(`OpenAiEsOptimizer requires a positive dimensions count; received ${config.dimensions}.`);
    }
    this.rng = makeRng(config.seed);
    this.sigma = config.sigma ?? 0.1;
    this.learningRate = config.learningRate ?? 0.03;
    this.populationPairs = config.populationPairs ?? 32;
    this.momentum = config.momentum ?? 0.9;
    this.useCenteredRanks = config.useCenteredRanks ?? true;
    this.params = new Float32Array(config.dimensions);
    if (config.initial) {
      for (let index = 0; index < Math.min(config.dimensions, config.initial.length); index += 1) {
        this.params[index] = config.initial[index] ?? 0;
      }
    }
    this.velocity = new Float32Array(config.dimensions);
    this.bestParams = this.params.slice();
  }

  snapshot(): OpenAiEsState {
    return {
      iteration: this.iteration,
      params: this.params.slice(),
      velocity: this.velocity.slice(),
      bestScore: this.bestScore,
      bestParams: this.bestParams.slice()
    };
  }

  step(evaluate: (params: Float32Array) => number): OpenAiEsStep {
    const noises: Float32Array[] = [];
    const scores = new Float64Array(this.populationPairs * 2);

    for (let pair = 0; pair < this.populationPairs; pair += 1) {
      const noise = new Float32Array(this.params.length);
      const positive = new Float32Array(this.params.length);
      const negative = new Float32Array(this.params.length);

      for (let index = 0; index < this.params.length; index += 1) {
        const sample = gaussian(this.rng);
        noise[index] = sample;
        positive[index] = this.params[index] + this.sigma * sample;
        negative[index] = this.params[index] - this.sigma * sample;
      }

      noises.push(noise);
      scores[pair * 2] = evaluate(positive);
      scores[pair * 2 + 1] = evaluate(negative);
    }

    const weights = this.useCenteredRanks ? centeredRanks(scores) : scores;
    const gradient = new Float32Array(this.params.length);

    for (let pair = 0; pair < this.populationPairs; pair += 1) {
      const positiveWeight = weights[pair * 2];
      const negativeWeight = weights[pair * 2 + 1];
      const advantage = positiveWeight - negativeWeight;
      const noise = noises[pair];
      for (let index = 0; index < gradient.length; index += 1) {
        gradient[index] += advantage * noise[index];
      }
    }

    const scale = 1 / (2 * this.populationPairs * this.sigma);
    let gradientNormSq = 0;
    for (let index = 0; index < gradient.length; index += 1) {
      gradient[index] *= scale;
      this.velocity[index] = this.velocity[index] * this.momentum + this.learningRate * gradient[index];
      this.params[index] += this.velocity[index];
      gradientNormSq += gradient[index] * gradient[index];
    }

    const score = evaluate(this.params);
    if (score > this.bestScore) {
      this.bestScore = score;
      this.bestParams = this.params.slice();
    }
    this.iteration += 1;

    return {
      iteration: this.iteration,
      params: this.params.slice(),
      score,
      bestScore: this.bestScore,
      gradientNorm: Math.sqrt(gradientNormSq)
    };
  }
}

export function centeredRanks(values: ArrayLike<number>): Float64Array {
  const pairs = Array.from({ length: values.length }, (_, index) => ({
    index,
    value: values[index] ?? 0
  })).sort((left, right) => left.value - right.value);

  const ranks = new Float64Array(values.length);
  const denom = Math.max(1, values.length - 1);
  for (let rank = 0; rank < pairs.length; rank += 1) {
    ranks[pairs[rank].index] = rank / denom - 0.5;
  }
  return ranks;
}
