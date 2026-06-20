import fs from "node:fs";
import path from "node:path";

type Mode = "diagnostics" | "optimizer" | "train";
type Task = "iaf" | "potential";

interface Config {
  mode: Mode;
  task: Task;
  sequenceLength: number;
  environments: number;
  generations: number;
  populationPairs: number;
  sigma: number;
  learningRate: number;
  momentum: number;
  memorySize: number;
  outputGain: number;
  seed: number;
  logEvery: number;
  runName: string;
}

interface Sequence {
  inputs: Float32Array;
  targets: Uint8Array;
  potentials: Float32Array;
}

interface Evaluation {
  fitness: number;
  loss: number;
  targetSpikes: number;
  predictedSpikes: number;
  spikeCountError: number;
  firstInputs: number[];
  firstTargets: number[];
  firstOutputs: number[];
}

const DEFAULT_CONFIG: Config = {
  mode: "train",
  task: "iaf",
  sequenceLength: 100,
  environments: 8,
  generations: 100,
  populationPairs: 32,
  sigma: 0.01,
  learningRate: 1,
  momentum: 0.9,
  memorySize: 8,
  outputGain: 1000,
  seed: 7,
  logEvery: 10,
  runName: "paper_smoke"
};

const RUNS_ROOT = path.resolve("runs", "enu_iaf_reproduction");

class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  integer(min: number, maxExclusive: number): number {
    return min + Math.floor(this.next() * (maxExclusive - min));
  }

  normal(): number {
    const u1 = Math.max(this.next(), 1e-7);
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

function parseArgs(): Config {
  const config = { ...DEFAULT_CONFIG };
  const args = process.argv.slice(2);

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      continue;
    }

    switch (key) {
      case "--mode":
        if (value !== "diagnostics" && value !== "optimizer" && value !== "train") {
          throw new Error("--mode must be diagnostics, optimizer, or train");
        }
        config.mode = value;
        break;
      case "--task":
        if (value !== "iaf" && value !== "potential") {
          throw new Error("--task must be iaf or potential");
        }
        config.task = value;
        break;
      case "--sequence-length":
        config.sequenceLength = Number(value);
        break;
      case "--environments":
        config.environments = Number(value);
        break;
      case "--generations":
        config.generations = Number(value);
        break;
      case "--population-pairs":
        config.populationPairs = Number(value);
        break;
      case "--sigma":
        config.sigma = Number(value);
        break;
      case "--learning-rate":
        config.learningRate = Number(value);
        break;
      case "--momentum":
        config.momentum = Number(value);
        break;
      case "--memory-size":
        config.memorySize = Number(value);
        break;
      case "--output-gain":
        config.outputGain = Number(value);
        break;
      case "--seed":
        config.seed = Number(value);
        break;
      case "--log-every":
        config.logEvery = Number(value);
        break;
      case "--run-name":
        config.runName = value;
        break;
      default:
        throw new Error(`Unknown argument: ${key}`);
    }
  }

  if (!Number.isInteger(config.memorySize) || config.memorySize < 1) {
    throw new Error("memorySize must be a positive integer");
  }
  if (!Number.isInteger(config.populationPairs) || config.populationPairs < 2) {
    throw new Error("populationPairs must be at least 2");
  }
  return config;
}

function sigmoid3(value: number): number {
  return 1 / (1 + Math.exp(-3 * value));
}

function clip01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function genomeSize(memorySize: number): number {
  const recurrentInput = memorySize + 3; // input, previous output, memory, bias
  return 3 * memorySize * recurrentInput + memorySize + 1;
}

