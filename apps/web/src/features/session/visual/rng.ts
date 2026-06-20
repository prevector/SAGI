// Deterministic RNG for the whole visual. Everything random — morphology, maze,
// GA population — derives from `seed = session.id`, so the same session always
// produces the same creature + maze + evolution trajectory (the determinism
// guarantee in PLAN-3D.md §5).
//
// We derive *separate* sub-streams per subsystem (`":morph"`, `":maze"`,
// `":ga"`) so that adding or removing one subsystem's random draws doesn't
// shift the others' sequences.

import seedrandom from "seedrandom";

/** A deterministic [0,1) generator. Matches `Math.random`'s call signature. */
export type RNG = () => number;

/** Create a deterministic RNG from a string seed. */
export function makeRng(seed: string): RNG {
  // `seedrandom(seed)` returns a PRNG function; state is self-contained.
  return seedrandom(seed);
}

/** Derive a named sub-stream so subsystems don't perturb each other. */
export function subRng(seed: string, stream: string): RNG {
  return makeRng(`${seed}:${stream}`);
}

/* ----------------------------- small helpers ------------------------------ */

/** Uniform float in [min, max). */
export function range(rng: RNG, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Uniform integer in [min, max] inclusive. */
export function rangeInt(rng: RNG, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

/** Pick a random element. */
export function pick<T>(rng: RNG, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Approximately-normal sample via central limit (sum of 3 uniforms). */
export function gaussian(rng: RNG, mean = 0, std = 1): number {
  const u = rng() + rng() + rng() - 1.5; // mean 0, ~unit-ish spread
  return mean + (u / 1.5) * std;
}
