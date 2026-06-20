// Explorer read model: synthetic tag threading + exact base-unit strings.

import { describe, expect, it } from "vitest";
import { defaultEmissionConfig } from "@sagi/ledger";
import { openDb } from "./db/client.js";
import { LedgerService } from "./service.js";
import { SseHub } from "./sse.js";
import { buildLedgerStats, recentTx } from "./explorer.js";
import type { LedgerConfig } from "./config.js";

function demoSvc() {
  const handle = openDb(":memory:");
  const cfg: LedgerConfig = {
    mode: "demo",
    seed: 7,
    dbPath: ":memory:",
    emission: defaultEmissionConfig("sandbox"),
    genesisUsers: 5,
    genesisDays: 20
  };
  const svc = new LedgerService(handle, cfg, new SseHub());
  svc.init({ startTimer: false });
  return { handle, svc, cfg };
}

describe("explorer", () => {
  it("demo genesis transactions are tagged synthetic, amounts are strings", () => {
    const { handle } = demoSvc();
    const tx = recentTx(handle.db, 100);
    expect(tx.length).toBeGreaterThan(0);
    expect(tx.every((t) => t.synthetic === true)).toBe(true);
    expect(typeof tx[0].amount).toBe("string");
  });

  it("ledger stats expose exact base-unit strings; no chain hash yet", () => {
    const { handle, svc, cfg } = demoSvc();
    const s = buildLedgerStats(handle.db, cfg, svc.currentEpoch());
    expect(typeof s.supplyTotal).toBe("string");
    expect(BigInt(s.supplyTotal) > 0n).toBe(true);
    expect(s.latestHash).toBe("");
  });

  it("a real session reward is not flagged synthetic", () => {
    const { handle, svc } = demoSvc();
    const sess = svc.createSession("real-user", { computeAllocated: 500, durationMin: 10 });
    handle.raw.prepare("UPDATE sessions SET started_at=? WHERE id=?").run(Date.now() - 1_000_000, sess.id);
    svc.listSessions("real-user");
    svc.closeEpoch();
    const real = recentTx(handle.db, 200).filter((t) => t.kind === "COMPUTE_REWARD" && !t.synthetic);
    expect(real.length).toBeGreaterThan(0);
  });
});