function fillOrthonormalRows(
  genome: Float32Array,
  offset: number,
  rows: number,
  cols: number,
  rng: Rng
): number {
  for (let row = 0; row < rows; row += 1) {
    const rowOffset = offset + row * cols;
    for (let col = 0; col < cols - 1; col += 1) {
      genome[rowOffset + col] = rng.normal();
    }

    for (let previous = 0; previous < row; previous += 1) {
      const previousOffset = offset + previous * cols;
      let projection = 0;
      for (let col = 0; col < cols - 1; col += 1) {
        projection += genome[rowOffset + col] * genome[previousOffset + col];
      }
      for (let col = 0; col < cols - 1; col += 1) {
        genome[rowOffset + col] -= projection * genome[previousOffset + col];
      }
    }

    let norm = 0;
    for (let col = 0; col < cols - 1; col += 1) {
      norm += genome[rowOffset + col] ** 2;
    }
    const scale = 1 / Math.sqrt(norm || 1);
    for (let col = 0; col < cols - 1; col += 1) {
      genome[rowOffset + col] *= scale;
    }
    genome[rowOffset + cols - 1] = 0;
  }
  return offset + rows * cols;
}

function initGenome(config: Config, rng: Rng): Float32Array {
  const stateSize = config.memorySize;
  const recurrentInput = stateSize + 3;
  const genome = new Float32Array(genomeSize(stateSize));
  let offset = 0;

  offset = fillOrthonormalRows(genome, offset, stateSize, recurrentInput, rng);
  offset = fillOrthonormalRows(genome, offset, stateSize, recurrentInput, rng);
  offset = fillOrthonormalRows(genome, offset, stateSize, recurrentInput, rng);
  fillOrthonormalRows(genome, offset, 1, stateSize + 1, rng);
  return genome;
}

function dotRow(
  matrix: Float32Array,
  offset: number,
  row: number,
  cols: number,
  input: Float32Array
): number {
  let sum = 0;
  const rowOffset = offset + row * cols;
  for (let col = 0; col < cols; col += 1) {
    sum += matrix[rowOffset + col] * input[col];
  }
  return sum;
}

function stepEnu(
  config: Config,
  genome: Float32Array,
  memory: Float32Array,
  previousOutput: number,
  inputValue: number
): number {
  const stateSize = memory.length;
  const recurrentInputSize = stateSize + 3;
  const gateInput = new Float32Array(recurrentInputSize);
  gateInput[0] = inputValue;
  gateInput[1] = previousOutput;
  gateInput.set(memory, 2);
  gateInput[gateInput.length - 1] = 1;

  const wzOffset = 0;
  const wrOffset = stateSize * recurrentInputSize;
  const wcOffset = 2 * stateSize * recurrentInputSize;
  const woOffset = 3 * stateSize * recurrentInputSize;
  const reset = new Float32Array(stateSize);
  const update = new Float32Array(stateSize);

  for (let index = 0; index < stateSize; index += 1) {
    reset[index] = sigmoid3(dotRow(genome, wrOffset, index, recurrentInputSize, gateInput) - 1);
    update[index] = sigmoid3(dotRow(genome, wzOffset, index, recurrentInputSize, gateInput));
  }

  const candidateInput = gateInput.slice();
  for (let index = 0; index < stateSize; index += 1) {
    candidateInput[index + 2] = memory[index] * reset[index];
  }

  for (let index = 0; index < stateSize; index += 1) {
    const candidate = Math.tanh(
      3 * dotRow(genome, wcOffset, index, recurrentInputSize, candidateInput)
    );
    memory[index] = (1 - update[index]) * memory[index] + update[index] * candidate;
  }

  let output = genome[woOffset + stateSize];
  for (let index = 0; index < stateSize; index += 1) {
    output += genome[woOffset + index] * memory[index];
  }
  return clip01(config.outputGain * output);
}

function buildSequences(config: Config, seed: number): Sequence[] {
  const rng = new Rng(seed);
  const sequences: Sequence[] = [];

  for (let env = 0; env < config.environments; env += 1) {
    const inputs = new Float32Array(config.sequenceLength);
    const targets = new Uint8Array(config.sequenceLength);
    const potentials = new Float32Array(config.sequenceLength);
    let potential = 0;
    const quarterLength = Math.max(1, Math.floor(config.sequenceLength / 4));
    const scales = Array.from({ length: 4 }, () => rng.integer(1, 10));

    for (let step = 1; step < config.sequenceLength; step += 1) {
      const quarter = Math.min(3, Math.floor((step - 1) / quarterLength));
      inputs[step] = (0.01 + rng.next() * 0.01) * scales[quarter];
      potential += inputs[step];
      potentials[step] = Math.min(potential / 0.5, 1);
      if (potential > 0.5) {
        targets[step] = 1;
        potential = 0;
      }
    }
    sequences.push({ inputs, targets, potentials });
  }
  return sequences;
}

