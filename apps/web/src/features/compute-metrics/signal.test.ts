import { describe, expect, it } from "vitest";
import { createSignal } from "./signal";

describe("createSignal", () => {
  it("is deterministic given a seed", () => {
    const a = createSignal("demo");
    const b = createSignal("demo");
    for (const t of [0, 250, 1000, 9999]) {
      expect(a.sample(t, 0.5)).toEqual(b.sample(t, 0.5));
    }
  });

  it("differs across seeds", () => {
    const a = createSignal("seed-a").sample(1234, 0.5);
    const b = createSignal("seed-b").sample(1234, 0.5);
    expect(a).not.toEqual(b);
  });

  it("keeps every percentage in 0..100", () => {
    const s = createSignal("range");
    for (let t = 0; t < 60000; t += 137) {
      for (const i of [0, 0.5, 1]) {
        const { cpuPct, gpuPct, throughput } = s.sample(t, i);
        expect(cpuPct).toBeGreaterThanOrEqual(0);
        expect(cpuPct).toBeLessThanOrEqual(100);
        expect(gpuPct).toBeGreaterThanOrEqual(0);
        expect(gpuPct).toBeLessThanOrEqual(100);
        expect(throughput).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("reads idle-low and busy-high on average", () => {
    const s = createSignal("bias");
    let idle = 0;
    let busy = 0;
    const N = 400;
    for (let k = 0; k < N; k++) {
      const t = k * 200;
      idle += s.sample(t, 0).cpuPct;
      busy += s.sample(t, 1).cpuPct;
    }
    expect(idle / N).toBeLessThan(25);
    expect(busy / N).toBeGreaterThan(55);
  });

  it("emits no throughput when idle and some under load", () => {
    const s = createSignal("tp");
    expect(s.sample(5000, 0).throughput).toBe(0);
    expect(s.sample(5000, 1).throughput).toBeGreaterThan(0);
  });
});
