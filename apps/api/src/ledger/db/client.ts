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
  const db = drizzle(raw, { schema });
  return { db, raw };
}
