// A tiny fixed-topology MLP policy: obs(IN) -> hidden(tanh) -> out(2, tanh).
// The flat weight vector IS the evolvable genome. Deliberately minimal — a toy
// mirror of an ENU-style controller evolved by ES/GA (PLAN-3D.md §4).

import type { Policy } from "./types";

export interface MlpShape {
  inputs: number;
  hidden: number;
  outputs: number;
}

/** Number of genome scalars for a given shape. */
export function genomeLength(shape: MlpShape): number {
  const { inputs, hidden, outputs } = shape;
  return hidden * inputs + hidden + outputs * hidden + outputs;
}

const tanh = Math.tanh;

/** Build a Policy from a flat genome. Reuses scratch buffers per instance. */
export function buildMlp(shape: MlpShape, genome: Float32Array): Policy {
  const { inputs, hidden, outputs } = shape;
  const h = new Float32Array(hidden);
  const out = new Float32Array(outputs);

  // Offsets into the flat genome.
  const w1End = hidden * inputs;
  const b1End = w1End + hidden;
  const w2End = b1End + outputs * hidden;
  // b2 occupies the remaining `outputs` slots.

  return {
    act(obs: Float32Array): Float32Array {
      for (let j = 0; j < hidden; j++) {
        let sum = genome[w1End + j]; // b1[j]
        const base = j * inputs;
        for (let i = 0; i < inputs; i++) sum += genome[base + i] * obs[i];
        h[j] = tanh(sum);
      }
      for (let k = 0; k < outputs; k++) {
        let sum = genome[w2End + k]; // b2[k]
        const base = b1End + k * hidden;
        for (let j = 0; j < hidden; j++) sum += genome[base + j] * h[j];
        out[k] = tanh(sum);
      }
      return out;
    },
  };
}
