import { DEFAULT_GA_CONFIG, type GaConfig } from "./config.js";
import { makeRng, type RNG } from "./rng.js";

export type IafTask = "iaf" | "potential";

export interface EnuArchitectureGene {
  neuronStateSize: number;
  synapseStateSize: number;
  inputChannels: number;
  outputChannels: number;
  outputGain: number;
}

export interface EvolutionGene {
  id: string;
  name: string;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
  architecture: EnuArchitectureGene;
  weights: number[];
  notes?: string;
}

export interface IafRunConfig {
  seed: string;
  task: IafTask;
  sequenceLength: number;
  environments: number;
}

export interface EsHyperparams {
  generations: number;
  populationPairs: number;
  sigma: number;
  learningRate: number;
  momentum: number;
}

export interface IafTrace {
  inputs: number[];
  targetSpikes: number[];
  targetPotential: number[];
  outputs: number[];
}

export interface IafEvaluation {
  fitness: number;
  loss: number;
  targetSpikes: number;
  predictedSpikes: number;
  spikeCountError: number;
  trace: IafTrace;
}

export interface TrainingGeneration extends IafEvaluation {
  generation: number;
}

export interface TrainGeneResult {
  gene: EvolutionGene;
  initial: IafEvaluation;
  best: IafEvaluation;
  history: TrainingGeneration[];
}

export interface IafTrainingSnapshot {
  generation: number;
  targetGenerations: number;
  gene: EvolutionGene;
  initial: IafEvaluation;
  current: IafEvaluation;
  best: IafEvaluation;
  history: TrainingGeneration[];
  done: boolean;
}

const DEFAULT_ARCHITECTURE: EnuArchitectureGene = {
  neuronStateSize: 8,
  synapseStateSize: 0,
  inputChannels: 1,
  outputChannels: 1,
  outputGain: 1000
};

export const DEFAULT_IAF_RUN_CONFIG: IafRunConfig = {
  seed: "local-lab",
  task: "iaf",
  sequenceLength: 100,
  environments: 8
};

export const DEFAULT_ES_HYPERPARAMS: EsHyperparams = {
  generations: 40,
  populationPairs: 24,
  sigma: 0.03,
  learningRate: 1,
  momentum: 0.9
};

interface IafSequence {
  inputs: Float32Array;
  spikes: Uint8Array;
  potentials: Float32Array;
}

export function iafGenomeLength(architecture: EnuArchitectureGene): number {
  const stateSize = architecture.neuronStateSize;
  const recurrentInput = stateSize + architecture.inputChannels + architecture.outputChannels + 1;
  return 3 * stateSize * recurrentInput + architecture.outputChannels * (stateSize + 1);
}

export function createRandomGene(
  rng: RNG = makeRng("gene"),
  init: Partial<Pick<EvolutionGene, "id" | "name" | "notes">> & {
    architecture?: Partial<EnuArchitectureGene>;
  } = {}
): EvolutionGene {
  const architecture = { ...DEFAULT_ARCHITECTURE, ...init.architecture };
  const now = new Date().toISOString();
  const weights = new Array<number>(iafGenomeLength(architecture));
  fillOrthonormalRows(weights, architecture, rng);
  return {
    id: init.id ?? `gene-${Math.floor(rng() * 1_000_000_000).toString(36)}`,
    name: init.name ?? "Untitled gene",
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    architecture,
    weights,
    notes: init.notes
  };
}

export function resizeGeneArchitecture(
  gene: EvolutionGene,
  architecturePatch: Partial<EnuArchitectureGene>,
  rng: RNG = makeRng(`${gene.id}:resize`)
): EvolutionGene {
  const architecture = { ...gene.architecture, ...architecturePatch };
  const nextLength = iafGenomeLength(architecture);
  const next = createRandomGene(rng, {
    id: gene.id,
    name: gene.name,
    notes: gene.notes,
    architecture
  });
  next.createdAt = gene.createdAt;
  next.updatedAt = new Date().toISOString();
  for (let index = 0; index < Math.min(gene.weights.length, nextLength); index += 1) {
    next.weights[index] = gene.weights[index];
  }
  return next;
}

export function normalizeGene(gene: EvolutionGene): EvolutionGene {
  const architecture = { ...DEFAULT_ARCHITECTURE, ...gene.architecture };
  const expected = iafGenomeLength(architecture);
  const weights = gene.weights.slice(0, expected);
  while (weights.length < expected) {
    weights.push(0);
  }
  return {
    ...gene,
    architecture,
    weights,
    updatedAt: gene.updatedAt || new Date().toISOString()
  };
}