function scoreOutputs(sequence: Sequence, outputs: Float32Array): {
  loss: number;
  targetSpikes: number;
  predictedSpikes: number;
} {
  let targetTimer = 0;
  let predictedTimer = 0;
  let targetSpikes = 0;
  let predictedSpikes = 0;
  let loss = 0;

  for (let step = 0; step < sequence.inputs.length; step += 1) {
    const targetSpike = sequence.targets[step] > 0;
    const predictedSpike = outputs[step] > 0.05;
    targetTimer = targetSpike ? 0 : targetTimer + 1;
    predictedTimer = predictedSpike ? 0 : predictedTimer + 1;
    if (targetSpike) targetSpikes += 1;
    if (predictedSpike) predictedSpikes += 1;

    const timingError = targetTimer - predictedTimer;
    const heightError = predictedSpike ? (outputs[step] - 1) ** 2 : 0;
    loss += timingError * timingError + heightError;
  }

  return { loss, targetSpikes, predictedSpikes };
}

function scorePotentials(sequence: Sequence, outputs: Float32Array): {
  loss: number;
  targetSpikes: number;
  predictedSpikes: number;
} {
  let loss = 0;
  for (let step = 0; step < outputs.length; step += 1) {
    loss += (outputs[step] - sequence.potentials[step]) ** 2;
  }
  return { loss, targetSpikes: 0, predictedSpikes: 0 };
}

function evaluateGenome(config: Config, genome: Float32Array, sequences: Sequence[]): Evaluation {
  let totalLoss = 0;
  let targetSpikes = 0;
  let predictedSpikes = 0;
  let firstOutputs: number[] = [];

  for (let env = 0; env < sequences.length; env += 1) {
    const sequence = sequences[env];
    const memory = new Float32Array(config.memorySize);
    const outputs = new Float32Array(config.sequenceLength);
    let previousOutput = 0;

    for (let step = 0; step < config.sequenceLength; step += 1) {
      previousOutput = stepEnu(config, genome, memory, previousOutput, sequence.inputs[step]);
      outputs[step] = previousOutput;
    }

    const score =
      config.task === "iaf"
        ? scoreOutputs(sequence, outputs)
        : scorePotentials(sequence, outputs);
    totalLoss += score.loss;
    targetSpikes += score.targetSpikes;
    predictedSpikes += score.predictedSpikes;
    if (env === 0) {
      firstOutputs = Array.from(outputs.slice(0, 32));
    }
  }

  const steps = sequences.length * config.sequenceLength;
  const loss = totalLoss / steps;
  const first = sequences[0];
  return {
    fitness: -loss,
    loss,
    targetSpikes,
    predictedSpikes,
    spikeCountError: Math.abs(targetSpikes - predictedSpikes) / Math.max(targetSpikes, 1),
    firstInputs: Array.from(first.inputs.slice(0, 32)),
    firstTargets: Array.from(
      (config.task === "iaf" ? first.targets : first.potentials).slice(0, 32)
    ),
    firstOutputs
  };
}

