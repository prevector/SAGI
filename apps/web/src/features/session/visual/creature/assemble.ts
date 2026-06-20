// Assembles a MorphologyGenome into a concrete rig: body segment transforms,
// leg chains with 2-bone analytic IK, head, eyes, and an optional tail. Pure
// tuple math (no three.js) so it's cheap and unit-testable headless.
//
// Local frame: forward = +Z (head), up = +Y, right = +X. Feet plant on y = 0;
// the body floats at `standHeight`. The whole creature group is later rotated
// to face its travel direction and positioned in the maze.

import type { MorphologyGenome } from "./genome";
import { accentColor, legCountOf } from "./genome";

export type Vec3 = [number, number, number];

/* ------------------------------ vector math ------------------------------- */

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * Analytic 2-bone IK. Given a hip anchor, a foot target, and the two bone
 * lengths, returns the knee position. `bendDir` biases which way the joint
 * folds (up = knee lifts, like a spider/insect leg).
 */
export function solveIK2Bone(
  hip: Vec3,
  foot: Vec3,
  l1: number,
  l2: number,
  bendDir: Vec3 = [0, 1, 0]
): Vec3 {
  const toFoot = sub(foot, hip);
  let d = len(toFoot);
  // Keep within the reachable annulus so acos is defined.
  d = clamp(d, Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
  const dir = norm(toFoot);
  // Cosine rule: angle at the hip between hip->foot and hip->knee.
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const alpha = Math.acos(cosA);
  // Perpendicular component in the bend plane (bendDir orthogonalised to dir).
  let perp = sub(bendDir, scale(dir, dot(bendDir, dir)));
  if (len(perp) < 1e-5) perp = [0, 1, 0]; // degenerate: pick up
  perp = norm(perp);
  return add(hip, add(scale(dir, l1 * Math.cos(alpha)), scale(perp, l1 * Math.sin(alpha))));
}

/* --------------------------------- rig ------------------------------------ */

export interface BodySegment {
  pos: Vec3;
  radius: Vec3; // ellipsoid radii (x,y,z) for shape variety
}

export interface LegRig {
  side: -1 | 1;
  index: number; // 0 = front-most pair
  hip: Vec3;
  /** Rest foot target (gait perturbs this around its rest point). */
  restFoot: Vec3;
  upperLen: number;
  lowerLen: number;
  bendDir: Vec3;
}

export interface CreatureRig {
  genome: MorphologyGenome;
  scale: number;
  standHeight: number;
  bodyRadius: number; // nominal, for collisions/scaling cues
  segments: BodySegment[];
  head: { pos: Vec3; radius: number };
  eyes: Vec3[];
  legs: LegRig[];
  tail?: Vec3[]; // joint positions back -> tip
  color: string;
}

function shapeRadii(shape: MorphologyGenome["bodyShape"], base: number): Vec3 {
  switch (shape) {
    case "round":
      return [base, base, base];
    case "long":
      return [base * 0.8, base * 0.8, base * 1.05];
    case "flat":
      return [base * 1.2, base * 0.65, base];
    case "tall":
      return [base * 0.8, base * 1.3, base * 0.85];
  }
}

export function assemble(genome: MorphologyGenome): CreatureRig {
  const s = genome.size;
  const legReach = genome.legLength * s;
  const upperLen = legReach * 0.62;
  const lowerLen = legReach * 0.62;
  const totalReach = upperLen + lowerLen;
  // Stand tall enough to read as a standing creature, but keep legs bent.
  const standHeight = Math.min(legReach * 0.82, totalReach * 0.82);
  const baseRadius = 0.28 * s;

  // Spine along Z. Body length scales with segment count and shape.
  const lengthFactor = genome.bodyShape === "long" ? 1.25 : genome.bodyShape === "round" ? 0.85 : 1;
  const bodyLen = (genome.bodySegments - 1) * 0.42 * s * lengthFactor + 1e-3;
  const zFront = bodyLen / 2;

  const segments: BodySegment[] = [];
  for (let i = 0; i < genome.bodySegments; i++) {
    const t = genome.bodySegments === 1 ? 0.5 : i / (genome.bodySegments - 1);
    const z = -bodyLen / 2 + t * bodyLen;
    // Taper a little toward the tail.
    const taper = 0.8 + 0.2 * (1 - Math.abs(t - 0.4));
    segments.push({ pos: [0, standHeight, z], radius: shapeRadii(genome.bodyShape, baseRadius * taper) });
  }

  // Head just ahead of the front segment.
  const headRadius = baseRadius * (genome.head === "orb" ? 0.95 : 0.7);
  const headZ = zFront + headRadius * (genome.head === "snout" ? 1.4 : 1.0);
  const headPos: Vec3 = [0, standHeight + (genome.head === "crest" ? 0.1 : 0.02), headZ];

  // Eyes on the front of the head.
  const eyes: Vec3[] = [];
  if (genome.eyes === 1) {
    eyes.push([0, headPos[1] + headRadius * 0.3, headZ + headRadius * 0.7]);
  } else {
    const span = headRadius * 0.5;
    const n = genome.eyes;
    for (let i = 0; i < n; i++) {
      const off = n === 2 ? (i === 0 ? -span : span) : (i - (n - 1) / 2) * span;
      eyes.push([off, headPos[1] + headRadius * 0.3, headZ + headRadius * 0.6]);
    }
  }

  // Legs: pairs distributed along the body length.
  const legs: LegRig[] = [];
  const pairs = genome.legPairs;
  const hipX = baseRadius * 0.9;
  const footX = hipX + genome.legSpread * s * 0.78;
  for (let p = 0; p < pairs; p++) {
    const t = pairs === 1 ? 0.5 : p / (pairs - 1);
    // Spread hips between front and back, biased to stay under the body.
    const z = -bodyLen * 0.35 + t * bodyLen * 0.7;
    for (const side of [-1, 1] as const) {
      const hip: Vec3 = [side * hipX, standHeight * 0.95, z];
      const restFoot: Vec3 = [side * footX, 0, z + 0.04 * s];
      // Knees bend up-and-outward.
      const bendDir: Vec3 = norm([side * 0.6, 1, 0]);
      legs.push({ side, index: p, hip, restFoot, upperLen, lowerLen, bendDir });
    }
  }

  // Tail: a chain trailing behind, drooping toward the ground.
  let tail: Vec3[] | undefined;
  if (genome.tail) {
    tail = [];
    const segLen = (genome.tail.length * s) / genome.tail.segments;
    let p: Vec3 = [0, standHeight, -bodyLen / 2];
    tail.push(p);
    for (let i = 0; i < genome.tail.segments; i++) {
      p = add(p, [0, -segLen * 0.25, -segLen]);
      tail.push(p);
    }
  }

  return {
    genome,
    scale: s,
    standHeight,
    bodyRadius: baseRadius,
    segments,
    head: { pos: headPos, radius: headRadius },
    eyes,
    legs,
    tail,
    color: accentColor(genome),
  };
}

/** Convenience re-export so callers don't reach into genome for the count. */
export { legCountOf };
