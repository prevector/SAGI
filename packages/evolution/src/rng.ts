import seedrandom from "seedrandom";

export type RNG = () => number;

export function makeRng(seed: string): RNG {
  return seedrandom(seed);
}

export function subRng(seed: string, stream: string): RNG {
  return makeRng(`${seed}:${stream}`);
}

export function range(rng: RNG, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function rangeInt(rng: RNG, min: number, max: number): number {
  return Math.floor(range(rng, min, max + 1));
}

export function pick<T>(rng: RNG, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

export function gaussian(rng: RNG, mean = 0, std = 1): number {
  const u = rng() + rng() + rng() - 1.5;
  return mean + (u / 1.5) * std;
}
