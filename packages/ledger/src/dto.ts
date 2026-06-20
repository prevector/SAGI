// Wire DTOs: the JSON-safe shapes that cross the SSE/HTTP boundary. Every
// token amount is a decimal base-unit string (BigInt can't be JSON-encoded).
// The frontend formats these with `formatTokensStr`. Pure converters here keep
// the api read layer thin.

import { toWire } from "./money.js";
import type {
  Bounty,
  LedgerNetworkStats,
  Transaction,
  TxKind,
  WalletState,
} from "./types.js";

export interface WalletDTO {
  address: string;
  username: string;
  total: string; // base units
  pending: string; // base units
  bountiesWon: number;
  computeUnits: number;
  synthetic?: boolean;
}

export interface TxDTO {
  id: string;
  kind: TxKind;
  to: string;
  from?: string;
  amount: string; // base units
  ts: number;
  epoch: number;
  meta?: Record<string, unknown>;
  synthetic?: boolean;
}

export interface NetworkStatsDTO {
  supplyTotal: string;
  supplyCirculating: string;
  emissionThisEpoch: string;
  epoch: number;
  height: number;
  latestHash: string;
  activeContributors: number;
  totalCompute: number;
}

export interface BountyDTO {
  id: string;
  title: string;
  sponsor: string;
  sponsorType: string;
  description: string;
  reward: string; // base units
  status: Bounty["status"];
  targetMetric: string;
  target?: number;
  progress: number;
  participants: number;
  createdAt: number;
  winnerAddr?: string;
  finalMetric?: number;
  closedAt?: number;
  synthetic?: boolean;
}

export function walletToDTO(w: WalletState): WalletDTO {
  return {
    address: w.address,
    username: w.username,
    total: toWire(w.total),
    pending: toWire(w.pending),
    bountiesWon: w.bountiesWon,
    computeUnits: w.computeUnits,
    ...(w.synthetic ? { synthetic: true } : {}),
  };
}

export function txToDTO(t: Transaction): TxDTO {
  return {
    id: t.id,
    kind: t.kind,
    to: t.to,
    ...(t.from ? { from: t.from } : {}),
    amount: toWire(t.amount),
    ts: t.ts,
    epoch: t.epoch,
    ...(t.meta ? { meta: t.meta } : {}),
    ...(t.synthetic ? { synthetic: true } : {}),
  };
}

export function statsToDTO(s: LedgerNetworkStats): NetworkStatsDTO {
  return {
    supplyTotal: toWire(s.supplyTotal),
    supplyCirculating: toWire(s.supplyCirculating),
    emissionThisEpoch: toWire(s.emissionThisEpoch),
    epoch: s.epoch,
    height: s.height,
    latestHash: s.latestHash,
    activeContributors: s.activeContributors,
    totalCompute: s.totalCompute,
  };
}

export function bountyToDTO(b: Bounty): BountyDTO {
  return {
    id: b.id,
    title: b.title,
    sponsor: b.sponsor,
    sponsorType: b.sponsorType,
    description: b.description,
    reward: toWire(b.reward),
    status: b.status,
    targetMetric: b.targetMetric,
    ...(b.target !== undefined ? { target: b.target } : {}),
    progress: b.progress,
    participants: b.participants,
    createdAt: b.createdAt,
    ...(b.winnerAddr ? { winnerAddr: b.winnerAddr } : {}),
    ...(b.finalMetric !== undefined ? { finalMetric: b.finalMetric } : {}),
    ...(b.closedAt !== undefined ? { closedAt: b.closedAt } : {}),
    ...(b.synthetic ? { synthetic: true } : {}),
  };
}
