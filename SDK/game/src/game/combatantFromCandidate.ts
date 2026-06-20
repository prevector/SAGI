// Adapter: SDK candidate -> visual description of a combatant.
//
// This is the DROP-IN BOUNDARY for the real creature renderer. A teammate is
// building the actual <Creature>. When it lands, swap <Combatant> for <Creature>
// and have it consume this same `CombatantVisual` (or feed it `params` directly).
// Keeping the mapping here means the game loop never changes.

import type { CandidateParams } from "../sdk";

export const TEAL = "#17c4c4";
export const ORANGE = "#f0783d";

export interface Orbiter {
  /** starting angle around the core (radians) */
  angle: number;
  /** distance from the core */
  radius: number;
  /** node size */
  size: number;
  /** orbital speed multiplier */
  speed: number;
}

export interface CombatantVisual {
  color: string;
  /** core radius, derived from body width */
  coreScale: number;
  /** orbiting nodes, derived from layers/connections */
  orbiters: Orbiter[];
  /** base emissive intensity, subtly nudged by efficiency */
  glow: number;
  seed: string;
}

// Tiny deterministic RNG (mulberry32) seeded from the candidate seed string,
// so the same candidate always renders the same placeholder. No extra deps.
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function combatantFromCandidate(params: CandidateParams, side: "a" | "b"): CombatantVisual {
  const rng = mulberry32(hashSeed(params.seed));
  const orbiterCount = Math.max(3, Math.round(params.layers + params.connections * 4));

  const orbiters: Orbiter[] = Array.from({ length: orbiterCount }, (_, i) => ({
    angle: (i / orbiterCount) * Math.PI * 2 + rng() * 0.6,
    radius: 0.55 + rng() * 0.5,
    size: 0.07 + rng() * 0.06,
    speed: 0.4 + rng() * 0.8,
  }));

  return {
    color: side === "a" ? TEAL : ORANGE,
    coreScale: 0.45 + params.width * 0.18,
    orbiters,
    // Note: keep glow subtle — do NOT leak the hidden trueScore. efficiency is public
    // anyway, but the duel pairs adjacent scores so both sides read as comparable.
    glow: 1.2 + params.efficiency * 0.4,
    seed: params.seed,
  };
}
