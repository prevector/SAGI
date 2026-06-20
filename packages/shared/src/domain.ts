// SAGI frontend domain model — the contract shared by the web app, the mock
// api, and (later) the real engine's httpApi. These are the structured,
// numeric shapes from the frontend build plan (§7), distinct from the legacy
// presentational types in ./index.ts that feed the old /api/dashboard.

export type ID = string;
export type ISODate = string;

export interface TimeseriesPoint {
  t: ISODate;
  v: number;
}

/* Profile (1) + tokens (2) */

export interface User {
  id: ID;
  username: string;
  joinedAt: ISODate;
  avatarSeed: string;
}

export type UserStatus = "online" | "idle" | "offline";

export interface Profile extends User {
  rank: number;
  totalTokens: number;
  computeContributed: number; // GFLOP-hours
  sessionsRun: number;
  status: UserStatus;
}

export type TokenReason = "compute" | "bounty" | "stake" | "slash" | "burn";

export interface TokenEntry {
  id: ID;
  amount: number; // signed: positive = credited, negative = debited
  reason: TokenReason;
  at: ISODate;
  bountyId?: ID;
  note?: string;
}

export interface TokenSummary {
  total: number;
  earned24h: number;
  byReason: Record<TokenReason, number>;
  history: TimeseriesPoint[]; // cumulative balance over time
  ledger: TokenEntry[];
}

/* Leaderboard (3) */

export interface LeaderboardEntry {
  rank: number;
  userId: ID;
  username: string;
  tokens: number;
  computePower: number;
  delta?: number;
  isCurrentUser?: boolean;
}

/* Bounties — current (4) + historic (5) */

export type BountyStatus = "open" | "active" | "closed";
export type SponsorType = "hardware" | "quant" | "biotech" | "robotics" | "lab";

export interface Bounty {
  id: ID;
  title: string;
  sponsor: string;
  sponsorType: SponsorType;
  description: string;
  rewardTokens: number;
  status: BountyStatus;
  targetMetric: string;
  target?: number;
  progress: number; // 0..1
  participants: number;
  createdAt: ISODate;
  deadline?: ISODate;
  // historic only
  winner?: string;
  finalMetric?: number;
  closedAt?: ISODate;
}

/* Progress to AGI (6) */

export interface Milestone {
  id: ID;
  label: string;
  reachedAt?: ISODate;
  value?: number;
}

export interface MetricSeries {
  key: string;
  label: string;
  unit?: string;
  points: TimeseriesPoint[];
}

export interface ProgressOverview {
  overallProgress: number; // 0..1 -> "progress to AGI"
  headline: string;
  milestones: Milestone[];
  metrics: MetricSeries[];
}

/* Realtime network (7) */

export type NodeStatus = "active" | "idle";

export type PresenceSurface = "app" | "terminal";

export interface ConnectedUser {
  username: string;
  connectedAt: ISODate;
  surface: PresenceSurface;
  sessions?: number;
}

export interface NetworkNode {
  id: ID;
  username: string;
  status: NodeStatus;
  computePower: number; // GFLOPS
  device: string;
  region?: string;
  joinedAt: ISODate;
  online?: boolean;
}

export interface NetworkStats {
  activeContributors: number;
  totalCompute: number;
  runningSessions: number;
  tokensEmitted24h: number;
  onlineUsers?: number;
  // Ledger-economy fields (display SAGI / safe ints), present when the snapshot
  // is served by the token-economy ledger. Exact base-unit amounts for the
  // chain explorer travel separately as strings; these are display-safe.
  supplyTotal?: number;
  emissionThisEpoch?: number;
  epoch?: number;
  height?: number;
}

export interface NetworkSnapshot {
  stats: NetworkStats;
  nodes: NetworkNode[];
  connectedUsers: ConnectedUser[];
  at: ISODate;
}

/* Sessions (8) */

export type SessionStatus = "queued" | "running" | "completed" | "failed";

export interface Session {
  id: ID;
  userId: ID;
  bountyId?: ID;
  startedAt: ISODate;
  status: SessionStatus;
  computeAllocated: number;
  durationMin?: number;
  progress: number; // 0..1
  tokensEarned?: number;
  result?: string;
}

export interface NewSessionInput {
  bountyId?: ID;
  computeAllocated: number;
  durationMin: number;
}
