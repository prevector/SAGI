import type { Api } from "./api";
import type { BountyStatus, ID, LeaderboardEntry, NewSessionInput, NetworkSnapshot } from "./types";
import { apiUrl, fetchJson } from "./request";

/**
 * Subscribe to a JSON-per-message SSE endpoint. EventSource auto-reconnects on
 * transient errors; we close on unmount. Bursts (e.g. a driver tick and an
 * epoch close landing together) are coalesced to one callback per animation
 * frame so a store never re-render-storms. Malformed frames are ignored
 * (keep-alive comments never reach onmessage).
 */
function subscribeSse<T>(path: string, cb: (data: T) => void): () => void {
  const es = new EventSource(apiUrl(path), { withCredentials: true });
  let latest: T | null = null;
  let scheduled = false;
  const schedule =
    typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : (fn: () => void) => setTimeout(fn, 16);
  const flush = () => {
    scheduled = false;
    if (latest !== null) {
      cb(latest);
      latest = null;
    }
  };
  es.onmessage = (event: MessageEvent<string>) => {
    try {
      latest = JSON.parse(event.data) as T;
    } catch {
      return;
    }
    if (!scheduled) {
      scheduled = true;
      schedule(flush);
    }
  };
  return () => es.close();
}

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
  subscribeLeaderboard: (cb: (rows: LeaderboardEntry[]) => void) => subscribeSse<LeaderboardEntry[]>("/api/leaderboard/stream", cb),
  getBounties: (status?: BountyStatus) => fetchJson(`/api/bounties${status ? `?status=${status}` : ""}`),
  getBounty: (id: ID) => fetchJson(`/api/bounties/${encodeURIComponent(id)}`),
  getProgress: () => fetchJson(`/api/progress`),
  getNetwork: () => fetchJson(`/api/network`),
  subscribeNetwork: (cb: (snap: NetworkSnapshot) => void, opts?: { surface?: "app" | "terminal" }) => {
    const query = opts?.surface ? `?surface=${encodeURIComponent(opts.surface)}` : "";
    return subscribeSse<NetworkSnapshot>(`/api/network/stream${query}`, cb);
  },
  getSessions: (userId: ID) => fetchJson(`/api/sessions/${encodeURIComponent(userId)}`),
  startSession: (userId: ID, input: NewSessionInput) =>
    fetchJson(`/api/sessions`, { method: "POST", body: JSON.stringify({ userId, ...input }) }),
  getLedgerStats: () => fetchJson(`/api/ledger/stats`),
  getRecentTx: (limit?: number) => fetchJson(`/api/ledger/tx${limit ? `?limit=${limit}` : ""}`),
  getWalletView: (address: string) => fetchJson(`/api/ledger/wallet/${encodeURIComponent(address)}`)
};
