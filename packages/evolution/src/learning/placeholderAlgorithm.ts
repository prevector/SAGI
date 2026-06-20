import { DEFAULT_GA_CONFIG, type GaConfig } from "../config.js";
import { gaussian, type RNG } from "../rng.js";
import { OBS_SIZE } from "../maze/sensors.js";
import { buildMlp, genomeLength, type MlpShape } from "./mlp.js";
import type { Algorithm, Policy } from "./types.js";

export const MLP_SHAPE = (hiddenUnits: number): MlpShape => ({
  inputs: OBS_SIZE,
  hidden: hiddenUnits,
  outputs: 2
});

export class PlaceholderAlgorithm implements Algorithm<Float32Array> {
  private readonly ga: GaConfig;
  private readonly shape: MlpShape;
  private readonly len: number;

  constructor(ga: Partial<GaConfig> = {}) {
    this.ga = { ...DEFAULT_GA_CONFIG, ...ga };
    this.shape = MLP_SHAPE(this.ga.hiddenUnits);
    this.len = genomeLength(this.shape);
  }

  random(rng: RNG): Float32Array {
    const g = new Float32Array(this.len);
    for (let i = 0; i < g.length; i++) {
      g[i] = gaussian(rng, 0, 0.8);
    }
    return g;
  }

  build(genome: Float32Array): Policy {
    return buildMlp(this.shape, genome);
  }

  mutate(genome: Float32Array, rng: RNG): Float32Array {
    const out = genome.slice();
    for (let i = 0; i < out.length; i++) {
      if (rng() < this.ga.mutationRate) {
        out[i] += gaussian(rng, 0, this.ga.mutationStd);
      }
    }
    return out;
  }

  crossover(a: Float32Array, b: Float32Array, rng: RNG): Float32Array {
    const out = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      out[i] = rng() < 0.5 ? a[i] : b[i];
    }
    return out;
  }
}
