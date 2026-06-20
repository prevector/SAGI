import type { Api } from "./api";
import type { BountyStatus, ID, NewSessionInput } from "./types";
import { fetchJson } from "./request";

// Real-engine implementation — a typed stub for now so the Api interface
// compiles. The engine currently exposes only auth + /api/dashboard; these
// routes do not exist yet. The co-founder fills these in, then flip
// config.useMock = false. Mapping (see PLAN.md):
//   getProfile      -> GET  /api/profile/:id
//   getTokens       -> GET  /api/tokens/:id
//   getLeaderboard  -> GET  /api/leaderboard?limit=
//   getBounties     -> GET  /api/bounties?status=
//   getBounty       -> GET  /api/bounties/:id
//   getProgress     -> GET  /api/progress
//   getNetwork      -> GET  /api/network
//   subscribeNetwork-> WS or SSE at /api/network/stream
//   getSessions     -> GET  /api/sessions/:id
//   startSession    -> POST /api/sessions

const notWired = (method: string) => (): never => {
  throw new Error(`httpApi.${method} not wired — implement the engine endpoint and flip config.useMock.`);
};

export const httpApi: Api = {
  getProfile: (userId: ID) => fetchJson(`/api/profile/${encodeURIComponent(userId)}`),
  getTokens: (userId: ID) => fetchJson(`/api/tokens/${encodeURIComponent(userId)}`),
  getLeaderboard: (opts) => fetchJson(`/api/leaderboard${opts?.limit ? `?limit=${opts.limit}` : ""}`),
  getBounties: (status?: BountyStatus) => fetchJson(`/api/bounties${status ? `?status=${status}` : ""}`),
  getBounty: (id: ID) => fetchJson(`/api/bounties/${encodeURIComponent(id)}`),
  getProgress: () => fetchJson(`/api/progress`),
  getNetwork: () => fetchJson(`/api/network`),
  // Realtime needs a WS/SSE channel that does not exist yet.
  subscribeNetwork: notWired("subscribeNetwork"),
  getSessions: (userId: ID) => fetchJson(`/api/sessions/${encodeURIComponent(userId)}`),
  startSession: (userId: ID, input: NewSessionInput) =>
    fetchJson(`/api/sessions`, { method: "POST", body: JSON.stringify({ userId, ...input }) })
};
