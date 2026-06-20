// Proof of Useful Work calculator (pure). Reward scales with compute x
// usefulness, bounded by the epoch's decaying emission pool. Integer math
// throughout; the floored proportional split is made exact by assigning the
// rounding remainder to the largest-work address, so the minted total equals
// the epoch pool precisely (no minting drift, cap stays intact).

import type { Base } from "./money.js";
import { emission } from "./emission.js";
import type { Address, EmissionConfig, WorkReceipt } from "./types.js";

// Fixed-point scale so a fractional `usefulness` contributes to integer weights.
const WORK_SCALE = 1_000_000;

/**
 * Split epoch emission across contributors by work share.
 *   work_i  = computeUnits_i * usefulness_i
 *   reward_i = E(epoch) * work_i / Σ_j work_j
 * Returns address -> reward (base units). Σ rewards === E(epoch) exactly when
 * there is positive work; an empty/zero-work epoch mints nothing.
 */
export function epochRewards(
  receipts: WorkReceipt[],
  epoch: number,
  cfg: EmissionConfig
): Map<Address, Base> {
  const out = new Map<Address, Base>();
  if (receipts.length === 0) return out;

  // Aggregate integer work weight per address (a contributor may have several).
  const weights = new Map<Address, bigint>();
  let total = 0n;
  for (const r of receipts) {
    const w = BigInt(Math.max(0, Math.round(r.computeUnits * r.usefulness * WORK_SCALE)));
    weights.set(r.address, (weights.get(r.address) ?? 0n) + w);
    total += w;
  }

  const pool = emission(epoch, cfg);
  if (total === 0n || pool === 0n) {
    for (const a of weights.keys()) out.set(a, 0n);
    return out;
  }

  // Floored proportional split; track the largest-weight address for remainder.
  let distributed = 0n;
  let topAddr: Address | null = null;
  let topW = -1n;
  for (const [addr, w] of weights) {
    const reward = (pool * w) / total;
    out.set(addr, reward);
    distributed += reward;
    // Deterministic tie-break: larger weight, then lexicographically first.
    if (w > topW || (w === topW && (topAddr === null || addr < topAddr))) {
      topW = w;
      topAddr = addr;
    }
  }

  const remainder = pool - distributed;
  if (remainder > 0n && topAddr !== null) {
    out.set(topAddr, (out.get(topAddr) ?? 0n) + remainder);
  }
  return out;
}
