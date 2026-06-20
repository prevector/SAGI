// The Phase D gate: the GA actually learns, headless, with no rendering.
// On a fixed seed, best fitness improves over generations and the maze gets
// solved; runs are deterministic; and it solves across several seeds.

import { describe, expect, it } from "vitest";
import { VISUAL_CONFIG } from "../config";
import { GaTrainer } from "./trainer";
import { createLocalSource } from "./localSource";
import { distanceField, maxFiniteDistance, rollout } from "./fitness";
import { PlaceholderAlgorithm } from "./placeholderAlgorithm";
import { generateMaze } from "../maze/generate";
import { subRng } from "../rng";

const COLS = 11;
const ROWS = 11;

function trainUntilSolved(seed: string, maxGen: number = VISUAL_CONFIG.ga.maxGenerations) {
  const t = new GaTrainer({ cols: COLS, rows: ROWS });
  t.reset(seed);
  const initialFitness = t.stats().bestFitness;
  let solvedAt = -1;
  for (let g = 0; g < maxGen; g++) {
    t.step();
    if (t.stats().solved && solvedAt < 0) solvedAt = t.stats().generation;
  }
  return { trainer: t, initialFitness, solvedAt };
}

describe("GA trainer (headless)", () => {
  it("improves best fitness over generations", () => {
    const { trainer, initialFitness } = trainUntilSolved("s-fixed-1", 30);
    expect(trainer.stats().bestFitness).toBeGreaterThan(initialFitness);
  });

  it("solves the maze on a fixed seed within the generation cap", () => {
    const { trainer, solvedAt } = trainUntilSolved("s-fixed-1");
    expect(trainer.stats().solved).toBe(true);
    expect(solvedAt).toBeGreaterThan(0);
  });

  it("is deterministic: same seed => identical fitness trajectory", () => {
    const run = (seed: string) => {
      const t = new GaTrainer({ cols: COLS, rows: ROWS });
      t.reset(seed);
      const traj: number[] = [t.stats().bestFitness];
      for (let g = 0; g < 12; g++) {
        t.step();
        traj.push(t.stats().bestFitness);
      }
      return traj;
    };
    expect(run("s-det")).toEqual(run("s-det"));
  });

  it("solves across multiple seeds", () => {
    const seeds = ["s-a", "s-b", "s-c", "s-d", "s-e"];
    let solved = 0;
    for (const s of seeds) {
      if (trainUntilSolved(s).trainer.stats().solved) solved++;
    }
    // Robust: every seed should be solved within the cap.
    expect(solved).toBe(seeds.length);
  });

  it("champion path starts at the maze start", () => {
    const { trainer } = trainUntilSolved("s-fixed-1", 20);
    const path = trainer.championPath();
    expect(path[0]).toEqual([0, 0]);
  });
});

describe("local source", () => {
  it("returns a reset trainer wrapped as a local TrainingSource", () => {
    const src = createLocalSource("s-fixed-1", COLS, ROWS);
    expect(src.kind).toBe("local");
    expect(src.trainer.stats().generation).toBe(0);
  });
});

describe("distance field + rollout sanity", () => {
  it("a greedy scent-following policy solves the maze", () => {
    // Sanity that the sensors + maze admit a solution: a hand-coded greedy
    // policy (move when scent ahead is positive, else turn toward positive
    // scent) should reach the exit.
    const grid = generateMaze(subRng("s-fixed-1", "maze"), COLS, ROWS);
    const dist = distanceField(grid);
    const greedy = {
      act(obs: Float32Array): Float32Array {
        // obs: [wallF,wallL,wallR, scentF,scentL,scentR, align, bias]
        const [, , , sf, sl, sr] = obs;
        if (sf > 0) return new Float32Array([0, 1]); // ahead is good: go
        if (sl > 0) return new Float32Array([-1, 1]); // left is good: turn left + go
        if (sr > 0) return new Float32Array([1, 1]); // right is good: turn right + go
        return new Float32Array([1, 1]); // otherwise turn and try
      },
    };
    const res = rollout(grid, dist, greedy, 4 * COLS * ROWS);
    expect(res.reached).toBe(true);
    expect(maxFiniteDistance(dist)).toBeGreaterThan(0);
  });
});