export function runGeneOnIaf(gene: EvolutionGene, config: IafRunConfig): IafEvaluation {
  const normalized = normalizeGene(gene);
  const sequences = buildSequences(config);
  return evaluateWeights(normalized.architecture, normalized.weights, config.task, sequences);
}

export function trainGeneOnIaf(
  gene: EvolutionGene,
  config: IafRunConfig,
  hyperparams: EsHyperparams
): TrainGeneResult {
  const session = createIafTrainingSession(gene, config, hyperparams);
  let snapshot = session.snapshot(hyperparams);
  while (!snapshot.done) {
    snapshot = session.step(hyperparams);
  }
  return {
    gene: snapshot.gene,
    initial: snapshot.initial,
    best: snapshot.best,
    history: snapshot.history
  };
}

export class IafTrainingSession {
  private readonly normalized: EvolutionGene;
  private readonly rng: RNG;
  private readonly velocity: Float32Array;
  private readonly validationSequences: IafSequence[];
  private readonly initial: IafEvaluation;
  private readonly history: TrainingGeneration[];
  private center: Float32Array;
  private generation = 0;
  private current: IafEvaluation;
  private best: IafEvaluation;
  private bestWeights: number[];

  constructor(gene: EvolutionGene, private readonly config: IafRunConfig) {
    this.normalized = normalizeGene(gene);
    this.rng = makeRng(`${config.seed}:es:${this.normalized.id}`);
    this.center = Float32Array.from(this.normalized.weights);
    this.velocity = new Float32Array(this.center.length);
    this.validationSequences = buildSequences(config);
    this.initial = evaluateWeights(
      this.normalized.architecture,
      Array.from(this.center),
      config.task,
      this.validationSequences
    );
    this.current = this.initial;
    this.best = this.initial;
    this.bestWeights = Array.from(this.center);
    this.history = [{ generation: 0, ...this.initial }];
  }

  step(hyperparams: EsHyperparams): IafTrainingSnapshot {
    const targetGenerations = clampInteger(hyperparams.generations, 1, 10_000);
    if (this.generation >= targetGenerations) {
      return this.snapshot(hyperparams);
    }

    const generation = this.generation + 1;
    const populationPairs = clampInteger(hyperparams.populationPairs, 1, 10_000);
    const sigma = Math.max(1e-7, hyperparams.sigma);
    const learningRate = Number.isFinite(hyperparams.learningRate) ? hyperparams.learningRate : 1;
    const momentum = Math.max(0, Math.min(0.999, hyperparams.momentum));
    const trainingSequences = buildSequences({
      ...this.config,
      seed: `${this.config.seed}:generation:${generation}`
    });
    const deltas: Float32Array[] = [];
    const fitnesses: number[] = [];

    for (let pair = 0; pair < populationPairs; pair += 1) {
      const delta = new Float32Array(this.center.length);
      for (let index = 0; index < delta.length; index += 1) {
        delta[index] = gaussian(this.rng);
      }
      deltas.push(delta);
      fitnesses.push(
        evaluateCandidate(this.normalized.architecture, this.center, delta, sigma, this.config.task, trainingSequences),
        evaluateCandidate(this.normalized.architecture, this.center, delta, -sigma, this.config.task, trainingSequences)
      );
    }

    const weights = rankWeights(fitnesses);
    const gradient = new Float32Array(this.center.length);
    for (let pair = 0; pair < populationPairs; pair += 1) {
      const scale = sigma * (weights[pair * 2] - weights[pair * 2 + 1]);
      for (let index = 0; index < gradient.length; index += 1) {
        gradient[index] += deltas[pair][index] * scale;
      }
    }
    for (let index = 0; index < this.center.length; index += 1) {
      this.velocity[index] = momentum * this.velocity[index] + learningRate * gradient[index];
      this.center[index] += this.velocity[index];
    }

    const evaluation = evaluateWeights(
      this.normalized.architecture,
      Array.from(this.center),
      this.config.task,
      this.validationSequences
    );
    this.generation = generation;
    this.current = evaluation;
    this.history.push({ generation, ...evaluation });
    if (evaluation.fitness > this.best.fitness) {
      this.best = evaluation;
      this.bestWeights = Array.from(this.center);
    }
    return this.snapshot(hyperparams);
  }

  snapshot(hyperparams: EsHyperparams): IafTrainingSnapshot {
    const targetGenerations = clampInteger(hyperparams.generations, 1, 10_000);
    return {
      generation: this.generation,
      targetGenerations,
      gene: {
        ...this.normalized,
        weights: this.bestWeights.slice(),
        updatedAt: new Date().toISOString()
      },
      initial: this.initial,
      current: this.current,
      best: this.best,
      history: this.history.slice(),
      done: this.generation >= targetGenerations
    };
  }
}

