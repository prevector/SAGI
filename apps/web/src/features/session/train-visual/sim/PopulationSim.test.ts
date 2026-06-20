import { describe, it, expect } from "vitest";
import { PopulationSim } from "./PopulationSim";
import { TRAIN_CONFIG } from "../config";

const { maxGenerations, populationSize, genomeLength } = TRAIN_CONFIG.sim;

function runToConvergence(seed: string) {
  const sim = new PopulationSim(seed);
  const best: number[] = [sim.stats().bestFitness];
  for (let g = 0; g < maxGenerations; g++) {
    sim.step();
    best.push(sim.stats().bestFitness);
  }
  return { sim, best };
}

describe("PopulationSim", () => {
  it("improves best fitness monotonically and solves within the generation cap", () => {
    const { sim, best } = runToConvergence("session-alpha");
    // Monotonic non-decreasing (the (μ+λ) truncation guarantees elitism).
    for (let i = 1; i < best.length; i++) {
      expect(best[i]).toBeGreaterThanOrEqual(best[i - 1]);
    }
    // Actually learns: starts far from 1, ends essentially resolved.
    expect(best[0]).toBeLessThan(0.7);
    expect(sim.stats().bestFitness).toBeGreaterThanOrEqual(0.95);
  });

  it("is deterministic: same seed → identical population and stats", () => {
    const a = new PopulationSim("seed-xyz");
    const b = new PopulationSim("seed-xyz");
    for (let g = 0; g < 25; g++) {
      a.step();
      b.step();
    }
    expect(a.stats()).toEqual(b.stats());
    expect(a.population().map((g) => g.chars)).toEqual(b.population().map((g) => g.chars));
    expect(a.population().map((g) => g.fitness)).toEqual(b.population().map((g) => g.fitness));
  });

  it("different seeds converge to different genomes (distinct hidden targets)", () => {
    const { sim: a } = runToConvergence("seed-one");
    const { sim: b } = runToConvergence("seed-two");
    expect(a.population()[0].chars).not.toEqual(b.population()[0].chars);
  });

  it("keeps a stable population size and a valid, growing highlighted fraction", () => {
    const sim = new PopulationSim("frac");
    expect(sim.population()).toHaveLength(populationSize);
    expect(sim.population()[0].chars).toHaveLength(genomeLength);
    const f0 = sim.stats().highlightedFraction;
    for (let g = 0; g < maxGenerations; g++) sim.step();
    const f1 = sim.stats().highlightedFraction;
    expect(sim.population()).toHaveLength(populationSize);
    expect(f1).toBeGreaterThanOrEqual(f0);
    expect(f1).toBeLessThanOrEqual(1);
    // The whole field resolves once the target is found.
    expect(f1).toBeGreaterThan(0.5);
  });

  it("reset(seed) is reproducible from a fresh and a reused instance", () => {
    const fresh = new PopulationSim("reuse");
    const reused = new PopulationSim("throwaway");
    reused.reset("reuse");
    for (let g = 0; g < 10; g++) {
      fresh.step();
      reused.step();
    }
    expect(fresh.population().map((g) => g.chars)).toEqual(reused.population().map((g) => g.chars));
  });
});
