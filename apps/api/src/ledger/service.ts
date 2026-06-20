// The ledger service — hosts the SQL-backed token economy (no chain yet).
//
// Earn loop: a session completes -> a signed-later WorkReceipt is recorded into
// the open epoch -> the wallet's provisional `pending` is recomputed -> at epoch
// close the pure calculator splits the emission pool, COMPUTE_REWARD txs are
// written, and pending becomes confirmed `total`. Bounty payouts mint
// BOUNTY_PAYOUT txs. Every change broadcasts a NetworkSnapshot over SSE.
//
// Money is BigInt base units in memory and TEXT base units in SQLite. The
// pure split/emission live in @sagi/ledger and are unit-tested headless.

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  type EmissionConfig,
  type WorkReceipt,
  deriveAddress,
  emission,
  epochRewards
} from "@sagi/ledger";
import type { Domain } from "@sagi/shared";
import type { DbHandle } from "./db/client.js";
import { bounties, epochs, meta, sessions, transactions, wallets, workReceipts } from "./db/schema.js";
import type { LedgerConfig } from "./config.js";
import { buildGenesis } from "./fixtures.js";
import { bountySeeds } from "./seedData.js";
import { buildNetworkSnapshot } from "./read.js";
import type { SseHub } from "./sse.js";

const WORK_SCALE = 1_000_000;
const ONE = 1_000_000_000n; // base units per SAGI (DECIMALS=9)

type WalletRow = typeof wallets.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;

function weightOf(computeUnits: number, usefulness: number): bigint {
  return BigInt(Math.max(0, Math.round(computeUnits * usefulness * WORK_SCALE)));
}

export class LedgerService {
  private readonly db: DbHandle["db"];
  private readonly raw: DbHandle["raw"];
  private readonly cfg: LedgerConfig;
  private readonly emissionCfg: EmissionConfig;
  private readonly hub: SseHub;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sessionCounter = 0;

  constructor(handle: DbHandle, cfg: LedgerConfig, hub: SseHub) {
    this.db = handle.db;
    this.raw = handle.raw;
    this.cfg = cfg;
    this.emissionCfg = cfg.emission;
    this.hub = hub;
  }

  // ---- lifecycle -----------------------------------------------------------

  init(opts: { startTimer?: boolean } = {}): void {
    if (this.cfg.mode === "production") this.purgeSynthetic();
    this.seedBounties();
    if (this.cfg.mode === "demo") this.seedGenesisIfEmpty();
    this.ensureOpenEpoch();
    if (opts.startTimer ?? true) this.startTimer();
  }

  startTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.closeEpoch(), this.emissionCfg.epochMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // ---- meta / epoch --------------------------------------------------------

  private getMeta(key: string): string | null {
    const row = this.db.select().from(meta).where(eq(meta.key, key)).get();
    return row?.value ?? null;
  }

  private setMeta(key: string, value: string): void {
    this.db.insert(meta).values({ key, value }).onConflictDoUpdate({ target: meta.key, set: { value } }).run();
  }

  currentEpoch(): number {
    return Number(this.getMeta("currentEpoch") ?? "0");
  }

  private ensureOpenEpoch(): void {
    if (this.getMeta("currentEpoch") !== null) return;
    const now = Date.now();
    this.db.insert(epochs).values({
      idx: 0,
      startTs: now,
      pool: emission(0, this.emissionCfg).toString(),
      emitted: "0",
      status: "open"
    }).onConflictDoNothing().run();
    this.setMeta("currentEpoch", "0");
  }

  // ---- seeding -------------------------------------------------------------

  private seedBounties(): void {
    const now = Date.now();
    for (const b of bountySeeds) {
      if (b.status === "closed" && this.cfg.mode !== "demo") continue; // no fake winners in prod
      const synthetic = b.status === "closed" ? 1 : 0;
      const winnerAddr = b.winner ? deriveAddress(b.winner) : null;
      this.db.insert(bounties).values({
        id: b.id,
        title: b.title,
        sponsor: b.sponsor,
        sponsorType: b.sponsorType,
        description: b.description,
        reward: (BigInt(b.rewardTokens) * ONE).toString(),
        status: b.status,
        targetMetric: b.targetMetric,
        target: b.target ?? null,
        progress: b.progress,
        participants: b.participants,
        createdAt: now,
        winnerAddr,
        finalMetric: b.finalMetric ?? null,
        closedAt: b.status === "closed" ? now : null,
        synthetic
      }).onConflictDoNothing().run();
    }
  }

