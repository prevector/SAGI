import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { replayGenome, trainOne, verifyGenome, type RunConfig } from "@sagi/evolution";
import { getDashboardSnapshot } from "@sagi/shared";
import { clearSessionCookie, getSessionInfo, isAuthenticated, setSessionCookie } from "./auth.js";
import { getAppEnv } from "./env.js";
import { loadRun, saveRun } from "./runs.js";
import { buildLedgerConfig } from "./ledger/config.js";
import { openDb } from "./ledger/db/client.js";
import { LedgerService } from "./ledger/service.js";
import { SseHub } from "./ledger/sse.js";
import { PresenceHub } from "./ledger/presence.js";
import { DemoDriver } from "./ledger/driver.js";
import { createLedgerRouter } from "./ledger/routes.js";

const app = express();
const env = getAppEnv();
const port = env.port;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
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
const presenceHub = new PresenceHub();
const ledger = new LedgerService(dbHandle, ledgerCfg, sseHub, presenceHub);
ledger.init();
// Live demo driver — only in demo mode; animates the synthetic population.
const demoDriver = ledgerCfg.mode === "demo" ? new DemoDriver(ledger) : null;
demoDriver?.start();
app.use(createLedgerRouter({ service: ledger, handle: dbHandle, cfg: ledgerCfg, hub: sseHub, presence: presenceHub, env, driver: demoDriver }));
console.log(
  `SAGI ledger: mode=${ledgerCfg.mode} db=${ledgerCfg.dbPath} epoch=${ledgerCfg.emission.epochMs}ms driver=${demoDriver ? "on" : "off"}`
);

app.get("/health", (_request, response) => {
  response.json({ ok: true, mode: env.devMode ? "development" : "production" });
});

app.get("/api/session", (request, response) => {
  response.json(getSessionInfo(request, env));
});

app.post("/api/auth/login", (request, response) => {
  if (env.devMode) {
    response.json(getSessionInfo(request, env));
    return;
  }

  const submittedUsername =
    typeof request.body?.username === "string" ? request.body.username.trim() : "";

  if (!submittedUsername) {
    response.status(400).json({ error: "Username is required." });
    return;
  }

  setSessionCookie(response, env, submittedUsername);
  response.json({
    authenticated: true,
    mode: "production",
    user: {
      name: submittedUsername
    }
  });
});

app.post("/api/auth/logout", (_request, response) => {
  clearSessionCookie(response, env);
  response.status(204).end();
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
