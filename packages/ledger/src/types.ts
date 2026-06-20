// The shared ledger contract — imported by the engine (apps/api) and the web
// app. Kept isomorphic: no node-only imports here. Money is `Base` (bigint).
//
// Per PLAN-LEDGER.md, the signed/hash-chained blockchain layer is DEFERRED
// behind the `ledger.chain` switch. The fields that layer needs (`sig`,
// `blockHeight`, the `Block` type) are reserved here as optional/unused so it
// can be enabled later without reshaping the data model.

import type { Base } from "./money.js";

/** Deterministic, human-tagged address: "sagi1" + hex(sha256(username)). */
export type Address = string;

export type TxKind =
  | "GENESIS"
  | "COMPUTE_REWARD"
  | "BOUNTY_PAYOUT"
  | "STAKE" // stub
  | "SLASH" // stub
  | "BURN"; // stub

export interface Transaction {
  id: string;
  kind: TxKind;
  to: Address;
  from?: Address; // mint txs have no `from`
  amount: Base;
  ts: number;
  epoch: number;
  meta?: Record<string, unknown>;
  synthetic?: true; // demo/fixtures/driver-authored
  sig?: string; // reserved for the chain layer (per-node/sequencer signing)
  blockHeight?: number; // reserved for the chain layer
}

/** The "earn by compute" input. `sig`/`stake` reserved (chain/staking later). */
export interface WorkReceipt {
  sessionId: string;
  address: Address;
  computeUnits: number; // normalized throughput x time (computeAllocated x durationMin)
  usefulness: number; // training signal (GA fitness); default 1.0
  ts: number;
  nonce: string;
  epoch: number;
  synthetic?: true;
  sig?: string; // reserved (chain)
  stake?: Base; // reserved (staking stub)
}

/** Read-model row: the dead-simple username:total, plus economy detail. */
export interface WalletState {
  address: Address;
  username: string;
  total: Base;
  pending: Base;
  bountiesWon: number;
  computeUnits: number;
  synthetic?: true;
}

/** Ledger-side network stats (distinct from the frontend's live-network stats;
 *  the SSE payload merges both — see PLAN-LEDGER.md §7). */
export interface LedgerNetworkStats {
  supplyTotal: Base;
  supplyCirculating: Base;
  emissionThisEpoch: Base;
  epoch: number;
  height: number; // tx count now; block height once the chain is on
  latestHash: string; // "" until the chain layer is enabled
  activeContributors: number;
  totalCompute: number;
}

export type BountyStatus = "open" | "active" | "closed";

export interface Bounty {
  id: string;
  title: string;
  sponsor: string;
  sponsorType: string;
  description: string;
  reward: Base;
  status: BountyStatus;
  targetMetric: string;
  target?: number;
  progress: number; // 0..1
  participants: number;
  createdAt: number;
  winnerAddr?: Address;
  finalMetric?: number;
  closedAt?: number;
  synthetic?: true;
}

export type LedgerMode = "demo" | "sandbox" | "production";

export interface EmissionConfig {
  model: "geometric" | "halving";
  E0: Base; // epoch-0 reward pool (base units)
  r: number; // geometric decay factor, 0 < r < 1
  epochMs: number; // epoch length (drives finalize + broadcast cadence)
  cap: Base; // total emission cap
  halvingPeriod?: number; // epochs per halving (halving model only)
}

/** Reserved for the deferred chain layer. Unused until `ledger.chain` is on. */
export interface Block {
  height: number;
  ts: number;
  prevHash: string;
  merkleRoot: string;
  txs: Transaction[];
  sealedBy: Address;
  hash: string;
  sig: string;
}
