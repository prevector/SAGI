import { centeredRanks } from "./openaiEs.js";
import { footballGenomeLength, runFootballTournament, simulateFootballMatch, type FootballMatchResult, type FootballTaskConfig } from "./footballTask.js";
import { gaussian, makeRng, type RNG } from "../rng.js";

export interface FootballEsConfig {
  seed: string;
  hiddenSize: number;
  sigma?: number;
  learningRate?: number;
  populationPairs?: number;
  momentum?: number;
  initial?: ArrayLike<number>;
  football?: FootballTaskConfig;
}

export interface FootballEsTrainingStep {
  iteration: number;
  score: number;
  bestScore: number;
  goals: [number, number];
  possession: [number, number];
  collisions: [number, number];
  genome: Float32Array;
  preview: FootballMatchResult;
  done: boolean;
}

export interface FootballTrainingHistoryPoint {
  iteration: number;
  score: number;
  bestScore: number;
}

export function randomFootballGenome(hiddenSize: number, seed: string, std = 0.18): Float32Array {
  const rng = makeRng(`${seed}:football-init`);
  const genome = new Float32Array(footballGenomeLength(hiddenSize));
  for (let index = 0; index < genome.length; index += 1) {
    genome[index] = gaussian(rng, 0, std);
  }
  return genome;
}

export class FootballEsTrainingSession {
  private readonly rng: RNG;
  private readonly hiddenSize: number;
  private readonly sigma: number;
  private readonly learningRate: number;
  private readonly populationPairs: number;
  private readonly momentum: number;
  private readonly football: FootballTaskConfig;
  private maxIterations: number;

  private iteration = 0;
  private params: Float32Array;
  private velocity: Float32Array;
  private bestScore = Number.NEGATIVE_INFINITY;
  private bestParams: Float32Array;
  private bestPreview: FootballMatchResult;

  constructor(config: FootballEsConfig, maxIterations: number) {
    this.rng = makeRng(`${config.seed}:football-es`);
    this.hiddenSize = config.hiddenSize;
    this.sigma = config.sigma ?? 0.08;
    this.learningRate = config.learningRate ?? 0.03;
    this.populationPairs = config.populationPairs ?? 16;
    this.momentum = config.momentum ?? 0.9;
    this.football = config.football ?? { seed: `${config.seed}:football-task` };
    this.maxIterations = maxIterations;

    this.params = config.initial
      ? Float32Array.from(config.initial)
      : randomFootballGenome(config.hiddenSize, config.seed);
    this.velocity = new Float32Array(this.params.length);
    this.bestParams = this.params.slice();
    this.bestPreview = simulateFootballMatch(
      this.bestParams,
      this.bestParams.map((value, index) => value * (index % 2 === 0 ? -0.4 : 0.4)),
      this.hiddenSize,
      this.football
    );
    this.bestScore = this.bestPreview.fitness[0];
  }

  initial(): FootballEsTrainingStep {
    return {
      iteration: 0,
      score: this.bestPreview.fitness[0],
      bestScore: this.bestScore,
      goals: this.bestPreview.score,
      possession: this.bestPreview.possessionTicks,
      collisions: this.bestPreview.collisions,
      genome: this.params.slice(),
      preview: this.bestPreview,
      done: this.maxIterations <= 0
    };
  }

  setMaxIterations(value: number) {
    this.maxIterations = Math.max(0, Math.round(value));
  }

  step(): FootballEsTrainingStep {
    if (this.iteration >= this.maxIterations) {
      return {
        iteration: this.iteration,
        score: this.bestScore,
        bestScore: this.bestScore,
        goals: this.bestPreview.score,
        possession: this.bestPreview.possessionTicks,
        collisions: this.bestPreview.collisions,
        genome: this.bestParams.slice(),
        preview: this.bestPreview,
        done: true
      };
    }

    const candidates: Float32Array[] = [];
    const noises: Float32Array[] = [];

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
      candidates.push(positive, negative);
    }

    const tournament = runFootballTournament(candidates, this.hiddenSize, {
      ...this.football,
      seed: `${this.football.seed ?? "football"}:${this.iteration}`
    });
    const weights = centeredRanks(tournament.scores);
    const gradient = new Float32Array(this.params.length);
    for (let pair = 0; pair < this.populationPairs; pair += 1) {
      const advantage = weights[pair * 2] - weights[pair * 2 + 1];
      const noise = noises[pair]!;
      for (let index = 0; index < gradient.length; index += 1) {
        gradient[index] += advantage * noise[index];
      }
    }

    const scale = 1 / (2 * this.populationPairs * this.sigma);
    for (let index = 0; index < gradient.length; index += 1) {
      gradient[index] *= scale;
      this.velocity[index] = this.velocity[index] * this.momentum + this.learningRate * gradient[index];
      this.params[index] += this.velocity[index];
    }

    const championGenome = candidates[tournament.championIndex] ?? this.params;
    const championScore = tournament.scores[tournament.championIndex] ?? Number.NEGATIVE_INFINITY;
    this.iteration += 1;

    if (championScore >= this.bestScore) {
      this.bestScore = championScore;
      this.bestParams = championGenome.slice();
      this.bestPreview = tournament.preview;
    }

    return {
      iteration: this.iteration,
      score: championScore,
      bestScore: this.bestScore,
      goals: tournament.preview.score,
      possession: tournament.preview.possessionTicks,
      collisions: tournament.preview.collisions,
      genome: this.bestParams.slice(),
      preview: this.bestPreview,
      done: this.iteration >= this.maxIterations
    };
  }
}
