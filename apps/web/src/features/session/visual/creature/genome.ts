// MorphologyGenome — the seeded "body plan" of a creature. Per PLAN-3D.md the
// morphology is FIXED for a session (derived once from session.id); only the
// brain evolves. This module just draws a diverse-but-on-brand body plan.
//
// Colour note: the accent hue is constrained to the TEAL family (cyan-teal
// band). Teal is the intelligence axis in DESIGN.md; orange is reserved for the
// goal/exit, so creatures never wear it. Variety comes from shape + hue jitter
// within teal, never from crossing into the orange (reward) meaning.

import { pick, range, rangeInt, type RNG } from "../rng";

export type BodyShape = "round" | "long" | "flat" | "tall";
export type FootStyle = "point" | "pad" | "claw";
export type HeadStyle = "snout" | "orb" | "crest";
export type SurfaceStyle = "solid" | "faceted" | "wire";

export interface MorphologyGenome {
  bodySegments: number; // 2..5 spheres along the spine
  bodyShape: BodyShape;
  size: number; // overall scale multiplier
  legPairs: 1 | 2 | 3 | 4; // => 2 / 4 / 6 / 8 legs
  legSegments: number; // visual subdivisions per limb (IK is always 2-bone)
  legLength: number;
  legSpread: number; // how far feet plant from the body
  feet: FootStyle;
  arms?: { pairs: number; segments: number };
  head: HeadStyle;
  eyes: number;
  tail?: { segments: number; length: number };
  /** Hue in degrees, constrained to the teal/cyan band (150..195). */
  accentHue: number;
  surface: SurfaceStyle;
}

const BODY_SHAPES: readonly BodyShape[] = ["round", "long", "flat", "tall"];
const FEET: readonly FootStyle[] = ["point", "pad", "claw"];
const HEADS: readonly HeadStyle[] = ["snout", "orb", "crest"];
// "wire" kept rare — it reads as a special variant, not the default look.
const SURFACES: readonly SurfaceStyle[] = ["solid", "solid", "faceted", "wire"];

/** Draw a complete, deterministic morphology from a seeded RNG. */
export function genomeFromSeed(rng: RNG): MorphologyGenome {
  const legPairs = rangeInt(rng, 1, 4) as 1 | 2 | 3 | 4;
  const hasTail = rng() < 0.6;
  const hasArms = legPairs <= 2 && rng() < 0.45; // bipeds/quadrupeds may get arms

  return {
    bodySegments: rangeInt(rng, 2, 5),
    bodyShape: pick(rng, BODY_SHAPES),
    size: range(rng, 0.85, 1.25),
    legPairs,
    legSegments: rangeInt(rng, 2, 3),
    legLength: range(rng, 0.5, 0.95),
    legSpread: range(rng, 0.45, 0.85),
    feet: pick(rng, FEET),
    arms: hasArms ? { pairs: 1, segments: 2 } : undefined,
    head: pick(rng, HEADS),
    eyes: pick(rng, [1, 2, 2, 2, 3]),
    tail: hasTail ? { segments: rangeInt(rng, 2, 4), length: range(rng, 0.5, 1.1) } : undefined,
    accentHue: range(rng, 150, 195),
    surface: pick(rng, SURFACES),
  };
}

/** Total leg count (2/4/6/8) — the value gaits switch on. */
export function legCountOf(genome: MorphologyGenome): 2 | 4 | 6 | 8 {
  return (genome.legPairs * 2) as 2 | 4 | 6 | 8;
}

/** HSL -> #rrggbb. h in degrees, s/l in [0,1]. */
export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** The creature's accent colour from its genome (teal family). */
export function accentColor(genome: MorphologyGenome): string {
  return hslToHex(genome.accentHue, 0.7, 0.55);
}
