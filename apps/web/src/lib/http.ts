import type { Api } from "./api";
import type { BountyStatus, ID, NewSessionInput, NetworkSnapshot } from "./types";
import { apiUrl, fetchJson } from "./request";

// Real-engine implementation. The token-economy ledger (apps/api) serves these
// routes; flip config.useMock = false to use them. Mapping (PLAN-LEDGER.md §8):
//   getProfile      -> GET  /api/profile/:id
//   getTokens       -> GET  /api/tokens/:id
//   getLeaderboard  -> GET  /api/leaderboard?limit=
//   getBounties     -> GET  /api/bounties?status=
//   getBounty       -> GET  /api/bounties/:id
//   getProgress     -> GET  /api/progress
//   getNetwork      -> GET  /api/network
//   subscribeNetwork-> SSE  /api/network/stream
//   getSessions     -> GET  /api/sessions/:id
//   startSession    -> POST /api/sessions

export const httpApi: Api = {
  getProfile: (userId: ID) => fetchJson(`/api/profile/${encodeURIComponent(userId)}`),
  getTokens: (userId: ID) => fetchJson(`/api/tokens/${encodeURIComponent(userId)}`),
  getLeaderboard: (opts) => fetchJson(`/api/leaderboard${opts?.limit ? `?limit=${opts.limit}` : ""}`),
  getBounties: (status?: BountyStatus) => fetchJson(`/api/bounties${status ? `?status=${status}` : ""}`),
  getBounty: (id: ID) => fetchJson(`/api/bounties/${encodeURIComponent(id)}`),
  getProgress: () => fetchJson(`/api/progress`),
  getNetwork: () => fetchJson(`/api/network`),
  subscribeNetwork: (cb: (snap: NetworkSnapshot) => void) => {
    // SSE: the server pushes a NetworkSnapshot on every sealed epoch / change.
    // EventSource auto-reconnects on transient errors; we just close on unmount.
    const es = new EventSource(apiUrl("/api/network/stream"), { withCredentials: true });
    es.onmessage = (event: MessageEvent<string>) => {
      try {
        cb(JSON.parse(event.data) as NetworkSnapshot);
      } catch {
        // ignore malformed frames (keep-alive comments never reach onmessage)
      }
    };
    return () => es.close();
  },
  getSessions: (userId: ID) => fetchJson(`/api/sessions/${encodeURIComponent(userId)}`),
  startSession: (userId: ID, input: NewSessionInput) =>
    fetchJson(`/api/sessions`, { method: "POST", body: JSON.stringify({ userId, ...input }) })
};
