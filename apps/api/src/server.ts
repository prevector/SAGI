import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { replayGenome, trainOne, verifyGenome, type RunConfig } from "@sagi/evolution";
import { getDashboardSnapshot } from "@sagi/shared";
import { clearSessionCookie, getSessionInfo, isAuthenticated, setSessionCookie, verifyPasswordHash } from "./auth.js";
import { getAppEnv } from "./env.js";
import { getFootballLeaderboard, simulateSubmittedFootballMatch, submitFootballTeam } from "./football.js";
import { loadRun, saveRun } from "./runs.js";
import { PaymentsService, parseBountyDraft } from "./payments.js";
import { isValidPasswordHash, isValidUsername, registerUser, verifyStoredPasswordHash } from "./users.js";
import { buildLedgerConfig } from "./ledger/config.js";
import { openDb } from "./ledger/db/client.js";
import { LedgerService } from "./ledger/service.js";
import { SseHub } from "./ledger/sse.js";
import { PresenceHub } from "./ledger/presence.js";
import { DemoDriver } from "./ledger/driver.js";
import { createLedgerRouter } from "./ledger/routes.js";

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));

// Load .env into process.env BEFORE reading any config. The repo has no env
// loader otherwise, so a root .env (MOLLIE_API_KEY, APP_URL, PORT, …) would be
// silently ignored. Node 20.12+/24 ships process.loadEnvFile; values already in
// the environment win. Production typically sets env via the host, so a missing
// file is a no-op. We try the repo root (works from src/ and dist/) then cwd.
function loadEnvFiles(): void {
  const loadEnvFile = (process as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
  if (!loadEnvFile) return;
  const candidates = [path.resolve(currentDir, "../../../.env"), path.resolve(process.cwd(), ".env")];
  for (const file of [...new Set(candidates)]) {
    try {
      loadEnvFile(file);
      console.log(`SAGI env: loaded ${file}`);
    } catch {
      // No file at this path — fine; env may come from the host instead.
    }
  }
}

loadEnvFiles();
const env = getAppEnv();
const port = env.port;
const webDistDir = path.resolve(currentDir, "../../web/dist");

app.use(express.json());

function requireAuth(request: express.Request, response: express.Response): boolean {
  if (!isAuthenticated(request, env)) {
    response.status(401).json({ error: "Authentication required." });
    return false;
  }
  return true;
}

function parseRunConfig(body: unknown): { config: RunConfig; error?: never } | { error: string } {
  const data = typeof body === "object" && body !== null ? body : {};
  const seed = typeof (data as { seed?: unknown }).seed === "string" ? (data as { seed: string }).seed.trim() : "";
  const rawCols = (data as { cols?: unknown }).cols;
  const rawRows = (data as { rows?: unknown }).rows;
  const rawHiddenUnits = (data as { hiddenUnits?: unknown }).hiddenUnits;
  const rawMaxGenerations = (data as { maxGenerations?: unknown }).maxGenerations;
  const cols = typeof rawCols === "number" ? rawCols : undefined;
  const rows = typeof rawRows === "number" ? rawRows : undefined;
  const hiddenUnits = typeof rawHiddenUnits === "number" ? rawHiddenUnits : undefined;
  const maxGenerations = typeof rawMaxGenerations === "number" ? rawMaxGenerations : undefined;

  if (rawCols !== undefined && cols === undefined) {
    return { error: "cols must be a number." };
  }
  if (rawRows !== undefined && rows === undefined) {
    return { error: "rows must be a number." };
  }
  if (rawHiddenUnits !== undefined && hiddenUnits === undefined) {
    return { error: "hiddenUnits must be a number." };
  }
  if (rawMaxGenerations !== undefined && maxGenerations === undefined) {
    return { error: "maxGenerations must be a number." };
  }

  if (!seed) {
    return { error: "Seed is required." };
  }
  if (cols !== undefined && (!Number.isInteger(cols) || cols < 2 || cols > 64)) {
    return { error: "cols must be an integer between 2 and 64." };
  }
  if (rows !== undefined && (!Number.isInteger(rows) || rows < 2 || rows > 64)) {
    return { error: "rows must be an integer between 2 and 64." };
  }
  if (hiddenUnits !== undefined && (!Number.isInteger(hiddenUnits) || hiddenUnits < 1 || hiddenUnits > 512)) {
    return { error: "hiddenUnits must be an integer between 1 and 512." };
  }
  if (maxGenerations !== undefined && (!Number.isInteger(maxGenerations) || maxGenerations < 1 || maxGenerations > 100000)) {
    return { error: "maxGenerations must be an integer between 1 and 100000." };
  }

  return {
    config: {
      seed,
      ...(cols === undefined ? {} : { cols }),
      ...(rows === undefined ? {} : { rows }),
      ...(hiddenUnits === undefined ? {} : { hiddenUnits }),
      ...(maxGenerations === undefined ? {} : { maxGenerations })
    }
  };
}

function parseGenome(body: unknown): { genome: number[]; error?: never } | { error: string } {
  const genome = typeof body === "object" && body !== null ? (body as { genome?: unknown }).genome : undefined;

  if (!Array.isArray(genome) || genome.length === 0) {
    return { error: "Genome must be a non-empty number array." };
  }

  if (!genome.every((value) => typeof value === "number" && Number.isFinite(value))) {
    return { error: "Genome must contain only finite numbers." };
  }

  return { genome };
}

// Token economy (PLAN-LEDGER.md): SQL-backed earn loop + SSE. The chain layer
// is deferred behind a switch; this is the simple server-side ledger.
const ledgerCfg = buildLedgerConfig(env);
const dbHandle = openDb(ledgerCfg.dbPath);
const sseHub = new SseHub();
const leaderboardHub = new SseHub();
const presenceHub = new PresenceHub();
const ledger = new LedgerService(dbHandle, ledgerCfg, sseHub, presenceHub, leaderboardHub);
ledger.init();
// Live demo driver — only in demo mode; animates the synthetic population.
const demoDriver = ledgerCfg.mode === "demo" ? new DemoDriver(ledger) : null;
demoDriver?.start();
app.use(createLedgerRouter({ service: ledger, handle: dbHandle, cfg: ledgerCfg, hub: sseHub, lbHub: leaderboardHub, presence: presenceHub, env, driver: demoDriver }));
console.log(
  `SAGI ledger: mode=${ledgerCfg.mode} db=${ledgerCfg.dbPath} epoch=${ledgerCfg.emission.epochMs}ms driver=${demoDriver ? "on" : "off"}`
);

// Sponsor bounty funding via Mollie (test mode). Disabled-but-bootable when no
// MOLLIE_API_KEY is set — the routes below return 503 instead of crashing boot.
const payments = new PaymentsService(dbHandle.db, env, ledgerCfg.mode);
console.log(`SAGI payments: ${payments.enabled ? "Mollie test mode ready" : `disabled (${payments.disabledReason})`}`);

app.get("/health", (_request, response) => {
  response.json({ ok: true, mode: env.devMode ? "development" : "production" });
});

app.get("/api/session", (request, response) => {
  response.json(getSessionInfo(request, env));
});

app.post("/api/auth/register", async (request, response) => {
  const submittedUsername =
    typeof request.body?.username === "string" ? request.body.username.trim() : "";
  const submittedPasswordHash =
    typeof request.body?.passwordHash === "string" ? request.body.passwordHash.trim() : "";

  if (!isValidUsername(submittedUsername)) {
    response.status(400).json({ error: "Username must be 2-32 characters using letters, numbers, underscore, or hyphen." });
    return;
  }
  if (!isValidPasswordHash(submittedPasswordHash)) {
    response.status(400).json({ error: "Password is required." });
    return;
  }

  try {
    await registerUser(submittedUsername, submittedPasswordHash, env);
  } catch (error) {
    response.status(409).json({
      error: error instanceof Error ? error.message : "Could not create account."
    });
    return;
  }

  ledger.ensureWallet(submittedUsername);
  setSessionCookie(response, env, submittedUsername);
  response.status(201).json({
    authenticated: true,
    mode: env.devMode ? "development" : "production",
    user: {
      name: submittedUsername
    }
  });
});

app.post("/api/auth/login", async (request, response) => {
  const submittedUsername =
    typeof request.body?.username === "string" ? request.body.username.trim() : "";
  const submittedPasswordHash =
    typeof request.body?.passwordHash === "string" ? request.body.passwordHash.trim() : "";

  if (!submittedUsername) {
    response.status(400).json({ error: "Username is required." });
    return;
  }
  if (!submittedPasswordHash) {
    response.status(400).json({ error: "Password is required." });
    return;
  }
  if (!isValidPasswordHash(submittedPasswordHash)) {
    response.status(400).json({ error: "Password is invalid." });
    return;
  }
  try {
    const valid =
      verifyPasswordHash(submittedUsername, submittedPasswordHash, env) ||
      (await verifyStoredPasswordHash(submittedUsername, submittedPasswordHash));
    if (!valid) {
      response.status(401).json({ error: "Invalid username or password." });
      return;
    }

    ledger.ensureWallet(submittedUsername);
    setSessionCookie(response, env, submittedUsername);
    response.json({
      authenticated: true,
      mode: env.devMode ? "development" : "production",
      user: {
        name: submittedUsername
      }
    });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Could not sign in."
    });
  }
});

