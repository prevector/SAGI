// Capped, decaying emission — the supply curve. All integer (base units), so
// the cap provably holds: each epoch's reward is floored, so the running sum
// never exceeds the exact geometric total E0/(1-r).

import { type Base, toBase } from "./money.js";
import type { EmissionConfig, LedgerMode } from "./types.js";

// Fixed-point scale for the decay factor r (6 digits is plenty for r=0.95).
const R_SCALE = 1_000_000n;

function rFraction(r: number): { num: bigint; den: bigint } {
  if (!(r > 0 && r < 1)) throw new Error(`emission: r must be in (0,1), got ${r}`);
  return { num: BigInt(Math.round(r * Number(R_SCALE))), den: R_SCALE };
}

/** Total geometric emission cap: E0 / (1 - r) = E0 * den / (den - num). */
export function geometricCap(E0: Base, r: number): Base {
  const { num, den } = rFraction(r);
  return (E0 * den) / (den - num);
}

/** Reward pool minted at a given epoch (base units). */
export function emission(epoch: number, cfg: EmissionConfig): Base {
  if (epoch < 0) return 0n;
  if (cfg.model === "halving") {
    const period = cfg.halvingPeriod ?? 1;
    const halvings = BigInt(Math.floor(epoch / Math.max(1, period)));
    return cfg.E0 / 2n ** halvings;
  }
  // geometric: E(k) = floor(E0 * r^k) = floor(E0 * num^k / den^k)
  const { num, den } = rFraction(cfg.r);
  const k = BigInt(epoch);
  return (cfg.E0 * num ** k) / den ** k;
}

/** Cumulative emission through (and including) `epoch`. */
export function cumulativeEmission(epoch: number, cfg: EmissionConfig): Base {
  let total = 0n;
  for (let k = 0; k <= epoch; k++) total += emission(k, cfg);
  return total;
}

/** Locked defaults: E0=1,050,000 SAGI, r=0.95 => cap = 21,000,000 SAGI. */
export function defaultEmissionConfig(mode: LedgerMode): EmissionConfig {
  const E0 = toBase(1_050_000);
  const r = 0.95;
  const epochMs = mode === "demo" ? 10_000 : 3_600_000; // 10s demo, 1h otherwise
  return { model: "geometric", E0, r, epochMs, cap: geometricCap(E0, r) };
}
