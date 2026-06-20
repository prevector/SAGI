import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import { config } from "../../lib/config";
import type { LeaderboardEntry } from "../../lib/types";
import type { AsyncState } from "../../lib/useAsync";

/**
 * Initial fetch + live subscription for the top-N leaderboard, surfaced as an
 * AsyncState for <Widget>/<Async>. The shared SSE stream omits "you"
 * highlighting (it's broadcast to every client), so we re-mark the current user
 * by username here.
 */
export function useLeaderboard(limit = 10): AsyncState<LeaderboardEntry[]> {
  const { username } = useAuth();
  const [data, setData] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const mark = (rows: LeaderboardEntry[]) =>
      rows.slice(0, limit).map((r) => ({ ...r, isCurrentUser: username != null && r.username === username }));

    api
      .getLeaderboard({ limit })
      .then((rows) => {
        if (active) {
          setData(mark(rows));
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    const unsubscribe = config.features.realtimeLeaderboard
      ? api.subscribeLeaderboard((rows) => {
          if (active) setData(mark(rows));
        })
      : () => {};

    return () => {
      active = false;
      unsubscribe();
    };
  }, [nonce, limit, username]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
