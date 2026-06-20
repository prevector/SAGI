// Determinism gate (DoD): same seed => identical demo population + backlog.

import { describe, expect, it } from "vitest";
import { buildGenesis } from "./fixtures.js";

describe("buildGenesis determinism", () => {
  it("same seed + opts => byte-identical wallets and txs", () => {
    const opts = { users: 8, days: 30, now: 1_700_000_000_000 };
    const a = buildGenesis(1337, opts);
    const b = buildGenesis(1337, opts);
    // BigInt isn't JSON-serializable; compare via string form.
    const norm = (g: ReturnType<typeof buildGenesis>) => ({
      wallets: g.wallets.map((w) => ({ ...w, total: w.total.toString() })),
      txs: g.txs.map((t) => ({ ...t, amount: t.amount.toString() }))
    });
    expect(norm(a)).toEqual(norm(b));
  });

  it("different seeds => different populations", () => {
    const opts = { users: 8, days: 30, now: 1_700_000_000_000 };
    const a = buildGenesis(1, opts);
    const b = buildGenesis(2, opts);
    expect(a.wallets.map((w) => w.total.toString())).not.toEqual(b.wallets.map((w) => w.total.toString()));
  });

  it("produces the requested population size with valid addresses", () => {
    const g = buildGenesis(42, { users: 10, days: 20, now: 1_700_000_000_000 });
    expect(g.wallets).toHaveLength(10);
    expect(g.wallets.every((w) => w.address.startsWith("sagi1"))).toBe(true);
    // Per-wallet backlog sums exactly to the wallet total (no rounding leak).
    for (const w of g.wallets) {
      const sum = g.txs.filter((t) => t.toAddr === w.address).reduce((acc, t) => acc + t.amount, 0n);
      expect(sum).toBe(w.total);
    }
  });
});
