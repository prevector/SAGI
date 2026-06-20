// In-memory mock for the SAGI signal path.
// All state lives in module-level Maps — no DB, no persistence.
// Restarting the server resets everything (fine for a hackathon demo).

import seedrandom from "seedrandom";

// ─── Minimal seeded RNG helpers ───────────────────────────────────────────────

type RNG = () => number;
const makeRng = (seed: string): RNG => seedrandom(seed);
const range = (rng: RNG, min: number, max: number) => min + (max - min) * rng();
const rangeInt = (rng: RNG, min: number, max: number) => Math.floor(range(rng, min, max + 1));

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface CandidateParams {
  layers: number;       // 2..6
  width: number;        // 0.5..1.5 (body scale)
  connections: number;  // 0..1 (connectivity density)
  efficiency: number;   // 0..1 (determines color + true quality)
  seed: string;         // deterministic seed for the creature renderer
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

const candidateRng = makeRng("sagi-candidates-v1");
const candidates: Candidate[] = Array.from({ length: 50 }, (_, i) => {
  const efficiency = range(candidateRng, 0.05, 0.98);
  const noise = range(candidateRng, -0.12, 0.12);
  const trueScore = Math.max(0, Math.min(1, efficiency * 0.85 + noise));
  return {
    id: `c-${i.toString().padStart(3, "0")}`,
    params: {
      layers: rangeInt(candidateRng, 2, 6),
      width: range(candidateRng, 0.5, 1.5),
      connections: range(candidateRng, 0, 1),
      efficiency,
      seed: `s${i}-${Math.floor(candidateRng() * 99999)}`,
    },
    trueScore,
  };
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

  if (won) {
    user.tokens += reward;
    user.correct += 1;
    totalTokensAwarded += reward;
    const ev = eventsByUser.get(bet.userId) ?? [];
    ev.push({ type: "reward", candidate_id: winnerSide === "a" ? bet.candidateAId : bet.candidateBId, tokens: reward, ts: Date.now() });
    eventsByUser.set(bet.userId, ev);
  }
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
  return { userId };
}

export function createDuel(_userId: string): SignalTask {
  const sorted = [...candidates].sort((a, b) => a.trueScore - b.trueScore);
  const idx = Math.floor(Math.random() * (sorted.length - 1));
  const [raw_a, raw_b] = Math.random() < 0.5
    ? [sorted[idx], sorted[idx + 1]]
    : [sorted[idx + 1], sorted[idx]];
  return { task_id: `t-${shortId()}`, type: "DUEL", a: { id: raw_a.id, params: raw_a.params }, b: { id: raw_b.id, params: raw_b.params } };
}

export function recordBet(taskId: string, userId: string, picked: "a" | "b", candidateAId: string, candidateBId: string): { betId: string } {
  const betId = `bet-${shortId()}`;
  bets.set(betId, { betId, userId, taskId, picked, candidateAId, candidateBId, settled: false, winnerSide: null, won: null, tokens: 0 });
  setTimeout(() => settleBet(betId), 3000 + Math.random() * 2000);
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
  return { players: users.size, votes: totalVotes, tokens_awarded: totalTokensAwarded };
}

export function getNodes(): SwarmNode[] {
  return swarmNodes;
}
