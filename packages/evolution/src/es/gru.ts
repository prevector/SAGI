import type { TokenTaskDataset } from "./tokenTask.js";

export interface GruShape {
  vocabSize: number;
  hiddenSize: number;
}

export interface GruStepResult {
  hidden: Float32Array;
  logits: Float32Array;
}

export interface GruSequenceMetrics {
  loss: number;
  accuracy: number;
  predictions: Uint16Array;
}

export interface GruTraceStep {
  token: number;
  expected: number;
  predicted: number;
  hidden: Float32Array;
  logits: Float32Array;
  probabilities: Float32Array;
}

export interface GruSequenceTrace extends GruSequenceMetrics {
  steps: GruTraceStep[];
}

export function gruGenomeLength(shape: GruShape): number {
  const { vocabSize, hiddenSize } = shape;
  const gate = hiddenSize * vocabSize + hiddenSize * hiddenSize + hiddenSize;
  const candidate = hiddenSize * vocabSize + hiddenSize * hiddenSize + hiddenSize;
  const output = vocabSize * hiddenSize + vocabSize;
  return gate + gate + candidate + output;
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function argmax(values: Float32Array): number {
  let bestIndex = 0;
  let bestValue = values[0] ?? Number.NEGATIVE_INFINITY;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] > bestValue) {
      bestValue = values[index];
      bestIndex = index;
    }
  }
  return bestIndex;
}

export class GruModel {
  readonly shape: GruShape;

  constructor(shape: GruShape) {
    this.shape = shape;
  }

  step(genome: Float32Array, token: number, prevHidden?: Float32Array): GruStepResult {
    const { vocabSize, hiddenSize } = this.shape;
    const hidden = prevHidden ? prevHidden.slice() : new Float32Array(hiddenSize);
    const nextHidden = new Float32Array(hiddenSize);
    const z = new Float32Array(hiddenSize);
    const r = new Float32Array(hiddenSize);
    const hHat = new Float32Array(hiddenSize);
    const logits = new Float32Array(vocabSize);

    const wzStart = 0;
    const uzStart = wzStart + hiddenSize * vocabSize;
    const bzStart = uzStart + hiddenSize * hiddenSize;
    const wrStart = bzStart + hiddenSize;
    const urStart = wrStart + hiddenSize * vocabSize;
    const brStart = urStart + hiddenSize * hiddenSize;
    const whStart = brStart + hiddenSize;
    const uhStart = whStart + hiddenSize * vocabSize;
    const bhStart = uhStart + hiddenSize * hiddenSize;
    const woStart = bhStart + hiddenSize;
    const boStart = woStart + vocabSize * hiddenSize;

    for (let row = 0; row < hiddenSize; row += 1) {
      let zSum = genome[bzStart + row];
      let rSum = genome[brStart + row];
      zSum += genome[wzStart + row * vocabSize + token];
      rSum += genome[wrStart + row * vocabSize + token];
      const uzBase = uzStart + row * hiddenSize;
      const urBase = urStart + row * hiddenSize;
      for (let col = 0; col < hiddenSize; col += 1) {
        zSum += genome[uzBase + col] * hidden[col];
        rSum += genome[urBase + col] * hidden[col];
      }
      z[row] = sigmoid(zSum);
      r[row] = sigmoid(rSum);
    }

    for (let row = 0; row < hiddenSize; row += 1) {
      let hSum = genome[bhStart + row];
      hSum += genome[whStart + row * vocabSize + token];
      const uhBase = uhStart + row * hiddenSize;
      for (let col = 0; col < hiddenSize; col += 1) {
        hSum += genome[uhBase + col] * (r[col] * hidden[col]);
      }
      hHat[row] = Math.tanh(hSum);
      nextHidden[row] = (1 - z[row]) * hidden[row] + z[row] * hHat[row];
    }

    for (let out = 0; out < vocabSize; out += 1) {
      let sum = genome[boStart + out];
      const base = woStart + out * hiddenSize;
      for (let col = 0; col < hiddenSize; col += 1) {
        sum += genome[base + col] * nextHidden[col];
      }
      logits[out] = sum;
    }

    return { hidden: nextHidden, logits };
  }

  evaluateSequence(genome: Float32Array, tokens: Uint16Array): GruSequenceMetrics {
    const trace = this.traceSequence(genome, tokens);
    return {
      loss: trace.loss,
      accuracy: trace.accuracy,
      predictions: trace.predictions
    };
  }

  traceSequence(genome: Float32Array, tokens: Uint16Array): GruSequenceTrace {
    let hidden = new Float32Array(this.shape.hiddenSize);
    let loss = 0;
    let correct = 0;
    const predictions = new Uint16Array(tokens.length - 1);
    const steps: GruTraceStep[] = [];

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const current = tokens[index] ?? 0;
      const expected = tokens[index + 1] ?? 0;
      const step = this.step(genome, current, hidden);
      hidden = new Float32Array(step.hidden);
      predictions[index] = argmax(step.logits);
      if (predictions[index] === expected) correct += 1;
      loss += crossEntropy(step.logits, expected);
      steps.push({
        token: current,
        expected,
        predicted: predictions[index],
        hidden: new Float32Array(step.hidden),
        logits: new Float32Array(step.logits),
        probabilities: softmax(step.logits)
      });
    }

    return {
      loss: loss / Math.max(1, tokens.length - 1),
      accuracy: correct / Math.max(1, tokens.length - 1),
      predictions,
      steps
    };
  }

  evaluateDataset(genome: Float32Array, dataset: TokenTaskDataset): GruSequenceMetrics {
    let totalLoss = 0;
    let totalAccuracy = 0;
    let count = 0;
    const lastPredictions = dataset.samples[dataset.samples.length - 1]?.tokens;
    let predictions = new Uint16Array(Math.max(0, (lastPredictions?.length ?? 1) - 1));

    for (const sample of dataset.samples) {
      const metrics = this.evaluateSequence(genome, sample.tokens);
      totalLoss += metrics.loss;
      totalAccuracy += metrics.accuracy;
      predictions = new Uint16Array(metrics.predictions);
      count += 1;
    }

    return {
      loss: totalLoss / Math.max(1, count),
      accuracy: totalAccuracy / Math.max(1, count),
      predictions
    };
  }
}

export function crossEntropy(logits: Float32Array, targetIndex: number): number {
  let max = logits[0] ?? 0;
  for (let index = 1; index < logits.length; index += 1) {
    if (logits[index] > max) max = logits[index];
  }
  let sumExp = 0;
  for (let index = 0; index < logits.length; index += 1) {
    sumExp += Math.exp(logits[index] - max);
  }
  const logProb = (logits[targetIndex] - max) - Math.log(sumExp);
  return -logProb;
}

export function softmax(logits: Float32Array): Float32Array {
  let max = logits[0] ?? 0;
  for (let index = 1; index < logits.length; index += 1) {
    if (logits[index] > max) max = logits[index];
  }
  const probs = new Float32Array(logits.length);
  let sum = 0;
  for (let index = 0; index < logits.length; index += 1) {
    probs[index] = Math.exp(logits[index] - max);
    sum += probs[index];
  }
  for (let index = 0; index < probs.length; index += 1) {
    probs[index] /= Math.max(sum, 1e-9);
  }
  return probs;
}