app.post("/api/auth/logout", (_request, response) => {
  clearSessionCookie(response, env);
  response.status(204).end();
});

// Sponsor funds a bounty. The bounty is only created (status `open`) once the
// EUR payment clears — this endpoint validates the draft and creates a Mollie
// (test-mode) checkout. See apps/api/src/payments.ts for the seam.
app.post("/api/bounties/checkout", async (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }
  if (!payments.enabled) {
    response.status(503).json({ error: payments.disabledReason ?? "Payments unavailable." });
    return;
  }
  const sponsor = getSessionInfo(request, env).user?.name?.trim();
  if (!sponsor) {
    response.status(401).json({ error: "Authenticated username missing." });
    return;
  }
  const parsed = parseBountyDraft(request.body, sponsor);
  if ("error" in parsed) {
    response.status(400).json({ error: parsed.error });
    return;
  }
  try {
    response.status(201).json(await payments.createCheckout(parsed.draft));
  } catch (error) {
    response.status(502).json({ error: error instanceof Error ? error.message : "Could not start checkout." });
  }
});

// Authoritative status read used by the return page's polling. Re-fetches the
// real status from Mollie and, on first `paid`, materialises the open bounty.
app.get("/api/bounties/contributions/:id/status", async (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }
  try {
    response.json(await payments.getStatus(request.params.id));
  } catch (error) {
    response.status(404).json({ error: error instanceof Error ? error.message : "Unknown contribution." });
  }
});

