// Adapter: SDK candidate -> visual description of a combatant.
//
// This is the DROP-IN BOUNDARY for the real creature renderer. A teammate is
// building the actual <Creature>. When it lands, swap <Combatant> for <Creature>
// and have it consume this same `CombatantVisual` (or feed it `params` directly).
// Keeping the mapping here means the game loop never changes.

import type { CandidateParams } from "../sdk";

// Side colours, from the warm editorial palette (tokens.css). A = blue (compute),
// B = pink (signal) — matching the marketing swarm's passive/active mapping.
export const BLUE = "#3C7FA8"; // --blue-500
export const PINK = "#E07A97"; // --pink-500

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

// Normalize a 1..50 genome stat to 0..1.
const n = (v: number) => Math.max(0, Math.min(1, (v - 1) / 49));

export function combatantFromCandidate(params: CandidateParams, side: "a" | "b"): CombatantVisual {
  const rng = mulberry32(hashSeed(params.seed));
  // More neuron types → more orbiting nodes; more layers → wider orbits.
  const orbiterCount = Math.max(3, Math.min(14, Math.round(2 + n(params.neuronTypes) * 12)));
  const spread = 0.5 + n(params.layers) * 0.5;

  const orbiters: Orbiter[] = Array.from({ length: orbiterCount }, (_, i) => ({
    angle: (i / orbiterCount) * Math.PI * 2 + rng() * 0.6,
    radius: spread + rng() * 0.4,
    // Synapse-state params nudge node size.
    size: 0.06 + n(params.synapseStateParams) * 0.06 + rng() * 0.03,
    speed: 0.4 + rng() * 0.8,
  }));

  return {
    color: side === "a" ? BLUE : PINK,
    // Params-per-neuron drives core size.
    coreScale: 0.42 + n(params.neuronParams) * 0.4,
    orbiters,
    // Update-rule complexity drives the base glow. Note: NONE of these leak the
    // hidden trueScore — the genome is independent of performance by design.
    glow: 1.15 + n(params.updateComplexity) * 0.5,
    seed: params.seed,
  };
}