  private seedGenesisIfEmpty(): void {
    const count = this.raw.prepare("SELECT COUNT(*) AS c FROM wallets").get() as { c: number };
    if (count.c > 0) return;
    const now = Date.now();
    const genesis = buildGenesis(this.cfg.seed, {
      users: this.cfg.genesisUsers,
      days: this.cfg.genesisDays,
      now
    });
    this.raw.transaction(() => {
      for (const w of genesis.wallets) {
        this.db.insert(wallets).values({
          address: w.address,
          username: w.username,
          total: w.total.toString(),
          pending: "0",
          bountiesWon: 0,
          computeUnits: w.computeUnits,
          synthetic: 1,
          createdAt: w.createdAt
        }).onConflictDoNothing().run();
      }
      for (const tx of genesis.txs) {
        this.db.insert(transactions).values({
          id: tx.id,
          kind: "COMPUTE_REWARD",
          fromAddr: null,
          toAddr: tx.toAddr,
          amount: tx.amount.toString(),
          ts: tx.ts,
          epoch: 0,
          meta: JSON.stringify({ computeUnits: tx.computeUnits, genesis: true }),
          synthetic: 1,
          sig: null,
          blockHeight: null
        }).onConflictDoNothing().run();
      }
      // Credit closed-bounty wins to the synthetic winners.
      for (const b of bountySeeds) {
        if (b.status !== "closed" || !b.winner) continue;
        const addr = deriveAddress(b.winner);
        const w = this.db.select().from(wallets).where(eq(wallets.address, addr)).get();
        if (!w) continue;
        const reward = BigInt(b.rewardTokens) * ONE;
        this.db.update(wallets).set({
          total: (BigInt(w.total) + reward).toString(),
          bountiesWon: w.bountiesWon + 1
        }).where(eq(wallets.address, addr)).run();
        this.db.insert(transactions).values({
          id: `gb-${b.id}`,
          kind: "BOUNTY_PAYOUT",
          fromAddr: null,
          toAddr: addr,
          amount: reward.toString(),
          ts: now,
          epoch: 0,
          meta: JSON.stringify({ bountyId: b.id, genesis: true }),
          synthetic: 1,
          sig: null,
          blockHeight: null
        }).onConflictDoNothing().run();
      }
    })();
  }

  purgeSynthetic(): void {
    this.raw.transaction(() => {
      this.db.delete(wallets).where(eq(wallets.synthetic, 1)).run();
      this.db.delete(transactions).where(eq(transactions.synthetic, 1)).run();
      this.db.delete(workReceipts).where(eq(workReceipts.synthetic, 1)).run();
      this.db.delete(sessions).where(eq(sessions.synthetic, 1)).run();
      this.db.delete(bounties).where(eq(bounties.synthetic, 1)).run();
    })();
  }

  // ---- wallets -------------------------------------------------------------

  ensureWallet(username: string): WalletRow {
    const existing = this.db.select().from(wallets).where(eq(wallets.username, username)).get();
    if (existing) return existing;
    const address = deriveAddress(username);
    this.db.insert(wallets).values({
      address,
      username,
      total: "0",
      pending: "0",
      bountiesWon: 0,
      computeUnits: 0,
      synthetic: 0,
      createdAt: Date.now()
    }).onConflictDoNothing().run();
    return this.db.select().from(wallets).where(eq(wallets.username, username)).get()!;
  }

  // ---- sessions ------------------------------------------------------------

