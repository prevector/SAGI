import type {
  Bounty,
  LeaderboardEntry,
  NetworkNode,
  NetworkSnapshot,
  NewSessionInput,
  ProgressOverview,
  Profile,
  Session,
  TimeseriesPoint,
  TokenEntry,
  TokenReason,
  TokenSummary
} from "../types";
import { bountySeeds, contributors, devices, metricDefs, milestoneSeeds, regions } from "./data";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ----------------------------- deterministic rng ----------------------------- */

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG so a given username always renders the same data. */
function rngFor(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/* ------------------------------- timeseries -------------------------------- */

/** A daily series that trends start -> end with jitter, ending at "now". */
function buildSeries(start: number, end: number, jitter: number, points: number, rng: () => number): TimeseriesPoint[] {
  const out: TimeseriesPoint[] = [];
  for (let i = 0; i < points; i += 1) {
    const ratio = i / (points - 1);
    const base = start + (end - start) * ratio;
    const noise = i === points - 1 ? 0 : (rng() - 0.5) * 2 * jitter;
    out.push({ t: daysAgoIso(points - 1 - i), v: Math.max(0, base + noise) });
  }
  return out;
}

/* -------------------------------- profile ---------------------------------- */

function totalTokensFor(username: string): number {
  const known = contributors.find((c) => c.username === username);
  if (known) return known.tokens;
  const rng = rngFor(username);
  return 4_000 + Math.floor(rng() * 60_000);
}

function rankFor(username: string): number {
  const ordered = [...contributors].sort((a, b) => b.tokens - a.tokens);
  const idx = ordered.findIndex((c) => c.username === username);
  if (idx >= 0) return idx + 1;
  const total = totalTokensFor(username);
  return ordered.filter((c) => c.tokens > total).length + 1;
}

export function buildProfile(username: string): Profile {
  const rng = rngFor(username);
  const known = contributors.find((c) => c.username === username);
  const status = (["online", "idle", "offline"] as const)[Math.floor(rng() * 3)];
  return {
    id: username,
    username,
    joinedAt: daysAgoIso(60 + Math.floor(rng() * 300)),
    avatarSeed: username,
    rank: rankFor(username),
    totalTokens: totalTokensFor(username),
    computeContributed: known ? Math.round(known.computePower * 12) : 200 + Math.floor(rng() * 4000),
    sessionsRun: 6 + Math.floor(rng() * 120),
    status
  };
}

/* --------------------------------- tokens ---------------------------------- */

const EARN_REASONS: TokenReason[] = ["compute", "compute", "compute", "bounty"];
const SPEND_REASONS: TokenReason[] = ["stake", "burn", "slash"];

export function buildTokenSummary(username: string): TokenSummary {
  const rng = rngFor(`tokens:${username}`);
  const total = totalTokensFor(username);
  const days = 30;

  // Raw signed daily deltas: mostly earns, occasional spends, a few bounty spikes.
  const raw: Array<{ amount: number; reason: TokenReason }> = [];
  for (let i = 0; i < days; i += 1) {
    const roll = rng();
    if (roll < 0.18) {
      raw.push({ amount: -(200 + rng() * 1200), reason: pick(rng, SPEND_REASONS) });
    } else if (roll < 0.32) {
      raw.push({ amount: 3000 + rng() * 9000, reason: "bounty" });
    } else {
      raw.push({ amount: 300 + rng() * 1600, reason: pick(rng, EARN_REASONS) });
    }
  }

  // Scale so the cumulative balance ends exactly at `total`.
  const sum = raw.reduce((acc, d) => acc + d.amount, 0) || 1;
  const factor = total / sum;

  let running = 0;
  const history: TimeseriesPoint[] = [];
  const ledger: TokenEntry[] = [];
  const byReason: Record<TokenReason, number> = { compute: 0, bounty: 0, stake: 0, slash: 0, burn: 0 };

  raw.forEach((d, i) => {
    const amount = Math.round(d.amount * factor);
    running += amount;
    history.push({ t: daysAgoIso(days - 1 - i), v: Math.max(0, running) });
    byReason[d.reason] += amount;
    ledger.push({
      id: `t-${username}-${i}`,
      amount,
      reason: d.reason,
      at: daysAgoIso(days - 1 - i),
      ...(d.reason === "bounty" ? { bountyId: pick(rng, bountySeeds).id } : {}),
      note: noteFor(d.reason)
    });
  });

  // Pin the final balance exactly to total.
  if (history.length) history[history.length - 1].v = total;

  const earned24h = ledger
    .filter((e) => Date.now() - new Date(e.at).getTime() <= DAY_MS && e.amount > 0)
    .reduce((acc, e) => acc + e.amount, 0);

  return {
    total,
    earned24h: earned24h || Math.round(total * 0.01),
    byReason,
    history,
    ledger: ledger.reverse() // newest first
  };
}

function noteFor(reason: TokenReason): string {
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

/* ------------------------------ leaderboard -------------------------------- */

export function buildLeaderboard(currentUsername: string, limit?: number): LeaderboardEntry[] {
  const pool = [...contributors];
  if (!pool.some((c) => c.username === currentUsername)) {
    const rng = rngFor(currentUsername);
    pool.push({
      username: currentUsername,
      tokens: totalTokensFor(currentUsername),
      computePower: 200 + Math.floor(rng() * 1200),
      device: pick(rng, devices),
      region: pick(rng, regions)
    });
  }

  const ranked = pool
    .sort((a, b) => b.tokens - a.tokens)
    .map((c, i): LeaderboardEntry => {
      const rng = rngFor(`lb:${c.username}`);
      return {
        rank: i + 1,
        userId: c.username,
        username: c.username,
        tokens: c.tokens,
        computePower: c.computePower,
        delta: Math.round((rng() - 0.4) * 3200),
        isCurrentUser: c.username === currentUsername
      };
    });

  return limit ? ranked.slice(0, limit) : ranked;
}

/* -------------------------------- bounties --------------------------------- */

export function buildBounties(): Bounty[] {
  return bountySeeds.map((seed, i): Bounty => {
    const createdAt = daysAgoIso(seed.status === "closed" ? 120 + i * 8 : 18 + i * 4);
    const base: Bounty = {
      id: seed.id,
      title: seed.title,
      sponsor: seed.sponsor,
      sponsorType: seed.sponsorType,
      description: seed.description,
      rewardTokens: seed.rewardTokens,
      status: seed.status,
      targetMetric: seed.targetMetric,
      target: seed.target,
      progress: seed.progress,
      participants: seed.participants,
      createdAt
    };
    if (seed.status === "closed") {
      return { ...base, winner: seed.winner, finalMetric: seed.finalMetric, closedAt: daysAgoIso(20 + i * 5) };
    }
    return { ...base, deadline: daysAgoIso(-(14 + i * 3)) }; // future deadline
  });
}

/* -------------------------------- progress --------------------------------- */

export function buildProgress(): ProgressOverview {
  return {
    overallProgress: 0.61,
    headline: "A living search through possible minds is closing on general transfer.",
    milestones: milestoneSeeds.map((m) => ({
      id: m.id,
      label: m.label,
      value: m.value,
      ...(m.reachedDaysAgo !== undefined ? { reachedAt: daysAgoIso(m.reachedDaysAgo) } : {})
    })),
    metrics: metricDefs.map((def) => ({
      key: def.key,
      label: def.label,
      unit: def.unit,
      points: buildSeries(def.start, def.end, def.jitter, 24, rngFor(`metric:${def.key}`))
    }))
  };
}

/* --------------------------------- network --------------------------------- */

function nodeFromContributor(username: string, computePower: number, device: string, region: string, rng: () => number): NetworkNode {
  return {
    id: `n-${username}`,
    username,
    status: rng() > 0.3 ? "active" : "idle",
    computePower,
    device,
    region,
    joinedAt: daysAgoIso(Math.floor(rng() * 200))
  };
}

export function buildNetworkBase(): NetworkSnapshot {
  const rng = rngFor("network");
  const nodes = contributors.map((c) => nodeFromContributor(c.username, c.computePower, c.device, c.region, rng));
  return {
    at: new Date().toISOString(),
    nodes,
    stats: {
      activeContributors: 11_842,
      totalCompute: nodes.reduce((acc, n) => acc + n.computePower, 0) * 1000,
      runningSessions: 63,
      tokensEmitted24h: 241_500
    }
  };
}

/** Mutate the previous snapshot for a live tick: jitter stats, flip statuses. */
export function stepNetwork(prev: NetworkSnapshot): NetworkSnapshot {
  const r = Math.random;
  const nodes = prev.nodes.map((n) => ({
    ...n,
    status: r() > 0.85 ? (n.status === "active" ? "idle" : "active") : n.status,
    computePower: Math.max(60, Math.round(n.computePower * (0.97 + r() * 0.06)))
  }));

  const jitter = (v: number, pct: number) => Math.round(v * (1 - pct + r() * pct * 2));

  return {
    at: new Date().toISOString(),
    nodes,
    stats: {
      activeContributors: jitter(prev.stats.activeContributors, 0.01),
      totalCompute: nodes.reduce((acc, n) => acc + n.computePower, 0) * 1000,
      runningSessions: Math.max(0, prev.stats.runningSessions + Math.round((r() - 0.5) * 6)),
      tokensEmitted24h: jitter(prev.stats.tokensEmitted24h, 0.02)
    }
  };
}

/* --------------------------------- sessions -------------------------------- */

interface SessionSim {
  session: Session;
  startMs: number;
  simMs: number; // demo-compressed wall-clock to completion
}

const sessionStore = new Map<string, SessionSim[]>();
let sessionCounter = 0;

function seedSessions(userId: string): SessionSim[] {
  const rng = rngFor(`sessions:${userId}`);
  const sims: SessionSim[] = [];
  for (let i = 0; i < 3; i += 1) {
    const startedDaysAgo = 2 + i * 3;
    const failed = rng() < 0.2;
    sims.push({
      startMs: Date.now() - startedDaysAgo * DAY_MS,
      simMs: 1,
      session: {
        id: `s-seed-${userId}-${i}`,
        userId,
        bountyId: rng() > 0.5 ? pick(rng, bountySeeds).id : undefined,
        startedAt: daysAgoIso(startedDaysAgo),
        status: failed ? "failed" : "completed",
        computeAllocated: 200 + Math.floor(rng() * 800),
        durationMin: 20 + Math.floor(rng() * 100),
        progress: 1,
        tokensEarned: failed ? 0 : 1500 + Math.floor(rng() * 6000),
        result: failed ? "Hidden-task verification failed" : "Verified — reward credited"
      }
    });
  }
  return sims;
}

function getStore(userId: string): SessionSim[] {
  let store = sessionStore.get(userId);
  if (!store) {
    store = seedSessions(userId);
    sessionStore.set(userId, store);
  }
  return store;
}

/** Advance running sessions based on elapsed wall-clock (demo-compressed). */
function advance(sim: SessionSim): Session {
  const s = sim.session;
  if (s.status !== "running") return s;
  const progress = Math.min(1, (Date.now() - sim.startMs) / sim.simMs);
  if (progress >= 1) {
    s.progress = 1;
    s.status = "completed";
    s.tokensEarned = Math.round(s.computeAllocated * (4 + (sim.simMs % 5)) + (s.bountyId ? 2000 : 0));
    s.result = "Verified — reward credited";
  } else {
    s.progress = progress;
  }
  return s;
}

export function listSessions(userId: string): Session[] {
  const store = getStore(userId);
  return store.map(advance).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function createSession(userId: string, input: NewSessionInput): Session {
  const store = getStore(userId);
  sessionCounter += 1;
  const session: Session = {
    id: `s-${Date.now()}-${sessionCounter}`,
    userId,
    bountyId: input.bountyId,
    startedAt: new Date().toISOString(),
    status: "running",
    computeAllocated: input.computeAllocated,
    durationMin: input.durationMin,
    progress: 0
  };
  // Demo-compress: a session completes in ~7–14s regardless of stated duration.
  const simMs = Math.min(15_000, Math.max(7_000, input.durationMin * 700));
  store.unshift({ session, startMs: Date.now(), simMs });
  return { ...session };
}
