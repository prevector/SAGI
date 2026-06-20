// Headless integration test for the earn loop (no HTTP, no timer). Drives the
// service directly against an in-memory SQLite DB: session completes -> receipt
// -> pending -> epoch close -> confirmed total + a COMPUTE_REWARD tx.

import { describe, expect, it } from "vitest";
import { defaultEmissionConfig, emission } from "@sagi/ledger";
import { openDb } from "./db/client.js";
import { LedgerService } from "./service.js";
import { SseHub } from "./sse.js";
import type { LedgerConfig } from "./config.js";

function makeService(mode: LedgerConfig["mode"] = "sandbox") {
  const handle = openDb(":memory:");
  const cfg: LedgerConfig = {
    mode,
    seed: 1,
    dbPath: ":memory:",
    emission: defaultEmissionConfig("sandbox"),
    genesisUsers: mode === "demo" ? 6 : 0,
    genesisDays: 30
  };
  const svc = new LedgerService(handle, cfg, new SseHub());
  svc.init({ startTimer: false });
  return { handle, svc, cfg };
}

describe("LedgerService earn loop", () => {
  it("credits a completed session at epoch close (pending -> confirmed)", () => {
    const { handle, svc, cfg } = makeService();

    const session = svc.createSession("alice", { computeAllocated: 800, durationMin: 30 });
    expect(session.status).toBe("running");

    // Backdate so the session is due, then advancing on read completes it.
    handle.raw.prepare("UPDATE sessions SET started_at = ? WHERE id = ?").run(Date.now() - 1_000_000, session.id);
    const after = svc.listSessions("alice");
    expect(after[0].status).toBe("completed");

    // Sole contributor => provisional pending equals the epoch pool.
    const pending = handle.raw.prepare("SELECT pending FROM wallets WHERE username='alice'").get() as { pending: string };
    expect(BigInt(pending.pending)).toBe(emission(0, cfg.emission));

    // Close the epoch: pending becomes confirmed total; a COMPUTE_REWARD lands.
    svc.closeEpoch();
    const w = handle.raw.prepare("SELECT total, pending FROM wallets WHERE username='alice'").get() as { total: string; pending: string };
    expect(BigInt(w.total)).toBe(emission(0, cfg.emission));
    expect(w.pending).toBe("0");

    const tx = handle.raw.prepare("SELECT COUNT(*) c FROM transactions WHERE kind='COMPUTE_REWARD' AND synthetic=0").get() as { c: number };
    expect(tx.c).toBe(1);
    expect(svc.currentEpoch()).toBe(1);
  });

  it("splits one epoch pool across two contributors, summing to the pool", () => {
    const { handle, svc, cfg } = makeService();
    const a = svc.createSession("alice", { computeAllocated: 900, durationMin: 30 }); // more work
    const b = svc.createSession("bob", { computeAllocated: 300, durationMin: 30 });
    handle.raw.prepare("UPDATE sessions SET started_at = ?").run(Date.now() - 1_000_000);
    svc.listSessions("alice");
    svc.listSessions("bob");
    svc.closeEpoch();

    const rows = handle.raw.prepare("SELECT username, total FROM wallets WHERE username IN ('alice','bob')").all() as Array<{ username: string; total: string }>;
    const map = new Map(rows.map((r) => [r.username, BigInt(r.total)]));
    expect(map.get("alice")! + map.get("bob")!).toBe(emission(0, cfg.emission)); // exact, no drift
    expect(map.get("alice")! > map.get("bob")!).toBe(true); // more work -> more reward
  });

  it("demo mode seeds a reproducible synthetic population; production purges it", () => {
    const demo = makeService("demo");
    const count = demo.handle.raw.prepare("SELECT COUNT(*) c FROM wallets WHERE synthetic=1").get() as { c: number };
    expect(count.c).toBe(6);

    const prod = makeService("production");
    const prodCount = prod.handle.raw.prepare("SELECT COUNT(*) c FROM wallets WHERE synthetic=1").get() as { c: number };
    expect(prodCount.c).toBe(0); // production never seeds synthetic
  });

  it("triggerBreakthrough closes an open bounty and credits a winner", () => {
    const { handle, svc } = makeService("demo");
    const openBefore = svc.openBountyCount();
    const r = svc.triggerBreakthrough();
    expect(r?.bountyId).toBeTruthy();
    expect(svc.openBountyCount()).toBe(openBefore - 1);
    const closed = handle.raw.prepare("SELECT status, winner_addr FROM bounties WHERE id=?").get(r!.bountyId) as { status: string; winner_addr: string };
    expect(closed.status).toBe("closed");
    expect(closed.winner_addr).toBeTruthy();
  });

  it("addSyntheticWork raises the contributor's provisional pending", () => {
    const { handle, svc } = makeService("demo");
    const addr = svc.syntheticWallets()[0];
    svc.addSyntheticWork(addr, 1000);
    const w = handle.raw.prepare("SELECT pending FROM wallets WHERE address=?").get(addr) as { pending: string };
    expect(BigInt(w.pending) > 0n).toBe(true);
  });

  it("derives a stable address per username", () => {
    const { svc, handle } = makeService();
    svc.ensureWallet("carol");
    svc.ensureWallet("carol");
    const rows = handle.raw.prepare("SELECT COUNT(*) c FROM wallets WHERE username='carol'").get() as { c: number };
    expect(rows.c).toBe(1); // idempotent
  });
});