  createSession(username: string, input: Domain.NewSessionInput): SessionRow {
    const w = this.ensureWallet(username);
    const now = Date.now();
    this.sessionCounter += 1;
    const id = `s-${now}-${this.sessionCounter}`;
    // Demo-compress: a session completes in ~7-15s regardless of stated minutes.
    const simMs = Math.min(15_000, Math.max(7_000, input.durationMin * 700));
    this.db.insert(sessions).values({
      id,
      username,
      address: w.address,
      bountyId: input.bountyId ?? null,
      startedAt: now,
      status: "running",
      computeAllocated: input.computeAllocated,
      durationMin: input.durationMin,
      progress: 0,
      simMs,
      tokensEarned: null,
      result: null,
      synthetic: 0
    }).run();
    this.broadcast();
    return this.db.select().from(sessions).where(eq(sessions.id, id)).get()!;
  }

  /** Advance running sessions for a user, completing due ones; returns rows. */
  listSessions(username: string): SessionRow[] {
    const rows = this.db.select().from(sessions).where(eq(sessions.username, username)).all();
    let changed = false;
    for (const row of rows) {
      if (this.completeIfDue(row)) changed = true;
    }
    if (changed) this.broadcast();
    return this.db
      .select()
      .from(sessions)
      .where(eq(sessions.username, username))
      .all()
      .sort((a, b) => b.startedAt - a.startedAt);
  }

  /** Live progress for a session without persisting per-tick writes. */
  liveProgress(row: SessionRow, now = Date.now()): number {
    if (row.status !== "running") return row.progress;
    return Math.min(1, (now - row.startedAt) / row.simMs);
  }

  private completeIfDue(row: SessionRow, now = Date.now()): boolean {
    if (row.status !== "running") return false;
    if ((now - row.startedAt) / row.simMs < 1) return false;
    const epoch = this.currentEpoch();
    const computeUnits = row.computeAllocated * row.durationMin;
    this.submitReceipt({
      sessionId: row.id,
      address: row.address,
      computeUnits,
      usefulness: 1.0, // seam: real GA fitness later
      ts: now,
      nonce: randomUUID(),
      epoch
    }, row.synthetic === 1);
    const share = this.sessionShare(row.id, epoch);
    this.db.update(sessions).set({
      status: "completed",
      progress: 1,
      result: "Verified — reward credited",
      tokensEarned: share.toString()
    }).where(eq(sessions.id, row.id)).run();
    return true;
  }

  // ---- receipts / rewards --------------------------------------------------

  private submitReceipt(r: WorkReceipt, synthetic: boolean): void {
    this.db.insert(workReceipts).values({
      sessionId: r.sessionId,
      address: r.address,
      computeUnits: r.computeUnits,
      usefulness: r.usefulness,
      ts: r.ts,
      nonce: r.nonce,
      epoch: r.epoch,
      synthetic: synthetic ? 1 : 0,
      sig: null
    }).onConflictDoNothing().run();
    // accumulate lifetime compute
    const w = this.db.select().from(wallets).where(eq(wallets.address, r.address)).get();
    if (w) {
      this.db.update(wallets).set({ computeUnits: w.computeUnits + r.computeUnits })
        .where(eq(wallets.address, r.address)).run();
    }
    this.recomputePending(r.epoch);
  }

  private epochReceipts(epoch: number): WorkReceipt[] {
    return this.db.select().from(workReceipts).where(eq(workReceipts.epoch, epoch)).all().map((r) => ({
      sessionId: r.sessionId,
      address: r.address,
      computeUnits: r.computeUnits,
      usefulness: r.usefulness,
      ts: r.ts,
      nonce: r.nonce,
      epoch: r.epoch
    }));
  }

  private recomputePending(epoch: number): void {
    const rewards = epochRewards(this.epochReceipts(epoch), epoch, this.emissionCfg);
    this.raw.transaction(() => {
      this.db.update(wallets).set({ pending: "0" }).run();
      for (const [addr, reward] of rewards) {
        this.db.update(wallets).set({ pending: reward.toString() }).where(eq(wallets.address, addr)).run();
      }
    })();
  }

