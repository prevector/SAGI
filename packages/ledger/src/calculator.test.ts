import { describe, expect, it } from "vitest";
import { sum } from "./money.js";
import { defaultEmissionConfig, emission } from "./emission.js";
import { epochRewards } from "./calculator.js";
import type { WorkReceipt } from "./types.js";

const cfg = defaultEmissionConfig("sandbox");

function receipt(address: string, computeUnits: number, usefulness = 1): WorkReceipt {
  return { sessionId: `s-${address}`, address, computeUnits, usefulness, ts: 0, nonce: "n", epoch: 0 };
}

describe("epochRewards", () => {
  it("returns empty for no receipts (nothing minted)", () => {
    expect(epochRewards([], 0, cfg).size).toBe(0);
  });

  it("gives the whole pool to a single contributor", () => {
    const out = epochRewards([receipt("sagi1a", 100)], 0, cfg);
    expect(out.get("sagi1a")).toBe(emission(0, cfg));
  });

  it("splits proportionally to compute x usefulness", () => {
    // a does 3x the work of b -> a gets ~3x the reward.
    const out = epochRewards([receipt("sagi1a", 300), receipt("sagi1b", 100)], 0, cfg);
    const a = out.get("sagi1a")!;
    const b = out.get("sagi1b")!;
    // a should be ~3*b (exact ratio up to remainder assignment).
    expect(a > b * 2n).toBe(true);
    expect(a < b * 4n).toBe(true);
  });

  it("usefulness weights the split", () => {
    // equal compute, but a is twice as useful.
    const out = epochRewards([receipt("sagi1a", 100, 2), receipt("sagi1b", 100, 1)], 0, cfg);
    expect(out.get("sagi1a")! > out.get("sagi1b")!).toBe(true);
  });

  it("aggregates multiple receipts per address", () => {
    const split = epochRewards([receipt("sagi1a", 100), receipt("sagi1a", 100)], 0, cfg);
    const single = epochRewards([receipt("sagi1a", 200)], 0, cfg);
    expect(split.get("sagi1a")).toBe(single.get("sagi1a"));
  });

  it("minted total equals the epoch pool exactly (no drift)", () => {
    const receipts = [
      receipt("sagi1a", 137, 0.9),
      receipt("sagi1b", 991, 1.3),
      receipt("sagi1c", 53, 1.0),
      receipt("sagi1d", 700, 0.5),
    ];
    for (const epoch of [0, 1, 5, 42]) {
      const out = epochRewards(receipts, epoch, cfg);
      expect(sum(out.values())).toBe(emission(epoch, cfg));
    }
  });

  it("is deterministic", () => {
    const r = [receipt("sagi1a", 300), receipt("sagi1b", 100)];
    const a = epochRewards(r, 3, cfg);
    const b = epochRewards(r, 3, cfg);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });

  it("zero-work epoch mints nothing", () => {
    const out = epochRewards([receipt("sagi1a", 0, 0)], 0, cfg);
    expect(out.get("sagi1a")).toBe(0n);
  });
});
