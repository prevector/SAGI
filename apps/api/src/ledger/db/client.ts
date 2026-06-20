// better-sqlite3 + Drizzle. Synchronous driver (db.transaction callbacks must
// not be async). The DB file lives under runs/ (git-ignored); ":memory:" is
// used for sandbox/tests.

import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { SCHEMA_DDL } from "./schema.js";
import * as schema from "./schema.js";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export interface DbHandle {
  db: Db;
  raw: Database.Database;
}

export function openDb(dbPath: string): DbHandle {
  if (dbPath !== ":memory:") {
    const dir = path.dirname(path.resolve(dbPath));
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const raw = new Database(dbPath);
  raw.pragma("journal_mode = WAL");
  raw.pragma("foreign_keys = ON");
  raw.exec(SCHEMA_DDL);
  ensureColumns(raw);
  const db = drizzle(raw, { schema });
  return { db, raw };
}

/**
 * Additive, idempotent column migrations for DBs created before a column was
 * added (the prototype has no migration toolchain — CREATE TABLE IF NOT EXISTS
 * never alters an existing table). Each entry is a no-op once the column exists.
 */
function ensureColumns(raw: Database.Database): void {
  const additions: Array<{ table: string; column: string; ddl: string }> = [
    { table: "wallets", column: "best_score", ddl: "ALTER TABLE wallets ADD COLUMN best_score REAL NOT NULL DEFAULT 0" },
    { table: "sessions", column: "score", ddl: "ALTER TABLE sessions ADD COLUMN score REAL" }
  ];
  for (const { table, column, ddl } of additions) {
    const cols = raw.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === column)) raw.exec(ddl);
  }
}
