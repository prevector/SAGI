// Drizzle SQLite schema for the token economy. Money is stored as TEXT (base
// units) — never a float column. The `synthetic` flag (0/1) tags demo data so
// `production` can exclude/purge it. `transactions` and `blocks` are
// append-only; `blocks` stays empty until the deferred `ledger.chain` switch.
//
// Tables are created via the DDL string below (ensureSchema) — we don't run a
// migration toolchain for the prototype. Keep the Drizzle defs and the DDL in
// sync (both live here).

import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const wallets = sqliteTable("wallets", {
  address: text("address").primaryKey(),
  username: text("username").notNull().unique(),
  total: text("total").notNull().default("0"), // base units
  pending: text("pending").notNull().default("0"), // base units (provisional, current epoch)
  bountiesWon: integer("bounties_won").notNull().default(0),
  computeUnits: integer("compute_units").notNull().default(0),
  synthetic: integer("synthetic").notNull().default(0),
  createdAt: integer("created_at").notNull()
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  fromAddr: text("from_addr"),
  toAddr: text("to_addr").notNull(),
  amount: text("amount").notNull(), // base units
  ts: integer("ts").notNull(),
  epoch: integer("epoch").notNull(),
  meta: text("meta"), // JSON
  synthetic: integer("synthetic").notNull().default(0),
  sig: text("sig"), // reserved (chain)
  blockHeight: integer("block_height") // reserved (chain)
});

export const workReceipts = sqliteTable("work_receipts", {
  sessionId: text("session_id").primaryKey(), // one receipt per session => idempotent
  address: text("address").notNull(),
  computeUnits: integer("compute_units").notNull(),
  usefulness: real("usefulness").notNull(),
  ts: integer("ts").notNull(),
  nonce: text("nonce").notNull(),
  epoch: integer("epoch").notNull(),
  synthetic: integer("synthetic").notNull().default(0),
  sig: text("sig") // reserved (chain)
});

export const bounties = sqliteTable("bounties", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sponsor: text("sponsor").notNull(),
  sponsorType: text("sponsor_type").notNull(),
  description: text("description").notNull(),
  reward: text("reward").notNull(), // base units
  status: text("status").notNull(),
  targetMetric: text("target_metric").notNull(),
  target: real("target"),
  progress: real("progress").notNull().default(0),
  participants: integer("participants").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  winnerAddr: text("winner_addr"),
  finalMetric: real("final_metric"),
  closedAt: integer("closed_at"),
  synthetic: integer("synthetic").notNull().default(0)
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  address: text("address").notNull(),
  bountyId: text("bounty_id"),
  startedAt: integer("started_at").notNull(),
  status: text("status").notNull(),
  computeAllocated: integer("compute_allocated").notNull(),
  durationMin: integer("duration_min").notNull(),
  progress: real("progress").notNull().default(0),
  simMs: integer("sim_ms").notNull(), // demo-compressed wall-clock to completion
  tokensEarned: text("tokens_earned"), // base units (provisional, then final)
  result: text("result"),
  synthetic: integer("synthetic").notNull().default(0)
});

export const epochs = sqliteTable("epochs", {
  idx: integer("idx").primaryKey(),
  startTs: integer("start_ts").notNull(),
  endTs: integer("end_ts"),
  pool: text("pool").notNull(), // base units minted this epoch
  emitted: text("emitted").notNull().default("0"), // base units actually distributed
  status: text("status").notNull() // 'open' | 'closed'
});

export const meta = sqliteTable("meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull()
});

/** DDL run on boot. Mirrors the Drizzle defs above. */
export const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS wallets (
  address TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  total TEXT NOT NULL DEFAULT '0',
  pending TEXT NOT NULL DEFAULT '0',
  bounties_won INTEGER NOT NULL DEFAULT 0,
  compute_units INTEGER NOT NULL DEFAULT 0,
  synthetic INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  from_addr TEXT,
  to_addr TEXT NOT NULL,
  amount TEXT NOT NULL,
  ts INTEGER NOT NULL,
  epoch INTEGER NOT NULL,
  meta TEXT,
  synthetic INTEGER NOT NULL DEFAULT 0,
  sig TEXT,
  block_height INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_addr);
CREATE INDEX IF NOT EXISTS idx_tx_ts ON transactions(ts);
CREATE TABLE IF NOT EXISTS work_receipts (
  session_id TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  compute_units INTEGER NOT NULL,
  usefulness REAL NOT NULL,
  ts INTEGER NOT NULL,
  nonce TEXT NOT NULL,
  epoch INTEGER NOT NULL,
  synthetic INTEGER NOT NULL DEFAULT 0,
  sig TEXT
);
CREATE INDEX IF NOT EXISTS idx_receipt_epoch ON work_receipts(epoch);
CREATE TABLE IF NOT EXISTS bounties (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  sponsor TEXT NOT NULL,
  sponsor_type TEXT NOT NULL,
  description TEXT NOT NULL,
  reward TEXT NOT NULL,
  status TEXT NOT NULL,
  target_metric TEXT NOT NULL,
  target REAL,
  progress REAL NOT NULL DEFAULT 0,
  participants INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  winner_addr TEXT,
  final_metric REAL,
  closed_at INTEGER,
  synthetic INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  address TEXT NOT NULL,
  bounty_id TEXT,
  started_at INTEGER NOT NULL,
  status TEXT NOT NULL,
  compute_allocated INTEGER NOT NULL,
  duration_min INTEGER NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  sim_ms INTEGER NOT NULL,
  tokens_earned TEXT,
  result TEXT,
  synthetic INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_session_user ON sessions(username);
CREATE TABLE IF NOT EXISTS epochs (
  idx INTEGER PRIMARY KEY,
  start_ts INTEGER NOT NULL,
  end_ts INTEGER,
  pool TEXT NOT NULL,
  emitted TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
