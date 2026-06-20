import { Router } from "express";
import {
  createDuel, getFeed, getLeaderboard, getNodes,
  getOrCreateUser, getStats, getWallet, recordBet,
} from "../mock/sagiMock.js";

const router = Router();

router.post("/users", (req, res) => {
  const deviceId = typeof req.body?.device_id === "string" ? req.body.device_id.trim() : "";
  if (!deviceId) { res.status(400).json({ error: "device_id is required" }); return; }
  res.json({ user_id: getOrCreateUser(deviceId).userId });
});

router.get("/tasks/next", (req, res) => {
  const userId = typeof req.query.user_id === "string" ? req.query.user_id.trim() : "";
  if (!userId) { res.status(400).json({ error: "user_id is required" }); return; }
  res.json(createDuel(userId));
});

router.post("/signal", (req, res) => {
  const { task_id, user_id, picked, candidate_a_id, candidate_b_id } = req.body ?? {};
  if (typeof task_id !== "string" || typeof user_id !== "string" ||
      (picked !== "a" && picked !== "b") ||
      typeof candidate_a_id !== "string" || typeof candidate_b_id !== "string") {
    res.status(400).json({ error: "task_id, user_id, picked (a|b), candidate_a_id, candidate_b_id required" });
    return;
  }
  const { betId } = recordBet(task_id, user_id, picked, candidate_a_id, candidate_b_id);
  res.json({ ok: true, bet_id: betId });
});

router.get("/leaderboard", (req, res) => {
  res.json(getLeaderboard(Math.min(100, Math.max(1, Number(req.query.limit ?? 20)))));
});

router.get("/users/:id/wallet", (req, res) => {
  res.json(getWallet(req.params.id));
});

router.get("/users/:id/feed", (req, res) => {
  res.json(getFeed(req.params.id, Number(req.query.since ?? 0)));
});

router.get("/stats", (_req, res) => { res.json(getStats()); });
router.get("/nodes", (_req, res) => { res.json(getNodes()); });

export { router as sagiRouter };