function evaluateBaseline(
  config: Config,
  sequences: Sequence[],
  policy: "oracle" | "silent" | "always"
): Evaluation {
  let totalLoss = 0;
  let targetSpikes = 0;
  let predictedSpikes = 0;
  let firstOutputs: number[] = [];

  for (let env = 0; env < sequences.length; env += 1) {
    const sequence = sequences[env];
    const outputs = new Float32Array(config.sequenceLength);
    for (let step = 0; step < outputs.length; step += 1) {
      outputs[step] = policy === "oracle" ? sequence.targets[step] : policy === "always" ? 1 : 0;
    }
    const score = scoreOutputs(sequence, outputs);
    totalLoss += score.loss;
    targetSpikes += score.targetSpikes;
    predictedSpikes += score.predictedSpikes;
    if (env === 0) firstOutputs = Array.from(outputs.slice(0, 32));
  }

  const loss = totalLoss / (sequences.length * config.sequenceLength);
  const first = sequences[0];
  return {
    fitness: -loss,
    loss,
    targetSpikes,
    predictedSpikes,
    spikeCountError: Math.abs(targetSpikes - predictedSpikes) / Math.max(targetSpikes, 1),
    firstInputs: Array.from(first.inputs.slice(0, 32)),
    firstTargets: Array.from(first.targets.slice(0, 32)),
    firstOutputs
  };
}

function rankWeights(fitnesses: number[]): number[] {
  const order = fitnesses.map((fitness, index) => ({ fitness, index }));
  order.sort((a, b) => a.fitness - b.fitness);
  const weights = new Array<number>(fitnesses.length).fill(0);
  let total = 0;

  for (let rank = 0; rank < order.length; rank += 1) {
    const weight = (rank / order.length) ** 5;
    weights[order[rank].index] = weight;
    total += weight;
  }
  return weights.map((weight) => weight / (total || 1));
}

function addScaled(target: Float32Array, source: Float32Array, scale: number): void {
  for (let index = 0; index < target.length; index += 1) {
    target[index] += source[index] * scale;
  }
}

function compactEvaluation(evaluation: Evaluation): Record<string, unknown> {
  return {
    fitness: Number(evaluation.fitness.toFixed(4)),
    loss: Number(evaluation.loss.toFixed(4)),
    targetSpikes: evaluation.targetSpikes,
    predictedSpikes: evaluation.predictedSpikes,
    spikeCountError: Number(evaluation.spikeCountError.toFixed(4)),
    firstTargets: evaluation.firstTargets,
    firstOutputs: evaluation.firstOutputs.map((value) => Number(value.toFixed(3)))
  };
}

function writeSummary(config: Config, summary: Record<string, unknown>): void {
  const runDir = path.join(RUNS_ROOT, config.runName);
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
}

function runDiagnostics(config: Config): void {
  const sequences = buildSequences(config, config.seed);
  const rng = new Rng(config.seed);
  const randomGenome = initGenome(config, rng);
  const diagnostics = {
    oracle: compactEvaluation(evaluateBaseline(config, sequences, "oracle")),
    silent: compactEvaluation(evaluateBaseline(config, sequences, "silent")),
    always: compactEvaluation(evaluateBaseline(config, sequences, "always")),
    randomEnu: compactEvaluation(evaluateGenome(config, randomGenome, sequences)),
    genomeSize: randomGenome.length
  };
  console.log(JSON.stringify(diagnostics, null, 2));
  writeSummary(config, { config, diagnostics });
}

function runOptimizerDiagnostic(config: Config): void {
  const rng = new Rng(config.seed);
  const dimension = 16;
  const center = new Float32Array(dimension);
  const target = new Float32Array(dimension).fill(1);
  const momentum = new Float32Array(dimension);

  const fitness = (candidate: Float32Array): number => {
    let squaredError = 0;
    for (let index = 0; index < dimension; index += 1) {
      squaredError += (candidate[index] - target[index]) ** 2;
    }
    return -squaredError;
  };

  const initialFitness = fitness(center);
  for (let generation = 0; generation < config.generations; generation += 1) {
    const deltas: Float32Array[] = [];
    const fitnesses: number[] = [];
    for (let pair = 0; pair < config.populationPairs; pair += 1) {
      const delta = new Float32Array(dimension);
      for (let index = 0; index < dimension; index += 1) {
        delta[index] = rng.normal();
      }
      const plus = center.slice();
      const minus = center.slice();
      addScaled(plus, delta, config.sigma);
      addScaled(minus, delta, -config.sigma);
      deltas.push(delta);
      fitnesses.push(fitness(plus), fitness(minus));
    }
    const weights = rankWeights(fitnesses);
    const gradient = new Float32Array(dimension);
    for (let pair = 0; pair < config.populationPairs; pair += 1) {
      addScaled(
        gradient,
        deltas[pair],
        config.sigma * (weights[pair * 2] - weights[pair * 2 + 1])
      );
    }
    for (let index = 0; index < dimension; index += 1) {
      momentum[index] = config.momentum * momentum[index] + config.learningRate * gradient[index];
      center[index] += momentum[index];
    }
  }

  console.log(
    JSON.stringify(
      {
        initialFitness,
        finalFitness: fitness(center),
        target: Array.from(target.slice(0, 4)),
        center: Array.from(center.slice(0, 4))
      },
      null,
      2
    )
  );
}

