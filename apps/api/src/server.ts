import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { verifyGenome } from "@sagi/evolution";
import { getDashboardSnapshot } from "@sagi/shared";
import { clearSessionCookie, getSessionInfo, isAuthenticated, setSessionCookie } from "./auth.js";
import { getAppEnv } from "./env.js";

const app = express();
const env = getAppEnv();
const port = env.port;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const webDistDir = path.resolve(currentDir, "../../web/dist");

app.use(express.json());

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
  if (!isAuthenticated(request, env)) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  const seed = typeof request.body?.seed === "string" ? request.body.seed.trim() : "";
  const genome = request.body?.genome;
  const cols = request.body?.cols;
  const rows = request.body?.rows;
  const hiddenUnits = request.body?.hiddenUnits;

  if (!seed) {
    response.status(400).json({ error: "Seed is required." });
    return;
  }

  if (!Array.isArray(genome) || genome.length === 0) {
    response.status(400).json({ error: "Genome must be a non-empty number array." });
    return;
  }

  if (!genome.every((value) => typeof value === "number" && Number.isFinite(value))) {
    response.status(400).json({ error: "Genome must contain only finite numbers." });
    return;
  }

  if (cols !== undefined && (!Number.isInteger(cols) || cols < 2 || cols > 64)) {
    response.status(400).json({ error: "cols must be an integer between 2 and 64." });
    return;
  }

  if (rows !== undefined && (!Number.isInteger(rows) || rows < 2 || rows > 64)) {
    response.status(400).json({ error: "rows must be an integer between 2 and 64." });
    return;
  }

  if (hiddenUnits !== undefined && (!Number.isInteger(hiddenUnits) || hiddenUnits < 1 || hiddenUnits > 512)) {
    response.status(400).json({ error: "hiddenUnits must be an integer between 1 and 512." });
    return;
  }

  try {
    const result = verifyGenome({
      seed,
      genome: Float32Array.from(genome),
      cols,
      rows,
      gaConfig: hiddenUnits === undefined ? undefined : { hiddenUnits }
    });
    response.json(result);
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Verification failed."
    });
  }
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