  /** Provisional reward for a single session's receipt in `epoch` (display). */
  private sessionShare(sessionId: string, epoch: number): bigint {
    const receipts = this.epochReceipts(epoch);
    let totalW = 0n;
    let mine = 0n;
    for (const r of receipts) {
      const w = weightOf(r.computeUnits, r.usefulness);
      totalW += w;
      if (r.sessionId === sessionId) mine = w;
    }
    if (totalW === 0n) return 0n;
    return (emission(epoch, this.emissionCfg) * mine) / totalW;
  }

  closeEpoch(): void {
    const idx = this.currentEpoch();
    // Complete any running sessions whose time elapsed before sealing the epoch.
    const now = Date.now();
    for (const row of this.db.select().from(sessions).where(eq(sessions.status, "running")).all()) {
      this.completeIfDue(row, now);
    }
    const receipts = this.epochReceipts(idx);
    const rewards = epochRewards(receipts, idx, this.emissionCfg);

    this.raw.transaction(() => {
      let emitted = 0n;
      for (const [addr, reward] of rewards) {
        if (reward <= 0n) continue;
        this.db.insert(transactions).values({
          id: randomUUID(),
          kind: "COMPUTE_REWARD",
          fromAddr: null,
          toAddr: addr,
          amount: reward.toString(),
          ts: now,
          epoch: idx,
          meta: JSON.stringify({ epoch: idx }),
          synthetic: 0,
          sig: null,
          blockHeight: null
        }).run();
        const w = this.db.select().from(wallets).where(eq(wallets.address, addr)).get();
        if (w) {
          this.db.update(wallets).set({ total: (BigInt(w.total) + reward).toString() })
            .where(eq(wallets.address, addr)).run();
        }
        emitted += reward;
      }
      // Finalize per-session earnings (display).
      let totalW = 0n;
      for (const r of receipts) totalW += weightOf(r.computeUnits, r.usefulness);
      const pool = emission(idx, this.emissionCfg);
      for (const r of receipts) {
        const share = totalW > 0n ? (pool * weightOf(r.computeUnits, r.usefulness)) / totalW : 0n;
        this.db.update(sessions).set({ tokensEarned: share.toString() }).where(eq(sessions.id, r.sessionId)).run();
      }
      // Seal epoch, clear pending, open next.
      this.db.update(epochs).set({ status: "closed", endTs: now, emitted: emitted.toString() })
        .where(eq(epochs.idx, idx)).run();
      this.db.update(wallets).set({ pending: "0" }).run();
      const next = idx + 1;
      this.db.insert(epochs).values({
        idx: next,
        startTs: now,
        pool: emission(next, this.emissionCfg).toString(),
        emitted: "0",
        status: "open"
      }).onConflictDoNothing().run();
      this.setMeta("currentEpoch", String(next));
    })();
    this.broadcast();
  }

  // ---- bounty payout (used by the driver in C4) ----------------------------

  payBounty(bountyId: string, winnerAddr: string): void {
    const b = this.db.select().from(bounties).where(eq(bounties.id, bountyId)).get();
    if (!b || b.status === "closed") return;
    const w = this.db.select().from(wallets).where(eq(wallets.address, winnerAddr)).get();
    if (!w) return;
    const reward = BigInt(b.reward);
    const now = Date.now();
    this.raw.transaction(() => {
      this.db.insert(transactions).values({
        id: randomUUID(),
        kind: "BOUNTY_PAYOUT",
        fromAddr: null,
        toAddr: winnerAddr,
        amount: reward.toString(),
        ts: now,
        epoch: this.currentEpoch(),
        meta: JSON.stringify({ bountyId }),
        synthetic: w.synthetic,
        sig: null,
        blockHeight: null
      }).run();
      this.db.update(wallets).set({
        total: (BigInt(w.total) + reward).toString(),
        bountiesWon: w.bountiesWon + 1
      }).where(eq(wallets.address, winnerAddr)).run();
      this.db.update(bounties).set({
        status: "closed",
        winnerAddr,
        closedAt: now,
        progress: 1
      }).where(eq(bounties.id, bountyId)).run();
    })();
    this.broadcast();
  }

  // ---- realtime ------------------------------------------------------------

  broadcast(): void {
    this.hub.broadcast(buildNetworkSnapshot(this.db, this.cfg, this.currentEpoch()));
  }
}
