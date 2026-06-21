import crypto from "node:crypto";

export type LedgerMode = "demo" | "sandbox" | "production";

export interface AppEnv {
  devMode: boolean;
  devBypassAuth: boolean;
  sessionSecret: string;
  port: number;
  cookieName: string;
  secureCookies: boolean;
  authUsers: Record<string, string>;
  // Token economy (see PLAN-LEDGER.md). `mode` selects the active tx sources;
  // `seed` makes the demo fixtures reproducible; `dbPath` is the SQLite file
  // (":memory:" for sandbox/tests).
  ledgerMode: LedgerMode;
  ledgerSeed: number;
  dbPath: string;
  // Mollie test-mode payments (bounty funding). `mollieApiKey` must be a
  // `test_...` key — live keys are refused (see payments.ts). `appUrl` is the
  // public origin used to build redirect/webhook URLs Mollie sends the browser
  // back to (the web app, not the API).
  mollieApiKey: string;
  appUrl: string;
}

function resolveLedgerMode(nodeEnv: string): LedgerMode {
  const raw = process.env.LEDGER_MODE;
  if (raw === "demo" || raw === "sandbox" || raw === "production") return raw;
  // Default: showcase-ready demo in dev, clean ledger in production.
  return nodeEnv === "production" ? "production" : "demo";
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function parseAuthUsers(devMode: boolean): Record<string, string> {
  const raw = (process.env.AUTH_USERS ?? "").trim();
  if (raw) {
    return Object.fromEntries(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const divider = entry.indexOf(":");
          if (divider === -1) {
            throw new Error("AUTH_USERS must use username:sha256hex pairs separated by commas.");
          }
          const username = entry.slice(0, divider).trim();
          const hash = entry.slice(divider + 1).trim().toLowerCase();
          if (!username || !/^[a-f0-9]{64}$/.test(hash)) {
            throw new Error("AUTH_USERS entries must be username:sha256hex.");
          }
          return [username, hash];
        })
    );
  }

  if (devMode) {
    return {
      tim: sha256Hex("tim"),
      demo: sha256Hex("demo")
    };
  }

  return {};
}

export function getAppEnv(): AppEnv {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const devMode = process.env.DEV_MODE === "1" || nodeEnv !== "production";
  const ledgerMode = resolveLedgerMode(nodeEnv);
  const devBypassAuth = process.env.DEV_BYPASS_AUTH === "1";
  const authUsers = parseAuthUsers(devMode);

  return {
    devMode,
    devBypassAuth,
    sessionSecret: process.env.SESSION_SECRET ?? "local-dev-secret",
    port: Number(process.env.PORT ?? 4000),
    cookieName: "sagi_session",
    secureCookies: process.env.SECURE_COOKIES === "1" || nodeEnv === "production",
    authUsers,
    ledgerMode,
    ledgerSeed: Number(process.env.LEDGER_SEED ?? 1337),
    dbPath:
      process.env.LEDGER_DB_PATH ?? (ledgerMode === "sandbox" ? ":memory:" : "runs/ledger.db"),
    mollieApiKey: (process.env.MOLLIE_API_KEY ?? "").trim(),
    appUrl: (process.env.APP_URL ?? (devMode ? "http://localhost:5173" : "")).replace(/\/$/, "")
  };
}
