import { describe, expect, it } from "vitest";
import { subRng } from "../rng";
import {
  type MorphologyGenome,
  accentColor,
  genomeFromSeed,
  legCountOf,
} from "./genome";
import { assemble, solveIK2Bone, type Vec3 } from "./assemble";

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function genomeWithPairs(pairs: 1 | 2 | 3 | 4): MorphologyGenome {
  return {
    bodySegments: 3,
    bodyShape: "round",
    size: 1,
    legPairs: pairs,
    legSegments: 2,
    legLength: 0.8,
    legSpread: 0.6,
    feet: "pad",
    head: "orb",
    eyes: 2,
    accentHue: 175,
    surface: "solid",
  };
}

describe("morphology genome", () => {
  it("is deterministic for a given seed", () => {
    const a = genomeFromSeed(subRng("s-1", "morph"));
    const b = genomeFromSeed(subRng("s-1", "morph"));
    expect(a).toEqual(b);
  });

  it("produces diversity and reaches all 2/4/6/8 leg counts across seeds", () => {
    const sigs = new Set<string>();
    const legCounts = new Set<number>();
    for (let i = 0; i < 120; i++) {
      const g = genomeFromSeed(subRng(`seed-${i}`, "morph"));
      sigs.add(JSON.stringify(g));
      legCounts.add(legCountOf(g));
    }
    expect(sigs.size).toBeGreaterThan(50); // clearly diverse
    expect([...legCounts].sort()).toEqual([2, 4, 6, 8]);
  });

  it("constrains accent hue to the teal band and yields a valid hex", () => {
    for (let i = 0; i < 40; i++) {
      const g = genomeFromSeed(subRng(`hue-${i}`, "morph"));
      expect(g.accentHue).toBeGreaterThanOrEqual(150);
      expect(g.accentHue).toBeLessThanOrEqual(195);
      expect(accentColor(g)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("assembly", () => {
  it("assembles 2/4/6/8-leg bodies with the right leg count", () => {
    for (const pairs of [1, 2, 3, 4] as const) {
      const rig = assemble(genomeWithPairs(pairs));
      expect(rig.legs).toHaveLength(pairs * 2);
      expect(rig.standHeight).toBeGreaterThan(0);
      // Feet rest on the ground; hips are above ground.
      for (const leg of rig.legs) {
        expect(leg.restFoot[1]).toBeCloseTo(0);
        expect(leg.hip[1]).toBeGreaterThan(0);
      }
    }
  });

  it("produces finite geometry for many random genomes", () => {
    for (let i = 0; i < 60; i++) {
      const rig = assemble(genomeFromSeed(subRng(`r-${i}`, "morph")));
      const all = [
        ...rig.segments.flatMap((s) => [...s.pos, ...s.radius]),
        ...rig.head.pos,
        ...rig.eyes.flat(),
        ...rig.legs.flatMap((l) => [...l.hip, ...l.restFoot]),
        ...(rig.tail ?? []).flat(),
      ];
      expect(all.every((v) => Number.isFinite(v))).toBe(true);
    }
  });
});

describe("2-bone IK", () => {
  it("places the knee at the correct bone lengths from hip and foot", () => {
    const hip: Vec3 = [0, 1, 0];
    const foot: Vec3 = [0.6, 0, 0];
    const l1 = 0.6;
    const l2 = 0.6;
    const knee = solveIK2Bone(hip, foot, l1, l2);
    expect(dist(hip, knee)).toBeCloseTo(l1, 4);
    expect(dist(knee, foot)).toBeCloseTo(l2, 4);
  });

  it("stays finite when the target is out of reach (clamped)", () => {
    const hip: Vec3 = [0, 1, 0];
    const farFoot: Vec3 = [10, 0, 0]; // unreachable
    const knee = solveIK2Bone(hip, farFoot, 0.6, 0.6);
    expect(knee.every((v) => Number.isFinite(v))).toBe(true);
  });

  it("bends the knee toward bendDir (up by default)", () => {
    const hip: Vec3 = [0, 1, 0];
    const foot: Vec3 = [0.8, 0, 0];
    const knee = solveIK2Bone(hip, foot, 0.6, 0.6, [0, 1, 0]);
    // The straight-line midpoint height is 0.5; an up-bent knee sits above it.
    expect(knee[1]).toBeGreaterThan(0.5);
  });
});
