// In-memory mock for the SAGI signal path.
// State lives in module-level Maps and is snapshotted to .data/state.json so a
// server restart keeps wallets / counters (candidates + nodes are deterministic
// and regenerated, so they're never persisted).

import seedrandom from "seedrandom";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ─── Minimal seeded RNG helpers ───────────────────────────────────────────────

type RNG = () => number;
const makeRng = (seed: string): RNG => seedrandom(seed);
const range = (rng: RNG, min: number, max: number) => min + (max - min) * rng();
const rangeInt = (rng: RNG, min: number, max: number) => Math.floor(range(rng, min, max + 1));

// ─── Domain types ─────────────────────────────────────────────────────────────

// The visible "genome" of a candidate — what the network is actually checking.
// Each stat is an integer 1..50 and varies per candidate. Crucially this does NOT
// include how well the candidate performs: true quality is kept out of the params
// on purpose (it's the hidden signal the human judgment is for).
export interface CandidateParams {
  neuronParams: number;        // parameters per neuron
  synapseStateParams: number;  // parameters describing a synapse's state
  layers: number;              // number of layers
  neuronTypes: number;         // distinct neuron types
  updateComplexity: number;    // complexity of the update rule
  seed: string;                // deterministic seed for the creature renderer
}

export interface PublicCandidate {
  id: string;
  params: CandidateParams;
  score: number;
  rank: number;
}

export interface SignalTask {
  task_id: string;
  type: "DUEL";
  a: { id: string; params: CandidateParams };
  b: { id: string; params: CandidateParams };
}

export interface Wallet {
  tokens: number;
  scouts: number;
  correct: number;
  rank: number;
}

export interface RewardEvent {
  type: "reward";
  candidate_id: string;
  tokens: number;
  ts: number;
}

export interface SwarmNode {
  id: string;
  type: "passive" | "active";
  x: number;
  y: number;
  z: number;
  active: boolean;
}

export interface Stats {
  players: number;
  votes: number;
  tokens_awarded: number;
  // Human-only tallies — moved exclusively by settleBet (a real contribution),
  // never by the bot loop, so the website can single out human activity.
  human_signals: number;
  human_tokens: number;
}

// ─── Private state ────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  params: CandidateParams;
  trueScore: number;
}

interface UserRecord {
  userId: string;
  tokens: number;
  scouts: number;
  correct: number;
}

interface Bet {
  betId: string;
  userId: string;
  taskId: string;
  picked: "a" | "b";
  candidateAId: string;
  candidateBId: string;
  settled: boolean;
  // Populated by settleBet so the game can read the outcome of any bet (win OR loss).
  winnerSide: "a" | "b" | null;
  won: boolean | null;
  tokens: number;
}

// ─── Candidate & node generation (deterministic) ──────────────────────────────

function spherePoint(rng: RNG, radius: number): [number, number, number] {
  const theta = range(rng, 0, Math.PI * 2);
  const phi = Math.acos(range(rng, -1, 1));
  const r = range(rng, radius * 0.4, radius);
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
  ];
}

const candidateRng = makeRng("sagi-candidates-v2");

// Normalise a 1..50 stat to 0..1.
const norm = (v: number) => (v - 1) / 49;

// Ground-truth performance is a READABLE function of the visible genome so a
// contributor can learn a rule and judge correctly. The dominant, teachable cue is
// the update rule (updateComplexity), with neuron types as a secondary contributor;
// a small seeded noise term keeps it probabilistic (not a perfect lookup), so the
// human judgment stays a signal rather than a deterministic read.
function performanceScore(params: CandidateParams, rng: RNG): number {
  const base =
    0.65 * norm(params.updateComplexity) +
    0.25 * norm(params.neuronTypes) +
    0.1 * norm(params.neuronParams);
  const noise = (rng() - 0.5) * 0.12; // ±0.06
  return Math.max(0.02, Math.min(0.98, base + noise));
}

const candidates: Candidate[] = Array.from({ length: 50 }, (_, i) => {
  // Visible genome: each stat 1..50, independently drawn so candidates differ.
  const params: CandidateParams = {
    neuronParams: rangeInt(candidateRng, 1, 50),
    synapseStateParams: rangeInt(candidateRng, 1, 50),
    layers: rangeInt(candidateRng, 1, 50),
    neuronTypes: rangeInt(candidateRng, 1, 50),
    updateComplexity: rangeInt(candidateRng, 1, 50),
    seed: `s${i}-${Math.floor(candidateRng() * 99999)}`,
  };
  const trueScore = performanceScore(params, candidateRng);
  return { id: `c-${i.toString().padStart(3, "0")}`, params, trueScore };
});

