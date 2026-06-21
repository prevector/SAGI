import { describe, expect, it } from "vitest";
import { OpenAiEsOptimizer, centeredRanks } from "../src/es/openaiEs.js";

function negativeSquaredDistance(params: Float32Array, target: readonly number[]): number {
  let sum = 0;
  for (let index = 0; index < target.length; index += 1) {
    const delta = params[index] - target[index];
    sum += delta * delta;
  }
  return -sum;
}

describe("centeredRanks", () => {
  it("maps values into a zero-centered rank band", () => {
    const ranks = centeredRanks([4, 1, 10, 8]);
    expect(Array.from(ranks)).toEqual([
      1 / 3 - 0.5,
      0 / 3 - 0.5,
      3 / 3 - 0.5,
      2 / 3 - 0.5
    ]);
  });
});

describe("OpenAiEsOptimizer", () => {
  it("deterministically improves a plain vector toward a fixed target", () => {
    const target = [1.5, -0.75, 0.25, 2.25];
    const optimizer = new OpenAiEsOptimizer({
      seed: "vector-target",
      dimensions: target.length,
      sigma: 0.1,
      learningRate: 0.08,
      populationPairs: 48,
      momentum: 0.7
    });

    const initialScore = negativeSquaredDistance(optimizer.snapshot().params, target);
    let latestScore = initialScore;
    for (let step = 0; step < 120; step += 1) {
      latestScore = optimizer.step((params) => negativeSquaredDistance(params, target)).score;
    }

    const finalParams = optimizer.snapshot().params;
    expect(latestScore).toBeGreaterThan(initialScore);
    expect(latestScore).toBeGreaterThan(-0.02);
    expect(Array.from(finalParams)).toSatisfy((values: number[]) =>
      values.every((value, index) => Math.abs(value - target[index]) < 0.2)
    );
  });

  it("is deterministic for a given seed and configuration", () => {
    const target = [0.4, -1.2, 0.8];
    const run = () => {
      const optimizer = new OpenAiEsOptimizer({
        seed: "determinism",
        dimensions: target.length,
        sigma: 0.12,
        learningRate: 0.05,
        populationPairs: 24
      });
      const trajectory: number[] = [];
      for (let step = 0; step < 40; step += 1) {
        trajectory.push(optimizer.step((params) => negativeSquaredDistance(params, target)).score);
      }
      return {
        params: Array.from(optimizer.snapshot().params),
        trajectory
      };
    };

    const left = run();
    const right = run();
    expect(left.trajectory).toEqual(right.trajectory);
    expect(left.params).toEqual(right.params);
  });
});
