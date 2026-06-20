import fs from "node:fs";
import path from "node:path";

interface ExperimentConfig {
  sequenceLength: number;
  environments: number;
  generations: number;
  populationPairs: number;
  sigma: number;
  learningRate: number;
  memorySize: number;
  outputChannels: number;
  inputChannels: number;
  threshold: number;
  inputScale: number;
  spikeThreshold: number;
  seed: number;
  logEvery: number;
  runName: string;
}

interface EvaluationResult {
  fitness: number;
  intervalError: number;
  countError: number;
  intensityError: number;
  firstOutputs: number[];
}

const DEFAULT_CONFIG: ExperimentConfig = {
  sequenceLength: 100,
  environments: 8,
  generations: 60,
  populationPairs: 12,
  sigma: 0.05,
  learningRate: 0.03,
  memorySize: 32,
  outputChannels: 16,
  inputChannels: 1,
  threshold: 1,
  inputScale: 0.35,
  spikeThreshold: 0.7,
  seed: 7,
  logEvery: 5,
  runName: "local_smoke"
};

const RUNS_ROOT = path.resolve("runs", "enu_iaf_benchmark");

function parseArgs(): ExperimentConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    const value = args[index + 1];

    if (!key.startsWith("--") || value === undefined) {
      continue;
    }

    switch (key) {
      case "--sequence-length":
        config.sequenceLength = Number(value);
        index += 1;
        break;
      case "--environments":
        config.environments = Number(value);
        index += 1;
        break;
      case "--generations":
        config.generations = Number(value);
        index += 1;
        break;
      case "--population-pairs":
        config.populationPairs = Number(value);
        index += 1;
        break;
      case "--sigma":
        config.sigma = Number(value);
        index += 1;
        break;
      case "--learning-rate":
        config.learningRate = Number(value);
        index += 1;
        break;
      case "--threshold":
        config.threshold = Number(value);
        index += 1;
        break;
      case "--input-scale":
        config.inputScale = Number(value);
        index += 1;
        break;
      case "--spike-threshold":
        config.spikeThreshold = Number(value);
        index += 1;
        break;
      case "--seed":
        config.seed = Number(value);
        index += 1;
        break;
      case "--log-every":
        config.logEvery = Number(value);
        index += 1;
        break;
      case "--run-name":
        config.runName = value;
        index += 1;
        break;
      default:
        break;
    }
  }

  return config;
}