function runTraining(config: Config): void {
  const rng = new Rng(config.seed);
  const center = initGenome(config, rng);
  const momentum = new Float32Array(center.length);
  const validationSequences = buildSequences(config, config.seed + 1_000_000);
  const initial = evaluateGenome(config, center, validationSequences);
  let bestValidation = initial;
  let bestGenome = center.slice();
  const history: Array<Record<string, unknown>> = [];

  console.log(JSON.stringify({ generation: 0, validation: compactEvaluation(initial) }));

  for (let generation = 1; generation <= config.generations; generation += 1) {
    const trainingSequences = buildSequences(config, config.seed + generation * 10_000);
    const deltas: Float32Array[] = [];
    const fitnesses: number[] = [];
    const candidates: Float32Array[] = [];

    for (let pair = 0; pair < config.populationPairs; pair += 1) {
      const delta = new Float32Array(center.length);
      if (pair > 0) {
        for (let index = 0; index < delta.length; index += 1) {
          delta[index] = rng.normal();
        }
      }
      const plus = center.slice();
      const minus = center.slice();
      addScaled(plus, delta, config.sigma);
      addScaled(minus, delta, -config.sigma);
      deltas.push(delta);
      candidates.push(plus, minus);
    }

    for (const candidate of candidates) {
      fitnesses.push(evaluateGenome(config, candidate, trainingSequences).fitness);
    }

    const weights = rankWeights(fitnesses);
    const gradient = new Float32Array(center.length);
    for (let pair = 0; pair < config.populationPairs; pair += 1) {
      const pairWeight = weights[pair * 2] - weights[pair * 2 + 1];
      addScaled(gradient, deltas[pair], config.sigma * pairWeight);
    }

    for (let index = 0; index < center.length; index += 1) {
      momentum[index] = config.momentum * momentum[index] + config.learningRate * gradient[index];
      center[index] += momentum[index];
    }

    if (generation % config.logEvery === 0 || generation === config.generations) {
      const validation = evaluateGenome(config, center, validationSequences);
      if (validation.fitness > bestValidation.fitness) {
        bestValidation = validation;
        bestGenome = center.slice();
      }
      const entry = { generation, validation: compactEvaluation(validation) };
      history.push(entry);
      console.log(JSON.stringify(entry));
    }
  }

  writeSummary(config, {
    config,
    architecture: {
      recurrentInput: config.memorySize + 3,
      outputChannels: 1,
      genomeSize: center.length,
      activation: `sigmoid(3x), tanh(3x), clip(${config.outputGain} * linear output)`,
      reference: "implementation_paper/code/EvolvableNeuralUnitStacked.py"
    },
    initial: compactEvaluation(initial),
    bestValidation: compactEvaluation(bestValidation),
    bestGenome: Array.from(bestGenome),
    history
  });
  console.log(`saved runs/enu_iaf_reproduction/${config.runName}/summary.json`);
}

const config = parseArgs();
if (config.mode === "diagnostics") {
  runDiagnostics(config);
} else if (config.mode === "optimizer") {
  runOptimizerDiagnostic(config);
} else {
  runTraining(config);
}
