import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { SessionInfo } from "@sagi/shared";
import { fetchJson } from "../lib/request";

// Username-only auth, backed by the engine's existing signed-cookie session
// (/api/session, /api/auth/login, /api/auth/logout). In local dev the server
// auto-authenticates, so login is not required there.

type Mode = "development" | "production";

interface AuthState {
  username: string | null;
  mode: Mode;
  loading: boolean;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("development");
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: SessionInfo) => {
    setMode(session.mode);
    setUsername(session.authenticated && session.user ? session.user.name : null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = await fetchJson<SessionInfo>("/api/session");
      applySession(session);
    } catch {
      setUsername(null);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (raw: string) => {
      const name = raw.trim();
      const session = await fetchJson<SessionInfo>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: name })
      });
      applySession(session);
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    await fetchJson<void>("/api/auth/logout", { method: "POST" });
    setUsername(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ username, mode, loading, login, logout }),
    [username, mode, loading, login, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
