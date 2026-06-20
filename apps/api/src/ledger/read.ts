// Read model: turn ledger SQL into the exact @sagi/shared Domain shapes the
// frontend already consumes (so httpApi satisfies the same Api contract as the
// old mock). Base units are converted to display SAGI numbers HERE, at the
// seam — the economic core stays BigInt. Exact base-unit strings for the chain
// explorer are produced separately (C3), not here.

import { emission, toSagiNumber } from "@sagi/ledger";
import type { Domain } from "@sagi/shared";
import type { Db } from "./db/client.js";
import { bounties, sessions, transactions, wallets } from "./db/schema.js";
import { computePowerFor, deviceFor, regionFor } from "./fixtures.js";
import { metricDefs, milestoneSeeds } from "./seedData.js";
import type { LedgerConfig } from "./config.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

function reasonOf(kind: string): Domain.TokenReason {
  switch (kind) {
    case "BOUNTY_PAYOUT":
      return "bounty";
    case "STAKE":
      return "stake";
    case "SLASH":
      return "slash";
    case "BURN":
      return "burn";
    default:
      return "compute";
  }
}

function noteFor(reason: Domain.TokenReason): string {
  switch (reason) {
    case "compute":
      return "Verified compute contribution";
    case "bounty":
      return "Bounty reward credited";
    case "stake":
      return "Staked on a session";
    case "slash":
      return "Slashed for a failed verification";
    case "burn":
      return "Burned on protocol fees";
  }
}

/** address -> username map (for explorer/winner display). */
function usernameByAddress(db: Db): Map<string, string> {
  const m = new Map<string, string>();
  for (const w of db.select().from(wallets).all()) m.set(w.address, w.username);
  return m;
}

export function buildProfile(db: Db, username: string): Domain.Profile {
  const w = db.select().from(wallets).all();
  const ranked = [...w].sort((a, b) => Number(BigInt(b.total) - BigInt(a.total)));
  const idx = ranked.findIndex((r) => r.username === username);
  const me = ranked[idx];
  const sessionsRun = db.select().from(sessions).all().filter((s) => s.username === username).length;
  return {
    id: username,
    username,
    joinedAt: iso(me?.createdAt ?? Date.now()),
    avatarSeed: username,
    rank: idx >= 0 ? idx + 1 : ranked.length + 1,
    totalTokens: me ? toSagiNumber(BigInt(me.total)) : 0,
    computeContributed: me?.computeUnits ?? 0,
    sessionsRun,
    status: "online"
  };
}

export function buildTokenSummary(db: Db, username: string): Domain.TokenSummary {
  const w = db.select().from(wallets).all().find((x) => x.username === username);
  const total = w ? toSagiNumber(BigInt(w.total)) : 0;
  const byReason: Record<Domain.TokenReason, number> = { compute: 0, bounty: 0, stake: 0, slash: 0, burn: 0 };
  const ledger: Domain.TokenEntry[] = [];
  const history: Domain.TimeseriesPoint[] = [];

  if (!w) {
    return { total: 0, earned24h: 0, byReason, history: [{ t: iso(Date.now()), v: 0 }], ledger: [] };
  }

  const txs = db.select().from(transactions).all()
    .filter((t) => t.toAddr === w.address)
    .sort((a, b) => a.ts - b.ts);

  let running = 0;
  const now = Date.now();
  let earned24h = 0;
  for (const t of txs) {
    const reason = reasonOf(t.kind);
    const amount = toSagiNumber(BigInt(t.amount)); // credits are positive
    running += amount;
    byReason[reason] += amount;
    if (now - t.ts <= DAY_MS && amount > 0) earned24h += amount;
    history.push({ t: iso(t.ts), v: Math.max(0, running) });
    const meta = t.meta ? (JSON.parse(t.meta) as { bountyId?: string }) : {};
    ledger.push({
      id: t.id,
      amount,
      reason,
      at: iso(t.ts),
      ...(meta.bountyId ? { bountyId: meta.bountyId } : {}),
      note: noteFor(reason)
    });
  }

  if (history.length === 0) history.push({ t: iso(now), v: total });
  return { total, earned24h, byReason, history, ledger: ledger.reverse() };
}

export function buildLeaderboard(db: Db, currentUsername: string, limit?: number): Domain.LeaderboardEntry[] {
  const ranked = db.select().from(wallets).all()
    .sort((a, b) => Number(BigInt(b.total) - BigInt(a.total)))
    .map((w, i): Domain.LeaderboardEntry => ({
      rank: i + 1,
      userId: w.username,
      username: w.username,
      tokens: toSagiNumber(BigInt(w.total)),
      computePower: computePowerFor(w.username, w.computeUnits),
      delta: toSagiNumber(BigInt(w.pending)), // recent (this-epoch provisional) movement
      isCurrentUser: w.username === currentUsername
    }));
  return limit ? ranked.slice(0, limit) : ranked;
}

export function sessionToDTO(row: typeof sessions.$inferSelect, now = Date.now()): Domain.Session {
  const progress = row.status === "running" ? Math.min(1, (now - row.startedAt) / row.simMs) : row.progress;
  return {
    id: row.id,
    userId: row.username,
    ...(row.bountyId ? { bountyId: row.bountyId } : {}),
    startedAt: iso(row.startedAt),
    status: row.status as Domain.SessionStatus,
    computeAllocated: row.computeAllocated,
    durationMin: row.durationMin,
    progress,
    ...(row.tokensEarned ? { tokensEarned: toSagiNumber(BigInt(row.tokensEarned)) } : {}),
    ...(row.result ? { result: row.result } : {})
  };
}

