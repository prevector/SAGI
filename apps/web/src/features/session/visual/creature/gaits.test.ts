import { describe, expect, it } from "vitest";
import { STEP, bodyBob, footCycleOffset, gaitFor, type LegCount } from "./gaits";

function phases(legCount: LegCount): number[] {
  const g = gaitFor(legCount);
  return Array.from({ length: legCount }, (_, i) => g.footPhase(i, legCount));
}

describe("gait phases", () => {
  it("keeps all phases in [0,1)", () => {
    for (const lc of [2, 4, 6, 8] as const) {
      for (const p of phases(lc)) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThan(1);
      }
    }
  });

  it("biped strictly alternates left/right", () => {
    expect(phases(2)).toEqual([0, 0.5]);
  });

  it("quadruped uses a diagonal trot", () => {
    // [p0L, p0R, p1L, p1R] => diagonals share a phase
    expect(phases(4)).toEqual([0, 0.5, 0.5, 0]);
  });

  it("hexapod forms two tripods of three", () => {
    const p = phases(6);
    const down = p.filter((x) => x === 0).length;
    const up = p.filter((x) => x === 0.5).length;
    expect(down).toBe(3);
    expect(up).toBe(3);
  });

  it("octopod ripples (more than two distinct phases)", () => {
    const distinct = new Set(phases(8));
    expect(distinct.size).toBeGreaterThan(2);
  });
});

describe("foot cycle + bob", () => {
  it("lifts the foot mid-swing and grounds it during stance", () => {
    const stride = 0.3;
    const lift = 0.2;
    const startSwing = footCycleOffset(0, stride, lift);
    const midSwing = footCycleOffset(STEP.swingFraction / 2, stride, lift);
    const stance = footCycleOffset(STEP.swingFraction + 0.2, stride, lift);
    expect(startSwing[1]).toBeCloseTo(0); // just lifting off
    expect(midSwing[1]).toBeGreaterThan(0); // airborne
    expect(stance[1]).toBeCloseTo(0); // planted
  });

  it("foot travels back->front in swing, front->back in stance", () => {
    const s = footCycleOffset(0, 0.3, 0.2);
    const e = footCycleOffset(STEP.swingFraction - 1e-3, 0.3, 0.2);
    expect(s[2]).toBeLessThan(e[2]); // moved forward through the air
  });

  it("body bob stays within [0, amp]", () => {
    for (let t = 0; t < 5; t += 0.1) {
      const b = bodyBob(t, 1.6, 0.05);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(0.05 + 1e-9);
    }
  });
});
