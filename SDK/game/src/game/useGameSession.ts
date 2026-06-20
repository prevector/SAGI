import { useCallback, useEffect, useRef, useState } from "react";
import {
  registerUser, requestTask, submitSignal, getSignalResult, getWallet,
  type SignalTask, type SignalResult, type Wallet,
} from "../sdk";
import { combatantFromCandidate, type CombatantVisual } from "./combatantFromCandidate";
import { useDeviceId } from "./useDeviceId";

export type Phase = "loading" | "betting" | "fighting" | "reveal";

export interface Visuals {
  a: CombatantVisual;
  b: CombatantVisual;
}

// The fight animation has to cover the network's 3-5s async settlement.
const MIN_FIGHT_MS = 3000; // never reveal before this, even if settlement is instant
const MAX_FIGHT_MS = 12000; // safety bail-out if settlement somehow never lands
const POLL_MS = 600;

const BEST_STREAK_KEY = "sagi.bestStreak";
const LIFETIME_POT_KEY = "sagi.lifetimePot";

const readNum = (k: string) => Number(localStorage.getItem(k) ?? 0) || 0;

export function useGameSession() {
  const deviceId = useDeviceId();
  const userIdRef = useRef<string | null>(null);
  const startedRef = useRef(false); // StrictMode double-mount guard
  const mountedRef = useRef(true);

  const [phase, setPhase] = useState<Phase>("loading");
  const [task, setTask] = useState<SignalTask | null>(null);
  const [visuals, setVisuals] = useState<Visuals | null>(null);
  const [picked, setPicked] = useState<"a" | "b" | null>(null);
  const [result, setResult] = useState<SignalResult | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);

  const [streak, setStreak] = useState(0);
  const [pot, setPot] = useState(0); // session running score
  const [bestStreak, setBestStreak] = useState(() => readNum(BEST_STREAK_KEY));
  const [lifetimePot, setLifetimePot] = useState(() => readNum(LIFETIME_POT_KEY));

  const startRound = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setPhase("loading");
    setPicked(null);
    setResult(null);
    try {
      const t = await requestTask(userId);
      if (!mountedRef.current) return;
      setTask(t);
      setVisuals({
        a: combatantFromCandidate(t.a.params, "a"),
        b: combatantFromCandidate(t.b.params, "b"),
      });
      setPhase("betting");
    } catch {
      // network not ready — retry shortly
      setTimeout(() => { if (mountedRef.current) startRound(); }, 1000);
    }
  }, []);

  // Register once, then start the first round.
  useEffect(() => {
    mountedRef.current = true;
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const { user_id } = await registerUser(deviceId);
        if (!mountedRef.current) return;
        userIdRef.current = user_id;
        getWallet(user_id).then((w) => mountedRef.current && setWallet(w)).catch(() => {});
        startRound();
      } catch {
        setTimeout(() => { startedRef.current = false; }, 1000);
      }
    })();
    return () => { mountedRef.current = false; };
  }, [deviceId, startRound]);

  const finish = useCallback((r: SignalResult) => {
    const userId = userIdRef.current;
    setResult(r);
    setPhase("reveal");
    if (r.won) {
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => {
          const nb = Math.max(b, next);
          localStorage.setItem(BEST_STREAK_KEY, String(nb));
          return nb;
        });
        return next;
      });
      setPot((p) => p + r.tokens);
      setLifetimePot((lp) => {
        const nlp = lp + r.tokens;
        localStorage.setItem(LIFETIME_POT_KEY, String(nlp));
        return nlp;
      });
    } else {
      setStreak(0);
    }
    if (userId) getWallet(userId).then((w) => mountedRef.current && setWallet(w)).catch(() => {});
  }, []);

  const placeBet = useCallback(async (side: "a" | "b") => {
    const userId = userIdRef.current;
    if (!userId || !task || phase !== "betting") return;
    setPicked(side);
    setPhase("fighting");
    try {
      const { bet_id } = await submitSignal(task.task_id, userId, side, task.a.id, task.b.id);
      const startedAt = Date.now();
      const poll = async () => {
        if (!mountedRef.current) return;
        let r: SignalResult;
        try {
          r = await getSignalResult(bet_id);
        } catch {
          r = { settled: false, won: null, winner: null, tokens: 0 };
        }
        const elapsed = Date.now() - startedAt;
        if ((r.settled && elapsed >= MIN_FIGHT_MS) || elapsed >= MAX_FIGHT_MS) {
          finish(r);
        } else {
          setTimeout(poll, POLL_MS);
        }
      };
      setTimeout(poll, Math.min(POLL_MS, MIN_FIGHT_MS));
    } catch {
      // submit failed — fall back to betting so the player can retry
      if (mountedRef.current) { setPhase("betting"); setPicked(null); }
    }
  }, [task, phase, finish]);

  const nextRound = useCallback(() => { startRound(); }, [startRound]);

  return {
    phase, task, visuals, picked, result, wallet,
    streak, pot, bestStreak, lifetimePot,
    placeBet, nextRound,
  };
}
