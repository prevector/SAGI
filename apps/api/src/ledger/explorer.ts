// Chain-explorer read model: exact base-unit amounts as decimal STRINGS (the
// @sagi/ledger wire DTOs), distinct from the display-SAGI numbers used by the
// app's existing surfaces. DB rows already store amounts as base-unit strings,
// so these builders pass them straight through. Blocks stay empty until the
// deferred `ledger.chain` switch.

import { type NetworkStatsDTO, type TxDTO, type WalletDTO, emission, toWire } from "@sagi/ledger";
import type { Db } from "./db/client.js";
import { transactions, wallets } from "./db/schema.js";
import type { LedgerConfig } from "./config.js";

function rowToTxDTO(r: typeof transactions.$inferSelect): TxDTO {
  return {
    id: r.id,
    kind: r.kind as TxDTO["kind"],
    to: r.toAddr,
    ...(r.fromAddr ? { from: r.fromAddr } : {}),
    amount: r.amount, // already base-unit string
    ts: r.ts,
    epoch: r.epoch,
    ...(r.meta ? { meta: JSON.parse(r.meta) as Record<string, unknown> } : {}),
    ...(r.synthetic ? { synthetic: true } : {})
  };
}

function rowToWalletDTO(w: typeof wallets.$inferSelect): WalletDTO {
  return {
    address: w.address,
    username: w.username,
    total: w.total,
    pending: w.pending,
    bountiesWon: w.bountiesWon,
    computeUnits: w.computeUnits,
    ...(w.synthetic ? { synthetic: true } : {})
  };
}

export function buildLedgerStats(db: Db, cfg: LedgerConfig, epoch: number): NetworkStatsDTO {
  const ws = db.select().from(wallets).all();
  const supply = ws.reduce((acc, w) => acc + BigInt(w.total), 0n);
  const height = db.select().from(transactions).all().length;
  return {
    supplyTotal: toWire(supply),
    supplyCirculating: toWire(supply), // no locks/burns yet
    emissionThisEpoch: toWire(emission(epoch, cfg.emission)),
    epoch,
    height,
    latestHash: "", // until ledger.chain is enabled
    activeContributors: ws.length,
    totalCompute: ws.reduce((acc, w) => acc + w.computeUnits, 0)
  };
}

export function recentTx(db: Db, limit = 25): TxDTO[] {
  return db.select().from(transactions).all()
    .sort((a, b) => b.ts - a.ts || (a.id < b.id ? 1 : -1))
    .slice(0, limit)
    .map(rowToTxDTO);
}

export function getTx(db: Db, id: string): TxDTO | null {
  const rows = db.select().from(transactions).all().filter((t) => t.id === id);
  return rows[0] ? rowToTxDTO(rows[0]) : null;
}

export interface WalletView {
  wallet: WalletDTO;
  txs: TxDTO[];
}

export function getWalletView(db: Db, address: string, limit = 25): WalletView | null {
  const w = db.select().from(wallets).all().find((x) => x.address === address);
  if (!w) return null;
  const txs = db.select().from(transactions).all()
    .filter((t) => t.toAddr === address || t.fromAddr === address)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
    .map(rowToTxDTO);
  return { wallet: rowToWalletDTO(w), txs };
}

/** Sealed blocks — empty until the deferred chain layer is enabled. */
export function listBlocks(): [] {
  return [];
}
