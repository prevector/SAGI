// The fabricated-usage generator. Deterministic given a seed: a seeded simplex
// field (already a dep, used by the marketing visuals) + a slow drift, sampled
// at a caller-supplied clock so it's a pure function of (t, intensity) — easy to
// unit-test and reproducible for a scripted demo. No Date.now() in here.
//
// `intensity` (0..1) is the continuous busy level — the MockSource eases it
// between 0 (idle) and 1 (running) so transitions read as a ramp, not a jump.

import { createNoise2D } from "simplex-noise";
import { makeRng } from "@sagi/evolution";

export interface UsageSample {
  cpuPct: number; // 0..100
  gpuPct: number; // 0..100
  throughput: number; // evals/sec (>= 0), ~0 when idle
}

// Usage bands the intensity blends between. Idle is a low, calm twitch; busy is
// a high, livelier band — "your machine doing work".
const BAND = {
  idleLow: 4,
  idleHigh: 18,
  busyLow: 55,
  busyHigh: 92,
};

const SPEED_BASE = 0.07; // noise advance per second when idle (slow drift)
const SPEED_EXTRA = 0.22; // added at intensity = 1 (livelier under load)
const THROUGHPUT_PEAK = 420; // evals/sec at full load, before per-sample jitter

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clampPct = (v: number) => Math.max(0, Math.min(100, v));

/** A seeded usage signal. `sample` is pure in (tMs, intensity). */
export function createSignal(seed: string) {
  // Distinct seeded fields per channel so CPU and GPU move independently.
  const cpuNoise = createNoise2D(makeRng(`${seed}:cpu`));
  const gpuNoise = createNoise2D(makeRng(`${seed}:gpu`));

  /** Map a unit noise reading + an intensity to a percentage in its band. */
  const toPct = (n01: number, intensity: number) => {
    const lo = lerp(BAND.idleLow, BAND.busyLow, intensity);
    const hi = lerp(BAND.idleHigh, BAND.busyHigh, intensity);
    return clampPct(lerp(lo, hi, n01));
  };

  return {
    sample(tMs: number, intensity: number): UsageSample {
      const i = Math.max(0, Math.min(1, intensity));
      const t = (tMs / 1000) * (SPEED_BASE + SPEED_EXTRA * i);

      // simplex returns [-1, 1]; fold to [0, 1].
      const cpuN = cpuNoise(t, 0) * 0.5 + 0.5;
      // GPU lags CPU slightly (time offset) and rides a touch lower.
      const gpuN = gpuNoise(t - 0.6, 10) * 0.5 + 0.5;

      const cpuPct = toPct(cpuN, i);
      const gpuPct = toPct(gpuN, i * 0.92);
      const throughput = Math.round(i * THROUGHPUT_PEAK * (0.6 + 0.4 * cpuN));

      return { cpuPct, gpuPct, throughput };
    },
  };
}

export type Signal = ReturnType<typeof createSignal>;
