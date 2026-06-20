import type { Policy } from "./types.js";

export interface MlpShape {
  inputs: number;
  hidden: number;
  outputs: number;
}

export function genomeLength(shape: MlpShape): number {
  const { inputs, hidden, outputs } = shape;
  return hidden * inputs + hidden + outputs * hidden + outputs;
}

const tanh = Math.tanh;

export function buildMlp(shape: MlpShape, genome: Float32Array): Policy {
  const { inputs, hidden, outputs } = shape;
  const h = new Float32Array(hidden);
  const out = new Float32Array(outputs);
  const w1End = hidden * inputs;
  const b1End = w1End + hidden;
  const w2End = b1End + outputs * hidden;

  return {
    act(obs: Float32Array): Float32Array {
      for (let j = 0; j < hidden; j++) {
        let sum = genome[w1End + j];
        const base = j * inputs;
        for (let i = 0; i < inputs; i++) {
          sum += genome[base + i] * obs[i];
        }
        h[j] = tanh(sum);
      }
      for (let k = 0; k < outputs; k++) {
        let sum = genome[w2End + k];
        const base = b1End + k * hidden;
        for (let j = 0; j < hidden; j++) {
          sum += genome[base + j] * h[j];
        }
        out[k] = tanh(sum);
      }
      return out;
    }
  };
}
