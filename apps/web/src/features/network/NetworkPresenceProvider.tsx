import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import { config } from "../../lib/config";
import type { NetworkSnapshot } from "../../lib/types";

interface NetworkPresenceValue {
  snapshot: NetworkSnapshot | null;
  loading: boolean;
}

const NetworkPresenceContext = createContext<NetworkPresenceValue | null>(null);

function presenceSurface(pathname: string): "app" | "terminal" {
  return pathname === "/app" || pathname.endsWith("/app") ? "terminal" : "app";
}

export function NetworkPresenceProvider({ children }: { children: ReactNode }) {
  const { username } = useAuth();
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<NetworkSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const surface = presenceSurface(location.pathname);

  useEffect(() => {
    if (!username) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    api
      .getNetwork()
      .then((snap) => {
        if (active) {
          setSnapshot(snap);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    if (!config.features.realtimeNetwork) {
      return () => {
        active = false;
      };
    }

    const unsubscribe = api.subscribeNetwork((snap) => {
      if (active) {
        setSnapshot(snap);
        setLoading(false);
      }
    }, { surface });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [username, surface]);

  const value = useMemo(() => ({ snapshot, loading }), [snapshot, loading]);
  return <NetworkPresenceContext.Provider value={value}>{children}</NetworkPresenceContext.Provider>;
}

export function useNetworkPresence(): NetworkPresenceValue {
  const value = useContext(NetworkPresenceContext);
  if (!value) {
    throw new Error("Network presence context is unavailable");
  }
  return value;
}

export function useOptionalNetworkPresence(): NetworkPresenceValue | null {
  return useContext(NetworkPresenceContext);
}
