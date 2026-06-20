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
import type { DemoDriver } from "./driver.js";
import type { SseHub } from "./sse.js";
import type { PresenceHub } from "./presence.js";
import {
  buildBounties,
  buildLeaderboard,
  buildNetworkSnapshot,
  buildProfile,
  buildProgress,
  buildTokenSummary,
  sessionToDTO
} from "./read.js";
import { buildLedgerStats, getTx, getWalletView, listBlocks, recentTx } from "./explorer.js";

export interface LedgerDeps {
  service: LedgerService;
  handle: DbHandle;
  cfg: LedgerConfig;
  hub: SseHub;
  lbHub: SseHub;
  presence: PresenceHub;
  env: AppEnv;
  driver?: DemoDriver | null;
}

export function createLedgerRouter(deps: LedgerDeps): Router {
  const { service, handle, cfg, hub, lbHub, presence, env, driver } = deps;
  const db = handle.db;
  const router = Router();

  const snapshot = () => buildNetworkSnapshot(db, cfg, service.currentEpoch(), presence.listConnectedUsers());

  const broadcastSnapshot = () => hub.broadcast(snapshot());

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

  router.get("/api/leaderboard/stream", (req, res) => {
    if (!isAuthenticated(req, env)) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    lbHub.add(res);
    // Push current standings immediately so the client paints without waiting.
    // The shared stream omits "you" highlighting; the client re-marks it by name.
    res.write(`data: ${JSON.stringify(service.leaderboardSnapshot())}\n\n`);
    req.on("close", () => lbHub.remove(res));
  });

  router.get("/api/network", (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json(snapshot());
  });

  router.get("/api/network/stream", (req, res) => {
    if (!isAuthenticated(req, env)) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const username = getAuthenticatedUsername(req, env);
    if (!username) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const surface = req.query.surface === "terminal" ? "terminal" : "app";
    const presenceId = presence.register(username, surface);
    hub.add(res);
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    broadcastSnapshot();
    req.on("close", () => {
      hub.remove(res);
      presence.unregister(presenceId);
      broadcastSnapshot();
    });
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

  // ---- chain explorer (exact base-unit strings) ----------------------------

  router.get("/api/ledger/stats", (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json(buildLedgerStats(db, cfg, service.currentEpoch()));
  });

  router.get("/api/ledger/tx", (req, res) => {
    if (!requireAuth(req, res)) return;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    res.json(recentTx(db, limit));
  });

  router.get("/api/ledger/tx/:id", (req, res) => {
    if (!requireAuth(req, res)) return;
    const tx = getTx(db, req.params.id);
    if (!tx) {
      res.status(404).json({ error: `Transaction ${req.params.id} not found` });
      return;
    }
    res.json(tx);
  });

  router.get("/api/ledger/wallet/:address", (req, res) => {
    if (!requireAuth(req, res)) return;
    const view = getWalletView(db, req.params.address);
    if (!view) {
      res.status(404).json({ error: `Wallet ${req.params.address} not found` });
      return;
    }
    res.json(view);
  });

  router.get("/api/ledger/blocks", (req, res) => {
    if (!requireAuth(req, res)) return;
    res.json(listBlocks());
  });

  // ---- demo control panel (demo mode only) ---------------------------------

  const requireDemo = (req: Request, res: Response): boolean => {
    if (!requireAuth(req, res)) return false;
    if (cfg.mode !== "demo") {
      res.status(404).json({ error: "Control panel is available in demo mode only." });
      return false;
    }
    return true;
  };

  router.get("/api/demo/state", (req, res) => {
    if (!requireAuth(req, res)) return;
    if (cfg.mode !== "demo") {
      res.json({ mode: cfg.mode, demo: false });
      return;
    }
    res.json({
      mode: "demo",
      demo: true,
      driverRunning: driver?.running ?? false,
      openBounties: service.openBountyCount(),
      epoch: service.currentEpoch()
    });
  });

  router.post("/api/demo/advance-epoch", (req, res) => {
    if (!requireDemo(req, res)) return;
    res.json({ ok: true, epoch: service.advanceEpoch() });
  });

  router.post("/api/demo/breakthrough", (req, res) => {
    if (!requireDemo(req, res)) return;
    const result = service.triggerBreakthrough();
    res.json(result ? { ok: true, ...result } : { ok: false, reason: "no open bounties" });
  });

  router.post("/api/demo/win", (req, res) => {
    if (!requireDemo(req, res)) return;
    const body = req.body ?? {};
    let address: string | undefined = typeof body.address === "string" ? body.address : undefined;
    if (!address) {
      const username = getAuthenticatedUsername(req, env);
      if (username) address = service.ensureWallet(username).address;
    }
    if (!address) {
      res.status(400).json({ error: "No winner address." });
      return;
    }
    const result = service.makeWin(address);
    res.json(result ? { ok: true, ...result } : { ok: false, reason: "no open bounties" });
  });

  router.post("/api/demo/driver", (req, res) => {
    if (!requireDemo(req, res)) return;
    const running = Boolean(req.body?.running);
    driver?.setRunning(running);
    res.json({ ok: true, driverRunning: driver?.running ?? false });
  });

  return router;
}
