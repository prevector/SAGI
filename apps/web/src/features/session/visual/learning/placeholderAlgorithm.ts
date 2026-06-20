// PlaceholderAlgorithm — the swappable "model": a fixed-topology MLP evolved by
// genetic operators. Implements `Algorithm<Float32Array>`; a real model later
// implements the same interface. Genome ops are deterministic given the RNG.

import { gaussian, type RNG } from "../rng";
import { VISUAL_CONFIG } from "../config";
import { OBS_SIZE } from "../maze/sensors";
import { buildMlp, genomeLength, type MlpShape } from "./mlp";
import type { Algorithm, Policy } from "./types";

export const MLP_SHAPE: MlpShape = {
  inputs: OBS_SIZE,
  hidden: VISUAL_CONFIG.ga.hiddenUnits,
  outputs: 2, // [turn, move]
};

const LEN = genomeLength(MLP_SHAPE);

export class PlaceholderAlgorithm implements Algorithm<Float32Array> {
  random(rng: RNG): Float32Array {
    const g = new Float32Array(LEN);
    for (let i = 0; i < LEN; i++) g[i] = gaussian(rng, 0, 0.8);
    return g;
  }

  build(genome: Float32Array): Policy {
    return buildMlp(MLP_SHAPE, genome);
  }

  mutate(genome: Float32Array, rng: RNG): Float32Array {
    const { mutationRate, mutationStd } = VISUAL_CONFIG.ga;
    const out = genome.slice();
    for (let i = 0; i < out.length; i++) {
      if (rng() < mutationRate) out[i] += gaussian(rng, 0, mutationStd);
    }
    return out;
  }

  crossover(a: Float32Array, b: Float32Array, rng: RNG): Float32Array {
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) out[i] = rng() < 0.5 ? a[i] : b[i];
    return out;
  }
}
