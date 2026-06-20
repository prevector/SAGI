import { describe, expect, it } from "vitest";
import { ONE, toBase } from "./money.js";
import {
  cumulativeEmission,
  defaultEmissionConfig,
  emission,
  geometricCap,
} from "./emission.js";
import type { EmissionConfig } from "./types.js";

const cfg = defaultEmissionConfig("sandbox");

describe("emission (geometric)", () => {
  it("E(0) equals E0", () => {
    expect(emission(0, cfg)).toBe(cfg.E0);
    expect(cfg.E0).toBe(toBase(1_050_000));
  });

  it("cap is E0/(1-r) = 21,000,000 SAGI for the locked defaults", () => {
    expect(cfg.cap).toBe(21_000_000n * ONE);
    expect(geometricCap(cfg.E0, cfg.r)).toBe(cfg.cap);
  });

  it("is monotonically non-increasing", () => {
    let prev = emission(0, cfg);
    for (let k = 1; k < 200; k++) {
      const e = emission(k, cfg);
      expect(e <= prev).toBe(true);
      prev = e;
    }
  });

  it("cumulative emission never exceeds the cap", () => {
    // Far past convergence: floored terms keep the running sum strictly < cap.
    expect(cumulativeEmission(1000, cfg) <= cfg.cap).toBe(true);
  });

  it("cumulative emission approaches the cap", () => {
    const total = cumulativeEmission(1000, cfg);
    // Within 0.001% of the cap after 1000 epochs.
    const gap = cfg.cap - total;
    expect(gap >= 0n).toBe(true);
    expect(gap < cfg.cap / 100_000n).toBe(true);
  });

  it("negative epochs emit nothing", () => {
    expect(emission(-1, cfg)).toBe(0n);
  });

  it("is deterministic", () => {
    expect(emission(37, cfg)).toBe(emission(37, cfg));
  });
});

describe("emission (halving alt)", () => {
  const h: EmissionConfig = {
    model: "halving",
    E0: toBase(1000),
    r: 0.95,
    epochMs: 1000,
    cap: toBase(1000),
    halvingPeriod: 2,
  };

  it("halves every halvingPeriod epochs", () => {
    expect(emission(0, h)).toBe(toBase(1000));
    expect(emission(1, h)).toBe(toBase(1000));
    expect(emission(2, h)).toBe(toBase(500));
    expect(emission(3, h)).toBe(toBase(500));
    expect(emission(4, h)).toBe(toBase(250));
  });
});

describe("defaultEmissionConfig", () => {
  it("uses a short epoch in demo, long otherwise", () => {
    expect(defaultEmissionConfig("demo").epochMs).toBe(10_000);
    expect(defaultEmissionConfig("production").epochMs).toBe(3_600_000);
  });
});
