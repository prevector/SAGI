// PopulationSim — a deterministic, ES-like string-evolution sim (headless).
//
// Real selection / crossover / mutation over glyph strings (PLAN-TRAIN-ANIM §4),
// not faked. A (μ+λ) loop: from the current population of μ genomes, generate λ
// offspring via tournament selection + segment crossover + mutation, then keep
// the best μ. Combining parents with offspring before truncation makes
// bestFitness monotonic non-decreasing (elitism is automatic) and converges to
// the hidden per-seed target within maxGenerations. λ ≫ μ so the displayed
// population (the fittest μ) shows a clean noise→signal gradient while the HUD's
// evaluations/sec reflects the real work (λ rollouts per generation).

import { makeRng, subRng, pick, rangeInt, type RNG } from "../rng";
import { TRAIN_CONFIG } from "../config";
import type { Genome, PopulationSim as IPopulationSim, PopulationStats, Seed } from "./types";
import { similarity, lockedMask } from "./fitness";

interface Individual {
  id: string;
  chars: string;
  fitness: number;
  age: number;
}

const C = TRAIN_CONFIG.sim;
const CHARS = TRAIN_CONFIG.charset;
/** Offspring per generation (λ). Larger than μ for reliable, fast convergence. */
const OFFSPRING = 160;

function randomString(rng: RNG, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += pick(rng, CHARS as unknown as readonly string[]);
  return s;
}

export class PopulationSim implements IPopulationSim {
  private target = "";
  private pop: Individual[] = [];
  private gen = 0;
  private gaRng: RNG = makeRng("uninit");
  private nextId = 0;

  constructor(seed?: Seed) {
    if (seed !== undefined) this.reset(seed);
  }

  reset(seed: Seed): void {
    this.target = randomString(subRng(seed, "target"), C.genomeLength);
    this.gaRng = subRng(seed, "ga");
    this.gen = 0;
    this.nextId = 0;
    this.pop = [];
    for (let i = 0; i < C.populationSize; i++) {
      const chars = randomString(subRng(seed, `init:${i}`), C.genomeLength);
      this.pop.push({ id: this.id(), chars, fitness: similarity(chars, this.target), age: 0 });
    }
    this.sort();
  }

  step(): void {
    const offspring: Individual[] = [];
    for (let k = 0; k < OFFSPRING; k++) {
      const a = this.tournament();
      const b = this.tournament();
      const fitter = a.fitness >= b.fitness ? a : b;
      const other = fitter === a ? b : a;
      let chars = this.crossover(fitter.chars, other.chars);
      // Fitter parents preserve more (resolved genomes scramble less), but every
      // child still explores — this is what fixes the last wrong positions.
      const rate = C.mutationRate * (1 - 0.5 * fitter.fitness);
      chars = this.mutate(chars, rate);
      offspring.push({ id: this.id(), chars, fitness: similarity(chars, this.target), age: 0 });
    }
    // (μ+λ): survivors carry their identity (and age++); offspring start at 0.
    for (const ind of this.pop) ind.age++;
    this.pop = this.pop.concat(offspring);
    this.sort();
    this.pop.length = C.populationSize;
    this.gen++;
  }

  population(): readonly Genome[] {
    const threshold = C.highlightThreshold;
    return this.pop.map((ind) => ({
      id: ind.id,
      chars: ind.chars,
      fitness: ind.fitness,
      highlighted: ind.fitness >= threshold,
      age: ind.age,
      locked: lockedMask(ind.chars, this.target),
    }));
  }

  stats(): PopulationStats {
    const threshold = C.highlightThreshold;
    const highlighted = this.pop.reduce((n, ind) => n + (ind.fitness >= threshold ? 1 : 0), 0);
    return {
      generation: this.gen,
      bestFitness: this.pop.length ? this.pop[0].fitness : 0,
      populationSize: this.pop.length,
      evaluationsPerSec: 0, // filled by the driver (knows generations/sec)
      highlightedFraction: this.pop.length ? highlighted / this.pop.length : 0,
    };
  }

  /** Rollouts evaluated per generation (λ) — for the driver's evals/sec readout. */
  evaluationsPerGeneration(): number {
    return OFFSPRING;
  }

  // --- internals ---

  private id(): string {
    return `g${this.nextId++}`;
  }

  private sort(): void {
    this.pop.sort((x, y) => y.fitness - x.fitness);
  }

  /** Tournament selection over the (sorted) population — lower index = fitter. */
  private tournament(): Individual {
    let best = rangeInt(this.gaRng, 0, this.pop.length - 1);
    for (let i = 1; i < C.tournament; i++) {
      const c = rangeInt(this.gaRng, 0, this.pop.length - 1);
      if (c < best) best = c; // sorted, so smaller index is fitter
    }
    return this.pop[best];
  }

  /** Copy a contiguous run from the fitter parent into the other (propagation). */
  private crossover(fitterChars: string, otherChars: string): string {
    const L = C.genomeLength;
    const arr = otherChars.split("");
    const s = rangeInt(this.gaRng, 0, L - 1);
    const len = rangeInt(this.gaRng, 1, L - s);
    for (let i = s; i < s + len; i++) arr[i] = fitterChars[i];
    return arr.join("");
  }

  private mutate(chars: string, rate: number): string {
    const arr = chars.split("");
    for (let i = 0; i < arr.length; i++) {
      if (this.gaRng() < rate) arr[i] = pick(this.gaRng, CHARS as unknown as readonly string[]);
    }
    return arr.join("");
  }
}
