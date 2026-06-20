import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { config } from "../../lib/config";
import type { NetworkSnapshot } from "../../lib/types";
import type { AsyncState } from "../../lib/useAsync";

/** Initial fetch + live subscription, surfaced as an AsyncState for <Widget>. */
export function useNetwork(): AsyncState<NetworkSnapshot> {
  const [data, setData] = useState<NetworkSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);

    api
      .getNetwork()
      .then((snap) => {
        if (active) {
          setData(snap);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    const unsubscribe = config.features.realtimeNetwork
      ? api.subscribeNetwork((snap) => {
          if (active) setData(snap);
        })
      : () => {};

    return () => {
      active = false;
      unsubscribe();
    };
  }, [nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
