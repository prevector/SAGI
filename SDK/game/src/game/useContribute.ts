import { useCallback, useEffect, useRef, useState } from "react";
import {
  registerUser, requestTask, submitSignal, getSignalResult, getWallet,
  type SignalTask, type SignalResult, type Wallet,
} from "../sdk";
import { combatantFromCandidate, type CombatantVisual } from "./combatantFromCandidate";
import { useDeviceId } from "./useDeviceId";

export type Phase = "loading" | "choosing" | "evaluating" | "result";

export interface Visuals {
  a: CombatantVisual;
  b: CombatantVisual;
}

// The network settles a signal against ground truth in 3-5s.
const POLL_MS = 600;
const MAX_WAIT_MS = 12000;

export function useContribute() {
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
  const [contributed, setContributed] = useState(0); // signals this session

  const refreshWallet = useCallback(() => {
    const uid = userIdRef.current;
    if (uid) getWallet(uid).then((w) => mountedRef.current && setWallet(w)).catch(() => {});
  }, []);

  const loadPair = useCallback(async () => {
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
      setPhase("choosing");
    } catch {
      setTimeout(() => { if (mountedRef.current) loadPair(); }, 1000);
    }
  }, []);

  // Register once, then load the first pair.
  useEffect(() => {
    mountedRef.current = true;
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const { user_id } = await registerUser(deviceId);
        if (!mountedRef.current) return;
        userIdRef.current = user_id;
        refreshWallet();
        loadPair();
      } catch {
        startedRef.current = false;
      }
    })();
    return () => { mountedRef.current = false; };
  }, [deviceId, loadPair, refreshWallet]);

  const choose = useCallback(async (side: "a" | "b") => {
    const userId = userIdRef.current;
    if (!userId || !task || phase !== "choosing") return;
    setPicked(side);
    setPhase("evaluating");
    try {
      const { bet_id } = await submitSignal(task.task_id, userId, side, task.a.id, task.b.id);
      setContributed((n) => n + 1);
      const startedAt = Date.now();
      const poll = async () => {
        if (!mountedRef.current) return;
        let r: SignalResult;
        try {
          r = await getSignalResult(bet_id);
        } catch {
          r = { settled: false, won: null, winner: null, tokens: 0 };
        }
        if (r.settled || Date.now() - startedAt >= MAX_WAIT_MS) {
          setResult(r);
          setPhase("result");
          refreshWallet();
        } else {
          setTimeout(poll, POLL_MS);
        }
      };
      setTimeout(poll, POLL_MS);
    } catch {
      if (mountedRef.current) { setPhase("choosing"); setPicked(null); }
    }
  }, [task, phase, refreshWallet]);

  const next = useCallback(() => { loadPair(); }, [loadPair]);

  return { phase, task, visuals, picked, result, wallet, contributed, choose, next };
}