const nodeRng = makeRng("sagi-nodes-v1");
const swarmNodes: SwarmNode[] = [
  { id: "core", type: "passive", x: 0, y: 0, z: 0, active: true },
  ...Array.from({ length: 25 }, (_, i) => {
    const [x, y, z] = spherePoint(nodeRng, 9);
    return { id: `passive-${i}`, type: "passive" as const, x, y, z, active: nodeRng() > 0.2 };
  }),
  ...Array.from({ length: 40 }, (_, i) => {
    const [x, y, z] = spherePoint(nodeRng, 6);
    return { id: `active-${i}`, type: "active" as const, x, y, z, active: nodeRng() > 0.25 };
  }),
];

// ─── Mutable runtime state ────────────────────────────────────────────────────

const users = new Map<string, UserRecord>();
const deviceToUserId = new Map<string, string>();
const bets = new Map<string, Bet>();
const eventsByUser = new Map<string, RewardEvent[]>();

let totalVotes = 0;
let totalTokensAwarded = 0;
// Human-only counters — bumped solely inside settleBet (the human signal path),
// deliberately untouched by the bot simulation below.
let humanSignals = 0;
let humanTokens = 0;

const shortId = () => Math.random().toString(36).slice(2, 9);

// ─── Settlement ───────────────────────────────────────────────────────────────

function settleBet(betId: string): void {
  const bet = bets.get(betId);
  if (!bet || bet.settled) return;

  const cA = candidates.find((c) => c.id === bet.candidateAId);
  const cB = candidates.find((c) => c.id === bet.candidateBId);
  if (!cA || !cB) return;

  const winnerSide: "a" | "b" = cA.trueScore >= cB.trueScore ? "a" : "b";
  const user = [...users.values()].find((u) => u.userId === bet.userId);
  if (!user) return;

  const won = bet.picked === winnerSide;
  const closeness = 1 - Math.abs(cA.trueScore - cB.trueScore);
  const reward = won ? Math.max(5, Math.round(10 + closeness * 40)) : 0;

  // Write all result fields together so getBetResult never sees a half-settled bet.
  bet.settled = true;
  bet.winnerSide = winnerSide;
  bet.won = won;
  bet.tokens = reward;

  user.scouts += 1;
  totalVotes += 1;
  // Human-only tally: this path is only ever reached for a real contribution
  // (recordBet → settleBet); the bot loop bumps the totals directly instead.
  humanSignals += 1;
  humanTokens += reward;

  if (won) {
    user.tokens += reward;
    user.correct += 1;
    totalTokensAwarded += reward;
    const ev = eventsByUser.get(bet.userId) ?? [];
    ev.push({ type: "reward", candidate_id: winnerSide === "a" ? bet.candidateAId : bet.candidateBId, tokens: reward, ts: Date.now() });
    eventsByUser.set(bet.userId, ev);
  }

  schedulePersist();
}

// ─── Bot simulation — keeps dashboard live with 0 real players ────────────────

setInterval(() => {
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * (candidates.length - 2));
    const cA = candidates[idx];
    const cB = candidates[idx + 1];
    const winnerSide: "a" | "b" = cA.trueScore >= cB.trueScore ? "a" : "b";
    totalVotes += 1;
    if ((Math.random() < 0.5 ? "a" : "b") === winnerSide) {
      const closeness = 1 - Math.abs(cA.trueScore - cB.trueScore);
      totalTokensAwarded += Math.max(5, Math.round(10 + closeness * 40));
    }
  }
}, 4000);

// ─── Public API ───────────────────────────────────────────────────────────────

export function getOrCreateUser(deviceId: string): { userId: string } {
  if (deviceToUserId.has(deviceId)) return { userId: deviceToUserId.get(deviceId)! };
  const userId = `u-${shortId()}`;
  users.set(deviceId, { userId, tokens: 0, scouts: 0, correct: 0 });
  deviceToUserId.set(deviceId, userId);
  eventsByUser.set(userId, []);
  schedulePersist();
  return { userId };
}

// Pair candidates with a clear-but-not-trivial performance gap so the better model
// is discernible from the spec on stage (rather than today's hardest adjacent pairs).
const DUEL_GAP_MIN = 0.18;
const DUEL_GAP_MAX = 0.45;

export function createDuel(_userId: string): SignalTask {
  const first = candidates[Math.floor(Math.random() * candidates.length)];
  const inBand = candidates.filter((c) => {
    if (c.id === first.id) return false;
    const gap = Math.abs(c.trueScore - first.trueScore);
    return gap >= DUEL_GAP_MIN && gap <= DUEL_GAP_MAX;
  });
  const pool = inBand.length > 0 ? inBand : candidates.filter((c) => c.id !== first.id);
  const second = pool[Math.floor(Math.random() * pool.length)];
  const [raw_a, raw_b] = Math.random() < 0.5 ? [first, second] : [second, first];
  return { task_id: `t-${shortId()}`, type: "DUEL", a: { id: raw_a.id, params: raw_a.params }, b: { id: raw_b.id, params: raw_b.params } };
}

