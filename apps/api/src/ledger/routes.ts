// HTTP + SSE surface for the token economy. These are exactly the routes the
// web app's httpApi expects (PLAN-LEDGER.md §8). All gated by the existing
// signed-cookie auth; in dev the server auto-authenticates.

import { type Request, type Response, Router } from "express";
import { eq } from "drizzle-orm";
import type { Domain } from "@sagi/shared";
import { getAuthenticatedUsername, isAuthenticated } from "../auth.js";
import type { AppEnv } from "../env.js";
import type { DbHandle } from "./db/client.js";
import { bounties } from "./db/schema.js";
import type { LedgerConfig } from "./config.js";
import type { LedgerService } from "./service.js";
import type { SseHub } from "./sse.js";
import {
  buildBounties,
  buildLeaderboard,
  buildNetworkSnapshot,
  buildProfile,
  buildProgress,
  buildTokenSummary,
  sessionToDTO
} from "./read.js";

export interface LedgerDeps {
  service: LedgerService;
  handle: DbHandle;
  cfg: LedgerConfig;
  hub: SseHub;
  env: AppEnv;
}

export function createLedgerRouter(deps: LedgerDeps): Router {
  const { service, handle, cfg, hub, env } = deps;
  const db = handle.db;
  const router = Router();

  const requireAuth = (req: Request, res: Response): boolean => {
    if (isAuthenticated(req, env)) return true;
    res.status(401).json({ error: "Authentication required." });
    return false;
  };

  router.get("/api/tokens/:username", (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json(buildTokenSummary(db, decodeURIComponent(req.params.username)));
  });

  router.get("/api/leaderboard", (req, res) => {
    if (!requireAuth(req, res)) return;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const me = getAuthenticatedUsername(req, env) ?? "";
    res.json(buildLeaderboard(db, me, limit));
  });

  router.get("/api/network", (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json(buildNetworkSnapshot(db, cfg, service.currentEpoch()));
  });

  router.get("/api/network/stream", (req, res) => {
    if (!isAuthenticated(req, env)) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    hub.add(res);
    // Push the current state immediately so the client paints without waiting.
    res.write(`data: ${JSON.stringify(buildNetworkSnapshot(db, cfg, service.currentEpoch()))}\n\n`);
    req.on("close", () => hub.remove(res));
  });

  router.get("/api/bounties", (req, res) => {
    if (!requireAuth(req, res)) return;
    const status = req.query.status as Domain.BountyStatus | undefined;
    res.json(buildBounties(db, status));
  });

  router.get("/api/bounties/:id", (req, res) => {
    if (!requireAuth(req, res)) return;
    const row = db.select().from(bounties).where(eq(bounties.id, req.params.id)).get();
    if (!row) {
      res.status(404).json({ error: `Bounty ${req.params.id} not found` });
      return;
    }
    res.json(buildBounties(db).find((b) => b.id === req.params.id));
  });

  router.get("/api/profile/:username", (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json(buildProfile(db, decodeURIComponent(req.params.username)));
  });

  router.get("/api/progress", (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json(buildProgress());
  });

  router.get("/api/sessions/:username", (req, res) => {
    if (!requireAuth(req, res)) return;
    const rows = service.listSessions(decodeURIComponent(req.params.username));
    res.json(rows.map((r) => sessionToDTO(r)));
  });

  router.post("/api/sessions", (req, res) => {
    if (!requireAuth(req, res)) return;
    const username = getAuthenticatedUsername(req, env);
    if (!username) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const body = req.body ?? {};
    const input: Domain.NewSessionInput = {
      bountyId: typeof body.bountyId === "string" ? body.bountyId : undefined,
      computeAllocated: Number(body.computeAllocated) || 100,
      durationMin: Number(body.durationMin) || 5
    };
    const row = service.createSession(username, input);
    res.json(sessionToDTO(row));
  });

  return router;
}
