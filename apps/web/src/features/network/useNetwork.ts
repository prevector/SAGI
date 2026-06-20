import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { config } from "../../lib/config";
import type { NetworkSnapshot } from "../../lib/types";
import type { AsyncState } from "../../lib/useAsync";
import { useOptionalNetworkPresence } from "./NetworkPresenceProvider";

/** Initial fetch + live subscription, surfaced as an AsyncState for <Widget>. */
export function useNetwork(opts?: { surface?: "app" | "terminal" }): AsyncState<NetworkSnapshot> {
  const shared = useOptionalNetworkPresence();
  const useShared = Boolean(shared && !opts?.surface);
  const [data, setData] = useState<NetworkSnapshot | null>(useShared ? shared?.snapshot ?? null : null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(useShared ? shared?.loading ?? true : true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!useShared || !shared) return;
    setData(shared.snapshot);
    setLoading(shared.loading);
  }, [shared, useShared]);

  useEffect(() => {
    if (useShared) return;

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
        }, opts)
      : () => {};

    return () => {
      active = false;
      unsubscribe();
    };
  }, [nonce, opts?.surface, useShared, opts]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
