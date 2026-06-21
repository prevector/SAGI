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
import { config } from "../lib/config";
import { fetchJson } from "../lib/request";
import { setCurrentUser } from "../lib/mock";

type Mode = "development" | "production";

interface AuthState {
  username: string | null;
  mode: Mode;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("development");
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((session: SessionInfo) => {
    setMode(session.mode);
    const name = session.authenticated && session.user ? session.user.name : null;
    setUsername(name);
    if (config.useMock && name) {
      setCurrentUser(name);
    }
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

  async function hashPassword(password: string): Promise<string> {
    const encoded = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  const login = useCallback(
    async (raw: string, password: string) => {
      const name = raw.trim();
      const passwordHash = await hashPassword(password);
      const session = await fetchJson<SessionInfo>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: name, passwordHash })
      });
      applySession(session);
    },
    [applySession]
  );

  const register = useCallback(
    async (raw: string, password: string) => {
      const name = raw.trim();
      const passwordHash = await hashPassword(password);
      const session = await fetchJson<SessionInfo>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ username: name, passwordHash })
      });
      applySession(session);
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    await fetchJson<void>("/api/auth/logout", { method: "POST" });
    setUsername(null);
    if (config.useMock) {
      setCurrentUser("guest");
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ username, mode, loading, login, register, logout }),
    [username, mode, loading, login, register, logout]
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