app.get("/api/football/leaderboard", async (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }
  response.json(await getFootballLeaderboard());
});

app.post("/api/football/submissions", async (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }
  const username = getSessionInfo(request, env).user?.name?.trim();
  if (!username) {
    response.status(401).json({ error: "Authenticated username missing." });
    return;
  }

  try {
    const result = await submitFootballTeam(username, request.body);
    response.status(201).json(result);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Football submission failed."
    });
  }
});

app.get("/api/football/matches/:leftCreatureId/:rightCreatureId", async (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }
  try {
    const result = await simulateSubmittedFootballMatch(
      request.params.leftCreatureId,
      request.params.rightCreatureId
    );
    response.json(result);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Football match failed."
    });
  }
});

app.post("/api/verify", (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }
  const parsedConfig = parseRunConfig(request.body);
  if ("error" in parsedConfig) {
    response.status(400).json({ error: parsedConfig.error });
    return;
  }
  const parsedGenome = parseGenome(request.body);
  if ("error" in parsedGenome) {
    response.status(400).json({ error: parsedGenome.error });
    return;
  }

  try {
    const result = verifyGenome({
      seed: parsedConfig.config.seed,
      genome: Float32Array.from(parsedGenome.genome),
      cols: parsedConfig.config.cols,
      rows: parsedConfig.config.rows,
      gaConfig: parsedConfig.config.hiddenUnits === undefined ? undefined : { hiddenUnits: parsedConfig.config.hiddenUnits }
    });
    response.json(result);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Verification failed."
    });
  }
});

app.post("/api/runs", async (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }
  const mode = request.body?.mode;
  if (mode !== "train" && mode !== "replay") {
    response.status(400).json({ error: "mode must be either 'train' or 'replay'." });
    return;
  }

  const parsedConfig = parseRunConfig(request.body);
  if ("error" in parsedConfig) {
    response.status(400).json({ error: parsedConfig.error });
    return;
  }

  try {
    const outcome =
      mode === "train"
        ? trainOne(parsedConfig.config)
        : replayGenome({ ...parsedConfig.config, genome: (() => {
            const parsedGenome = parseGenome(request.body);
            if ("error" in parsedGenome) {
              throw new Error(parsedGenome.error);
            }
            return parsedGenome.genome;
          })() });

    const record = await saveRun(mode, parsedConfig.config, outcome);
    response.status(201).json(record);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Run failed."
    });
  }
});

app.get("/api/runs/:id", async (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }

  const record = await loadRun(request.params.id);
  if (!record) {
    response.status(404).json({ error: "Run not found." });
    return;
  }

  response.json(record);
});

app.get("/api/dashboard", (request, response) => {
  if (!requireAuth(request, response)) {
    return;
  }

  response.json(getDashboardSnapshot());
});

if (!env.devMode) {
  app.use(express.static(webDistDir));

  app.get("/{*path}", (request, response, next) => {
    if (request.path.startsWith("/api/") || request.path === "/health") {
      next();
      return;
    }

    response.sendFile(path.join(webDistDir, "index.html"));
  });
}

app.listen(port, () => {
  console.log(
    `SAGI server listening on http://localhost:${port} in ${env.devMode ? "development" : "production"} mode`
  );
});