export function createIafTrainingSession(
  gene: EvolutionGene,
  config: IafRunConfig,
  hyperparams: EsHyperparams
): IafTrainingSession {
  const session = new IafTrainingSession(gene, config);
  session.snapshot(hyperparams);
  return session;
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function fillOrthonormalRows(
  weights: number[],
  architecture: EnuArchitectureGene,
  rng: RNG
): void {
  const stateSize = architecture.neuronStateSize;
  const recurrentInput = stateSize + architecture.inputChannels + architecture.outputChannels + 1;
  let offset = 0;
  for (let block = 0; block < 3; block += 1) {
    offset = fillRows(weights, offset, stateSize, recurrentInput, rng);
  }
  fillRows(weights, offset, architecture.outputChannels, stateSize + 1, rng);
}

function fillRows(weights: number[], offset: number, rows: number, cols: number, rng: RNG): number {
  for (let row = 0; row < rows; row += 1) {
    const rowOffset = offset + row * cols;
    for (let col = 0; col < cols - 1; col += 1) {
      weights[rowOffset + col] = gaussian(rng);
    }
    let norm = 0;
    for (let col = 0; col < cols - 1; col += 1) {
      norm += weights[rowOffset + col] ** 2;
    }
    const scale = 1 / Math.sqrt(norm || 1);
    for (let col = 0; col < cols - 1; col += 1) {
      weights[rowOffset + col] *= scale;
    }
    weights[rowOffset + cols - 1] = 0;
  }
  return offset + rows * cols;
}

function gaussian(rng: RNG): number {
  const u1 = Math.max(rng(), 1e-7);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function buildSequences(config: IafRunConfig): IafSequence[] {
  const rng = makeRng(config.seed);
  const sequences: IafSequence[] = [];
  for (let env = 0; env < config.environments; env += 1) {
    const inputs = new Float32Array(config.sequenceLength);
    const spikes = new Uint8Array(config.sequenceLength);
    const potentials = new Float32Array(config.sequenceLength);
    const quarterLength = Math.max(1, Math.floor(config.sequenceLength / 4));
    const scales = Array.from({ length: 4 }, () => 1 + Math.floor(rng() * 9));
    let potential = 0;
    for (let step = 1; step < config.sequenceLength; step += 1) {
      const quarter = Math.min(3, Math.floor((step - 1) / quarterLength));
      inputs[step] = (0.01 + rng() * 0.01) * scales[quarter];
      potential += inputs[step];
      potentials[step] = Math.min(potential / 0.5, 1);
      if (potential > 0.5) {
        spikes[step] = 1;
        potential = 0;
      }
    }
    sequences.push({ inputs, spikes, potentials });
  }
  return sequences;
}

function evaluateCandidate(
  architecture: EnuArchitectureGene,
  center: Float32Array,
  delta: Float32Array,
  sigma: number,
  task: IafTask,
  sequences: IafSequence[]
): number {
  const candidate = new Array<number>(center.length);
  for (let index = 0; index < center.length; index += 1) {
    candidate[index] = center[index] + sigma * delta[index];
  }
  return evaluateWeights(architecture, candidate, task, sequences).fitness;
}

function evaluateWeights(
  architecture: EnuArchitectureGene,
  weights: number[],
  task: IafTask,
  sequences: IafSequence[]
): IafEvaluation {
  let totalLoss = 0;
  let targetSpikes = 0;
  let predictedSpikes = 0;
  let trace: IafTrace | null = null;

  for (const sequence of sequences) {
    const memory = new Float32Array(architecture.neuronStateSize);
    const outputs = new Float32Array(sequence.inputs.length);
    let previousOutput = 0;
    for (let step = 0; step < sequence.inputs.length; step += 1) {
      previousOutput = stepEnu(architecture, weights, memory, previousOutput, sequence.inputs[step]);
      outputs[step] = previousOutput;
    }
    const score = task === "iaf" ? scoreSpikeTask(sequence, outputs) : scorePotentialTask(sequence, outputs);
    totalLoss += score.loss;
    targetSpikes += score.targetSpikes;
    predictedSpikes += score.predictedSpikes;
    if (!trace) {
      trace = {
        inputs: Array.from(sequence.inputs),
        targetSpikes: Array.from(sequence.spikes),
        targetPotential: Array.from(sequence.potentials),
        outputs: Array.from(outputs)
      };
    }
  }

  const loss = totalLoss / (sequences.length * sequences[0].inputs.length);
  return {
    fitness: -loss,
    loss,
    targetSpikes,
    predictedSpikes,
    spikeCountError: Math.abs(targetSpikes - predictedSpikes) / Math.max(targetSpikes, 1),
    trace: trace!
  };
}

function stepEnu(
  architecture: EnuArchitectureGene,
  weights: number[],
  memory: Float32Array,
  previousOutput: number,
  inputValue: number
): number {
  const stateSize = architecture.neuronStateSize;
  const recurrentInput = stateSize + architecture.inputChannels + architecture.outputChannels + 1;
  const input = new Float32Array(recurrentInput);
  input[0] = inputValue;
  input[architecture.inputChannels] = previousOutput;
  input.set(memory, architecture.inputChannels + architecture.outputChannels);
  input[input.length - 1] = 1;

  const wzOffset = 0;
  const wrOffset = stateSize * recurrentInput;
  const wcOffset = 2 * stateSize * recurrentInput;
  const woOffset = 3 * stateSize * recurrentInput;
  const reset = new Float32Array(stateSize);
  const update = new Float32Array(stateSize);

  for (let index = 0; index < stateSize; index += 1) {
    update[index] = sigmoid3(dot(weights, wzOffset + index * recurrentInput, input));
    reset[index] = sigmoid3(dot(weights, wrOffset + index * recurrentInput, input) - 1);
  }

  const candidateInput = input.slice();
  for (let index = 0; index < stateSize; index += 1) {
    candidateInput[architecture.inputChannels + architecture.outputChannels + index] =
      memory[index] * reset[index];
  }

  for (let index = 0; index < stateSize; index += 1) {
    const candidate = Math.tanh(3 * dot(weights, wcOffset + index * recurrentInput, candidateInput));
    memory[index] = (1 - update[index]) * memory[index] + update[index] * candidate;
  }

  let output = weights[woOffset + stateSize];
  for (let index = 0; index < stateSize; index += 1) {
    output += weights[woOffset + index] * memory[index];
  }
  return Math.max(0, Math.min(1, architecture.outputGain * output));
}

function dot(weights: number[], offset: number, input: Float32Array): number {
  let sum = 0;
  for (let index = 0; index < input.length; index += 1) {
    sum += weights[offset + index] * input[index];
  }
  return sum;
}

function sigmoid3(value: number): number {
  return 1 / (1 + Math.exp(-3 * value));
}

function scoreSpikeTask(sequence: IafSequence, outputs: Float32Array) {
  let targetTimer = 0;
  let predictedTimer = 0;
  let targetSpikes = 0;
  let predictedSpikes = 0;
  let loss = 0;
  for (let step = 0; step < outputs.length; step += 1) {
    const targetSpike = sequence.spikes[step] > 0;
    const predictedSpike = outputs[step] > 0.05;
    targetTimer = targetSpike ? 0 : targetTimer + 1;
    predictedTimer = predictedSpike ? 0 : predictedTimer + 1;
    if (targetSpike) targetSpikes += 1;
    if (predictedSpike) predictedSpikes += 1;
    const timingError = targetTimer - predictedTimer;
    loss += timingError * timingError + (predictedSpike ? (outputs[step] - 1) ** 2 : 0);
  }
  return { loss, targetSpikes, predictedSpikes };
}

function scorePotentialTask(sequence: IafSequence, outputs: Float32Array) {
  let loss = 0;
  for (let step = 0; step < outputs.length; step += 1) {
    loss += (outputs[step] - sequence.potentials[step]) ** 2;
  }
  return { loss, targetSpikes: 0, predictedSpikes: 0 };
}

function rankWeights(fitnesses: number[]): number[] {
  const sorted = fitnesses.map((fitness, index) => ({ fitness, index }));
  sorted.sort((a, b) => a.fitness - b.fitness);
  const weights = new Array<number>(fitnesses.length).fill(0);
  let total = 0;
  for (let rank = 0; rank < sorted.length; rank += 1) {
    const weight = (rank / sorted.length) ** 5;
    weights[sorted[rank].index] = weight;
    total += weight;
  }
  return weights.map((weight) => weight / (total || 1));
}

export function gaConfigToEsHyperparams(config: Partial<GaConfig> = {}): EsHyperparams {
  const ga = { ...DEFAULT_GA_CONFIG, ...config };
  return {
    generations: ga.maxGenerations,
    populationPairs: Math.max(2, Math.floor(ga.populationSize / 2)),
    sigma: ga.mutationStd,
    learningRate: 1,
    momentum: 0.9
  };
}
