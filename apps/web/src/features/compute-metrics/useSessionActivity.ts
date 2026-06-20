// "Your machine working" signal: true while the signed-in user has a running
// session. Low-frequency poll of the same api.getSessions call SessionPage uses;
// the widget feeds the result into the source as the busy bias. Decoupled on
// purpose — the browser/agent tiers can ignore it. Falls back to idle (false) on
// any error or missing user.

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";

const POLL_MS = 3000;

export function useSessionActivity(): boolean {
  const { username } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!username) {
      setBusy(false);
      return;
    }
    let active = true;

    const check = async () => {
      if (typeof document !== "undefined" && document.hidden) return; // don't poll hidden
      try {
        const sessions = await api.getSessions(username);
        if (active) setBusy(sessions.some((s) => s.status === "running"));
      } catch {
        if (active) setBusy(false);
      }
    };

    void check();
    const id = setInterval(() => void check(), POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [username]);

  return busy;
}