class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  normal(): number {
    const u1 = Math.max(this.next(), 1e-7);
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function clip01(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function centeredRanks(values: number[]): number[] {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((left, right) => left.value - right.value);

  const ranks = new Array<number>(values.length);
  const denom = Math.max(values.length - 1, 1);

  indexed.forEach((entry, rank) => {
    ranks[entry.index] = rank / denom - 0.5;
  });

  return ranks;
}

function dotMatrixVector(
  matrix: Float32Array,
  rows: number,
  cols: number,
  vector: Float32Array,
  offset: number,
  target: Float32Array,
  activation: "sigmoid" | "tanh" | "linear"
): void {
  for (let row = 0; row < rows; row += 1) {
    let sum = 0;
    const rowOffset = offset + row * cols;
    for (let col = 0; col < cols; col += 1) {
      sum += matrix[rowOffset + col] * vector[col];
    }

    if (activation === "sigmoid") {
      target[row] = sigmoid(sum);
    } else if (activation === "tanh") {
      target[row] = Math.tanh(sum);
    } else {
      target[row] = sum;
    }
  }
}

function genomeSize(config: ExperimentConfig): number {
  const concat = config.memorySize + config.outputChannels + config.inputChannels;
  return (3 * config.memorySize * concat) + (config.outputChannels * config.memorySize);
}

function initGenome(config: ExperimentConfig, rng: Rng): Float32Array {
  const size = genomeSize(config);
  const concat = config.memorySize + config.outputChannels + config.inputChannels;
  const genome = new Float32Array(size);

  for (let index = 0; index < size; index += 1) {
    genome[index] = rng.normal() * (1 / Math.sqrt(concat));
  }

  return genome;
}

function buildInputVector(
  memory: Float32Array,
  previousOutput: Float32Array,
  inputValue: number
): Float32Array {
  const vector = new Float32Array(memory.length + previousOutput.length + 1);
  vector.set(memory, 0);
  vector.set(previousOutput, memory.length);
  vector[vector.length - 1] = inputValue;
  return vector;
}

function stepEnu(
  genome: Float32Array,
  config: ExperimentConfig,
  memory: Float32Array,
  previousOutput: Float32Array,
  inputValue: number
): { nextMemory: Float32Array; nextOutput: Float32Array } {
  const concat = buildInputVector(memory, previousOutput, inputValue);
  const stateSize = config.memorySize;
  const outputSize = config.outputChannels;
  const concatSize = concat.length;

  const z = new Float32Array(stateSize);
  const r = new Float32Array(stateSize);
  const candidate = new Float32Array(stateSize);
  const resetConcat = new Float32Array(concatSize);

  const wzOffset = 0;
  const wrOffset = stateSize * concatSize;
  const wcOffset = 2 * stateSize * concatSize;
  const woOffset = 3 * stateSize * concatSize;

  dotMatrixVector(genome, stateSize, concatSize, concat, wzOffset, z, "sigmoid");
  dotMatrixVector(genome, stateSize, concatSize, concat, wrOffset, r, "sigmoid");

  for (let index = 0; index < stateSize; index += 1) {
    resetConcat[index] = r[index] * memory[index];
  }
  resetConcat.set(previousOutput, stateSize);
  resetConcat[resetConcat.length - 1] = inputValue;

  dotMatrixVector(genome, stateSize, concatSize, resetConcat, wcOffset, candidate, "tanh");

  const nextMemory = new Float32Array(stateSize);
  for (let index = 0; index < stateSize; index += 1) {
    nextMemory[index] = ((1 - z[index]) * memory[index]) + (z[index] * candidate[index]);
  }

  const rawOutput = new Float32Array(outputSize);
  dotMatrixVector(genome, outputSize, stateSize, nextMemory, woOffset, rawOutput, "linear");

  const nextOutput = new Float32Array(outputSize);
  for (let index = 0; index < outputSize; index += 1) {
    nextOutput[index] = clip01(rawOutput[index]);
  }

  return { nextMemory, nextOutput };
}

function buildTargetSequence(config: ExperimentConfig, rng: Rng): {
  inputs: number[];
  spikes: number[];
  targetPositions: number[];
} {
  let potential = 0;
  const inputs: number[] = [];
  const spikes: number[] = [];
  const targetPositions: number[] = [];

  for (let step = 0; step < config.sequenceLength; step += 1) {
    const input = rng.next() * config.inputScale;
    inputs.push(input);
    potential += input;

    if (potential >= config.threshold) {
      spikes.push(1);
      targetPositions.push(step);
      potential = 0;
    } else {
      spikes.push(0);
    }
  }

  return { inputs, spikes, targetPositions };
}

function detectSpikePositions(outputs: number[], threshold: number): number[] {
  const positions: number[] = [];

  for (let step = 0; step < outputs.length; step += 1) {
    if (outputs[step] >= threshold) {
      positions.push(step);
    }
  }

  return positions;
}

function intervalError(targetPositions: number[], predictedPositions: number[], sequenceLength: number): number {
  const targetIntervals = targetPositions.slice(1).map((value, index) => value - targetPositions[index]);
  const predictedIntervals = predictedPositions.slice(1).map((value, index) => value - predictedPositions[index]);

  if (targetIntervals.length === 0 && predictedIntervals.length === 0) {
    return 0;
  }

  if (targetIntervals.length === 0 || predictedIntervals.length === 0) {
    return 1;
  }

  const length = Math.min(targetIntervals.length, predictedIntervals.length);
  let error = 0;
  for (let index = 0; index < length; index += 1) {
    error += Math.abs(targetIntervals[index] - predictedIntervals[index]) / sequenceLength;
  }

  error /= length;
  error += Math.abs(targetIntervals.length - predictedIntervals.length) / Math.max(targetIntervals.length, 1);
  return error;
}

function evaluateGenome(config: ExperimentConfig, genome: Float32Array, seed: number): EvaluationResult {
  const rng = new Rng(seed);
  let totalIntervalError = 0;
  let totalCountError = 0;
  let totalIntensityError = 0;
  let firstOutputs: number[] = [];

  for (let envIndex = 0; envIndex < config.environments; envIndex += 1) {
    const sequence = buildTargetSequence(config, rng);
    let memory = new Float32Array(config.memorySize);
    let output = new Float32Array(config.outputChannels);
    const spikeOutputs: number[] = [];

    for (let step = 0; step < config.sequenceLength; step += 1) {
      const next = stepEnu(genome, config, memory, output, sequence.inputs[step]);
      memory = next.nextMemory;
      output = next.nextOutput;
      spikeOutputs.push(output[0]);
    }

    if (envIndex === 0) {
      firstOutputs = spikeOutputs.slice(0, 24);
    }

    const predictedPositions = detectSpikePositions(spikeOutputs, config.spikeThreshold);
    const intervals = intervalError(sequence.targetPositions, predictedPositions, config.sequenceLength);
    const count = Math.abs(predictedPositions.length - sequence.targetPositions.length) / config.sequenceLength;

    let intensity = 1;
    if (predictedPositions.length > 0) {
      let acc = 0;
      for (const position of predictedPositions) {
        acc += Math.abs(1 - spikeOutputs[position]);
      }
      intensity = acc / predictedPositions.length;
    }

    totalIntervalError += intervals;
    totalCountError += count;
    totalIntensityError += intensity;
  }

  const envCount = config.environments;
  const avgIntervalError = totalIntervalError / envCount;
  const avgCountError = totalCountError / envCount;
  const avgIntensityError = totalIntensityError / envCount;

  const fitness = -(avgIntervalError * 2.5 + avgCountError * 1.5 + avgIntensityError);

  return {
    fitness,
    intervalError: avgIntervalError,
    countError: avgCountError,
    intensityError: avgIntensityError,
    firstOutputs
  };
}

function addScaled(target: Float32Array, source: Float32Array, scalar: number): void {
  for (let index = 0; index < target.length; index += 1) {
    target[index] += source[index] * scalar;
  }
}

function writeRunSummary(config: ExperimentConfig, summary: Record<string, unknown>): void {
  const runDir = path.join(RUNS_ROOT, config.runName);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
}

function main(): void {
  const config = parseArgs();
  const rng = new Rng(config.seed);
  const center = initGenome(config, rng);
  let bestFitness = Number.NEGATIVE_INFINITY;
  let bestGenome = new Float32Array(center);
  let bestEval = evaluateGenome(config, center, config.seed + 10_000);

  for (let generation = 1; generation <= config.generations; generation += 1) {
    const perturbations: Float32Array[] = [];
    const fitnesses: number[] = [];
    const candidates: Float32Array[] = [];

    for (let pair = 0; pair < config.populationPairs; pair += 1) {
      const delta = new Float32Array(center.length);
      for (let index = 0; index < delta.length; index += 1) {
        delta[index] = rng.normal();
      }

      const plus = new Float32Array(center.length);
      const minus = new Float32Array(center.length);
      for (let index = 0; index < center.length; index += 1) {
        plus[index] = center[index] + (config.sigma * delta[index]);
        minus[index] = center[index] - (config.sigma * delta[index]);
      }

      perturbations.push(delta);
      candidates.push(plus, minus);
    }

    for (let index = 0; index < candidates.length; index += 1) {
      const evaluation = evaluateGenome(config, candidates[index], config.seed + generation * 1_000 + index);
      fitnesses.push(evaluation.fitness);
      if (evaluation.fitness > bestFitness) {
        bestFitness = evaluation.fitness;
        bestGenome = new Float32Array(candidates[index]);
        bestEval = evaluation;
      }
    }

    const shaped = centeredRanks(fitnesses);
    const gradient = new Float32Array(center.length);

    for (let pair = 0; pair < config.populationPairs; pair += 1) {
      const plusRank = shaped[pair * 2];
      const minusRank = shaped[pair * 2 + 1];
      addScaled(gradient, perturbations[pair], plusRank - minusRank);
    }

    const scale = 1 / (2 * config.populationPairs * config.sigma);
    for (let index = 0; index < center.length; index += 1) {
      center[index] += config.learningRate * gradient[index] * scale;
    }

    if (generation % config.logEvery === 0 || generation === 1 || generation === config.generations) {
      const centerEval = evaluateGenome(config, center, config.seed + 200_000 + generation);
      console.log(
        JSON.stringify({
          generation,
          bestFitness: Number(bestFitness.toFixed(4)),
          centerFitness: Number(centerEval.fitness.toFixed(4)),
          intervalError: Number(centerEval.intervalError.toFixed(4)),
          countError: Number(centerEval.countError.toFixed(4)),
          intensityError: Number(centerEval.intensityError.toFixed(4)),
          firstOutputs: centerEval.firstOutputs.map((value) => Number(value.toFixed(3)))
        })
      );
    }
  }

  writeRunSummary(config, {
    config,
    bestFitness,
    bestEvaluation: bestEval,
    genomeSize: center.length,
    note: "This is a local smoke-scale IAF benchmark, not the full paper-scale reproduction."
  });

  console.log(`saved runs/enu_iaf_benchmark/${config.runName}/summary.json`);
  console.log(`bestFitness=${bestFitness.toFixed(4)}`);
  console.log(`genomeSize=${center.length}`);
  console.log(`bestOutputs=${bestEval.firstOutputs.map((value) => value.toFixed(3)).join(",")}`);
  void bestGenome;
}

main();
