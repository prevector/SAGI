export type LedgerMode = "demo" | "sandbox" | "production";

export interface AppEnv {
  devMode: boolean;
  sessionSecret: string;
  port: number;
  cookieName: string;
  secureCookies: boolean;
  // Token economy (see PLAN-LEDGER.md). `mode` selects the active tx sources;
  // `seed` makes the demo fixtures reproducible; `dbPath` is the SQLite file
  // (":memory:" for sandbox/tests).
  ledgerMode: LedgerMode;
  ledgerSeed: number;
  dbPath: string;
}

function resolveLedgerMode(nodeEnv: string): LedgerMode {
  const raw = process.env.LEDGER_MODE;
  if (raw === "demo" || raw === "sandbox" || raw === "production") return raw;
  // Default: showcase-ready demo in dev, clean ledger in production.
  return nodeEnv === "production" ? "production" : "demo";
}

export function getAppEnv(): AppEnv {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const devMode = process.env.DEV_MODE === "1" || nodeEnv !== "production";
  const ledgerMode = resolveLedgerMode(nodeEnv);

  return {
    devMode,
    sessionSecret: process.env.SESSION_SECRET ?? "local-dev-secret",
    port: Number(process.env.PORT ?? 4000),
    cookieName: "sagi_session",
    secureCookies: process.env.SECURE_COOKIES === "1" || nodeEnv === "production",
    ledgerMode,
    ledgerSeed: Number(process.env.LEDGER_SEED ?? 1337),
    dbPath:
      process.env.LEDGER_DB_PATH ?? (ledgerMode === "sandbox" ? ":memory:" : "runs/ledger.db")
  };
}