export function buildBounties(db: Db, status?: Domain.BountyStatus): Domain.Bounty[] {
  const names = usernameByAddress(db);
  return db.select().from(bounties).all()
    .filter((b) => (status ? b.status === status : true))
    .map((b): Domain.Bounty => ({
      id: b.id,
      title: b.title,
      sponsor: b.sponsor,
      sponsorType: b.sponsorType as Domain.SponsorType,
      description: b.description,
      rewardTokens: toSagiNumber(BigInt(b.reward)),
      status: b.status as Domain.BountyStatus,
      targetMetric: b.targetMetric,
      ...(b.target !== null ? { target: b.target } : {}),
      progress: b.progress,
      participants: b.participants,
      createdAt: iso(b.createdAt),
      ...(b.status !== "closed" ? { deadline: iso(b.createdAt + 21 * DAY_MS) } : {}),
      ...(b.winnerAddr ? { winner: names.get(b.winnerAddr) ?? b.winnerAddr } : {}),
      ...(b.finalMetric !== null ? { finalMetric: b.finalMetric } : {}),
      ...(b.closedAt !== null ? { closedAt: iso(b.closedAt) } : {})
    }));
}

export function buildNetworkSnapshot(
  db: Db,
  cfg: LedgerConfig,
  epoch: number,
  connectedUsers: Domain.ConnectedUser[] = []
): Domain.NetworkSnapshot {
  const ws = db.select().from(wallets).all();
  const now = Date.now();
  const online = new Set(connectedUsers.map((user) => user.username));
  const runningByAddr = new Set(
    db.select().from(sessions).all().filter((s) => s.status === "running").map((s) => s.address)
  );

  const nodes: Domain.NetworkNode[] = ws
    .map((w) => ({
      id: `n-${w.username}`,
      username: w.username,
      status: (runningByAddr.has(w.address) || BigInt(w.pending) > 0n ? "active" : "idle") as Domain.NodeStatus,
      computePower: computePowerFor(w.username, w.computeUnits),
      device: deviceFor(w.username),
      region: regionFor(w.username),
      joinedAt: iso(w.createdAt),
      online: online.has(w.username)
    }))
    .sort((a, b) => b.computePower - a.computePower)
    .slice(0, 60);

  for (const user of connectedUsers) {
    if (nodes.some((node) => node.username === user.username)) continue;
    nodes.unshift({
      id: `n-${user.username}`,
      username: user.username,
      status: "idle",
      computePower: computePowerFor(user.username, 0),
      device: deviceFor(user.username),
      region: regionFor(user.username),
      joinedAt: user.connectedAt,
      online: true
    });
  }

  const supplyBase = ws.reduce((acc, w) => acc + BigInt(w.total), 0n);
  const txs = db.select().from(transactions).all();
  const emitted24hBase = txs
    .filter((t) => now - t.ts <= DAY_MS)
    .reduce((acc, t) => acc + BigInt(t.amount), 0n);

  const stats: Domain.NetworkStats = {
    activeContributors: ws.length,
    totalCompute: nodes.reduce((acc, n) => acc + n.computePower, 0) * 1000,
    runningSessions: runningByAddr.size,
    tokensEmitted24h: toSagiNumber(emitted24hBase),
    onlineUsers: connectedUsers.length,
    supplyTotal: toSagiNumber(supplyBase),
    emissionThisEpoch: toSagiNumber(emission(epoch, cfg.emission)),
    epoch,
    height: txs.length
  };

  return { stats, nodes, connectedUsers, at: iso(now) };
}

/* ------------------------------- progress ---------------------------------- */

function rngFor(seed: string): () => number {
  let a = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    a ^= seed.charCodeAt(i);
    a = Math.imul(a, 16777619);
  }
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function series(start: number, end: number, jitter: number, points: number, rng: () => number): Domain.TimeseriesPoint[] {
  const out: Domain.TimeseriesPoint[] = [];
  const now = Date.now();
  for (let i = 0; i < points; i++) {
    const ratio = i / (points - 1);
    const base = start + (end - start) * ratio;
    const noise = i === points - 1 ? 0 : (rng() - 0.5) * 2 * jitter;
    out.push({ t: iso(now - (points - 1 - i) * DAY_MS), v: Math.max(0, base + noise) });
  }
  return out;
}

export function buildProgress(): Domain.ProgressOverview {
  const now = Date.now();
  return {
    overallProgress: 0.61,
    headline: "A living search through possible minds is closing on general transfer.",
    milestones: milestoneSeeds.map((m) => ({
      id: m.id,
      label: m.label,
      ...(m.value !== undefined ? { value: m.value } : {}),
      ...(m.reachedDaysAgo !== undefined ? { reachedAt: iso(now - m.reachedDaysAgo * DAY_MS) } : {})
    })),
    metrics: metricDefs.map((def) => ({
      key: def.key,
      label: def.label,
      ...(def.unit ? { unit: def.unit } : {}),
      points: series(def.start, def.end, def.jitter, 24, rngFor(`metric:${def.key}`))
    }))
  };
}
