import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { getDashboardSnapshot } from "@sagi/shared";
import { clearSessionCookie, getSessionInfo, isAuthenticated, setSessionCookie } from "./auth.js";
import { getAppEnv } from "./env.js";
import { buildLedgerConfig } from "./ledger/config.js";
import { openDb } from "./ledger/db/client.js";
import { LedgerService } from "./ledger/service.js";
import { SseHub } from "./ledger/sse.js";
import { DemoDriver } from "./ledger/driver.js";
import { createLedgerRouter } from "./ledger/routes.js";

const app = express();
const env = getAppEnv();
const port = env.port;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDistDir = path.resolve(currentDir, "../../web/dist");

app.use(express.json());

// Token economy (PLAN-LEDGER.md): SQL-backed earn loop + SSE. The chain layer
// is deferred behind a switch; this is the simple server-side ledger.
const ledgerCfg = buildLedgerConfig(env);
const dbHandle = openDb(ledgerCfg.dbPath);
const sseHub = new SseHub();
const ledger = new LedgerService(dbHandle, ledgerCfg, sseHub);
ledger.init();
// Live demo driver — only in demo mode; animates the synthetic population.
const demoDriver = ledgerCfg.mode === "demo" ? new DemoDriver(ledger) : null;
demoDriver?.start();
app.use(createLedgerRouter({ service: ledger, handle: dbHandle, cfg: ledgerCfg, hub: sseHub, env, driver: demoDriver }));

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

app.get("/api/dashboard", (request, response) => {
  if (!isAuthenticated(request, env)) {
    response.status(401).json({ error: "Authentication required." });
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