export function recordBet(taskId: string, userId: string, picked: "a" | "b", candidateAId: string, candidateBId: string): { betId: string } {
  const betId = `bet-${shortId()}`;
  bets.set(betId, { betId, userId, taskId, picked, candidateAId, candidateBId, settled: false, winnerSide: null, won: null, tokens: 0 });
  setTimeout(() => settleBet(betId), 3000 + Math.random() * 2000);
  schedulePersist();
  return { betId };
}

export interface BetResult {
  settled: boolean;
  won: boolean | null;
  winner: "a" | "b" | null;
  tokens: number;
}

// The spec's on_task_settled: report the outcome of a bet once the network has
// settled it against ground truth. Unknown or unsettled bets read as settled:false.
export function getBetResult(betId: string): BetResult {
  const bet = bets.get(betId);
  if (!bet || !bet.settled) return { settled: false, won: null, winner: null, tokens: 0 };
  return { settled: true, won: bet.won, winner: bet.winnerSide, tokens: bet.tokens };
}

export function getWallet(userId: string): Wallet {
  const user = [...users.values()].find((u) => u.userId === userId);
  if (!user) return { tokens: 0, scouts: 0, correct: 0, rank: 0 };
  const rank = [...users.values()].filter((u) => u.tokens >= user.tokens).length;
  return { tokens: user.tokens, scouts: user.scouts, correct: user.correct, rank };
}

export function getFeed(userId: string, since: number): RewardEvent[] {
  return (eventsByUser.get(userId) ?? []).filter((e) => e.ts > since);
}

export function getLeaderboard(limit: number): PublicCandidate[] {
  return [...candidates]
    .sort((a, b) => b.trueScore - a.trueScore)
    .slice(0, Math.min(limit, candidates.length))
    .map((c, i) => ({
      id: c.id,
      params: c.params,
      score: Math.round((c.trueScore + (Math.random() - 0.5) * 0.03) * 100) / 100,
      rank: i + 1,
    }));
}

export function getStats(): Stats {
  return {
    players: users.size,
    votes: totalVotes,
    tokens_awarded: totalTokensAwarded,
    human_signals: humanSignals,
    human_tokens: humanTokens,
  };
}

export function getNodes(): SwarmNode[] {
  return swarmNodes;
}

// ─── Persistence ──────────────────────────────────────────────────────────────
// Snapshot only the mutable runtime state. Candidates and swarm nodes are
// deterministic (seeded) and regenerated on boot, so they're never serialized.

interface Snapshot {
  users: [string, UserRecord][];
  deviceToUserId: [string, string][];
  bets: [string, Bet][];
  eventsByUser: [string, RewardEvent[]][];
  totals: { totalVotes: number; totalTokensAwarded: number; humanSignals: number; humanTokens: number };
}

const DATA_DIR = join(process.cwd(), ".data");
const STATE_FILE = join(DATA_DIR, "state.json");

let persistTimer: ReturnType<typeof setTimeout> | null = null;

// Debounce writes after human mutations so a burst coalesces into one flush.
function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    writeSnapshot();
  }, 500);
}

function writeSnapshot(): void {
  const snapshot: Snapshot = {
    users: [...users.entries()],
    deviceToUserId: [...deviceToUserId.entries()],
    bets: [...bets.entries()],
    eventsByUser: [...eventsByUser.entries()],
    totals: { totalVotes, totalTokensAwarded, humanSignals, humanTokens },
  };
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(snapshot));
  } catch (err) {
    console.warn("[mock] failed to persist state:", err);
  }
}

function hydrate(): void {
  let raw: string;
  try {
    raw = readFileSync(STATE_FILE, "utf8");
  } catch {
    return; // no snapshot yet — fresh boot
  }
  try {
    const snap = JSON.parse(raw) as Snapshot;
    users.clear();
    for (const [k, v] of snap.users) users.set(k, v);
    deviceToUserId.clear();
    for (const [k, v] of snap.deviceToUserId) deviceToUserId.set(k, v);
    bets.clear();
    for (const [k, v] of snap.bets) bets.set(k, v);
    eventsByUser.clear();
    for (const [k, v] of snap.eventsByUser) eventsByUser.set(k, v);
    totalVotes = snap.totals.totalVotes;
    totalTokensAwarded = snap.totals.totalTokensAwarded;
    humanSignals = snap.totals.humanSignals;
    humanTokens = snap.totals.humanTokens;

    // Pending bets lost their settle timer on restart — finish them now so the
    // game never sees a bet stuck "settling".
    for (const bet of [...bets.values()]) {
      if (!bet.settled) settleBet(bet.betId);
    }
    console.log(`[mock] restored ${users.size} users, ${bets.size} bets from snapshot`);
  } catch (err) {
    console.warn("[mock] failed to hydrate state, starting fresh:", err);
  }
}

// Periodic flush captures ambient bot-counter drift without writing on every tick.
setInterval(() => writeSnapshot(), 10000);

hydrate();
