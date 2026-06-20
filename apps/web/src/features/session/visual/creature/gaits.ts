// Gaits — per-leg phase offsets that produce a believable walk for each leg
// count, plus the foot-cycle and body-bob math the animator uses. Leg index
// order from the assembler is [pair0 L, pair0 R, pair1 L, pair1 R, ...]; so
// pair = floor(i/2) (0 = front) and side = i % 2 (0 = left, 1 = right).
//
//   2 legs  — biped: left/right strictly alternate.
//   4 legs  — quadruped trot: diagonal pairs move together.
//   6 legs  — hexapod tripod: two alternating tripods (always 3 feet down).
//   8 legs  — octopod metachronal wave: a step ripples front-to-back.

import type { Vec3 } from "./assemble";

export type LegCount = 2 | 4 | 6 | 8;

export interface Gait {
  /** Phase offset in [0,1) for a given leg. */
  footPhase(legIndex: number, legCount: LegCount): number;
}

const biped: Gait = {
  footPhase: (i) => (i % 2) * 0.5,
};

// Diagonal: phase depends on (pair + side) parity. Front-left + back-right step
// together; front-right + back-left step on the opposite half-cycle.
const diagonal: Gait = {
  footPhase: (i) => {
    const pair = Math.floor(i / 2);
    const side = i % 2;
    return ((pair + side) % 2) * 0.5;
  },
};

// Metachronal wave: alternating-by-parity base plus a small per-pair delay so
// the step visibly ripples down the body.
const wave: Gait = {
  footPhase: (i) => {
    const pair = Math.floor(i / 2);
    const side = i % 2;
    const base = side * 0.5;
    return (base + pair * 0.22) % 1;
  },
};

export function gaitFor(legCount: LegCount): Gait {
  switch (legCount) {
    case 2:
      return biped;
    case 4:
      return diagonal;
    case 6:
      return diagonal; // reads as a tripod with 3 pairs
    case 8:
      return wave;
  }
}

/** Step tuning shared by the animator. */
export const STEP = {
  /** Steps per second at unit walk speed. */
  frequency: 1.6,
  /** Fraction of the cycle a foot is in the air. */
  swingFraction: 0.42,
  /** Forward stride length (creature local Z), scaled by size. */
  stride: 0.32,
  /** Peak foot lift during swing, scaled by size. */
  lift: 0.18,
} as const;

/**
 * Foot offset (relative to its rest target) for a leg at cycle position
 * `cycle` in [0,1): during swing the foot lifts on a sine arc and travels
 * back→front; during stance it stays grounded and slides front→back.
 */
export function footCycleOffset(cycle: number, stride: number, lift: number): Vec3 {
  const swing = STEP.swingFraction;
  if (cycle < swing) {
    const u = cycle / swing; // 0..1 through the air
    return [0, Math.sin(u * Math.PI) * lift, -stride / 2 + u * stride];
  }
  const u = (cycle - swing) / (1 - swing); // 0..1 on the ground
  return [0, 0, stride / 2 - u * stride];
}

/** Vertical body bob: rises twice per stride cycle (a foot-plant beat). */
export function bodyBob(t: number, freq: number, amp: number): number {
  return Math.abs(Math.sin(t * freq * Math.PI)) * amp;
}
