// Leaderboard read-model + score wiring. Ranks by best learning score (tie-break
// tokens), surfaces bounties won, and a completed session records a real GA
// score onto the wallet.

import { describe, expect, it } from "vitest";
import { defaultEmissionConfig } from "@sagi/ledger";
import { openDb } from "./db/client.js";
import { buildLeaderboard } from "./read.js";
import { LedgerService } from "./service.js";
import { SseHub } from "./sse.js";
import { PresenceHub } from "./presence.js";
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
  const svc = new LedgerService(handle, cfg, new SseHub(), new PresenceHub());
  svc.init({ startTimer: false });
  return { handle, svc, cfg };
}

function seedWallet(handle: ReturnType<typeof openDb>, username: string, opts: { total?: string; bestScore?: number; bountiesWon?: number }) {
  handle.raw
    .prepare(
      "INSERT INTO wallets (address, username, total, pending, bounties_won, best_score, compute_units, synthetic, created_at) VALUES (?,?,?,?,?,?,?,?,?)"
    )
    .run(`addr-${username}`, username, opts.total ?? "0", "0", opts.bountiesWon ?? 0, opts.bestScore ?? 0, 0, 0, Date.now());
}

describe("buildLeaderboard", () => {
  it("ranks by best learning score, tie-broken by tokens, with bounties won", () => {
    const { handle } = makeService();
    seedWallet(handle, "low-score-rich", { total: "999999999999", bestScore: 0.40, bountiesWon: 0 });
    seedWallet(handle, "top", { total: "1", bestScore: 0.90, bountiesWon: 4 });
    seedWallet(handle, "mid-a", { total: "200", bestScore: 0.70, bountiesWon: 1 });
    seedWallet(handle, "mid-b", { total: "500", bestScore: 0.70, bountiesWon: 2 }); // same score, more tokens

    const board = buildLeaderboard(handle.db, "mid-a");

    expect(board.map((e) => e.username)).toEqual(["top", "mid-b", "mid-a", "low-score-rich"]);
    expect(board.map((e) => e.rank)).toEqual([1, 2, 3, 4]);
    expect(board[0]).toMatchObject({ score: 0.9, bountiesWon: 4 });
    expect(board.find((e) => e.username === "mid-a")?.isCurrentUser).toBe(true);
  });

  it("honours the limit", () => {
    const { handle } = makeService();
    seedWallet(handle, "a", { bestScore: 0.9 });
    seedWallet(handle, "b", { bestScore: 0.8 });
    seedWallet(handle, "c", { bestScore: 0.7 });
    expect(buildLeaderboard(handle.db, "", 2).map((e) => e.username)).toEqual(["a", "b"]);
  });
});

describe("session scoring", () => {
  it("records a real GA score on the wallet when a session completes", () => {
    const { handle, svc } = makeService();
    const session = svc.createSession("alice", { computeAllocated: 800, durationMin: 30 });

    const sessionScore = (handle.raw.prepare("SELECT score FROM sessions WHERE id=?").get(session.id) as { score: number }).score;
    expect(sessionScore).toBeGreaterThanOrEqual(0);
    expect(sessionScore).toBeLessThanOrEqual(1);

    handle.raw.prepare("UPDATE sessions SET started_at = ? WHERE id = ?").run(Date.now() - 1_000_000, session.id);
    svc.listSessions("alice");

    const best = (handle.raw.prepare("SELECT best_score FROM wallets WHERE username='alice'").get() as { best_score: number }).best_score;
    expect(best).toBe(sessionScore); // the wallet's best score is the session's score
    expect(best).toBeGreaterThan(0); // the GA makes progress on an 11x11 maze
  });
});
