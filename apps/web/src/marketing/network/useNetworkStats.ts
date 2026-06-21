// Dual-mode live-network state for the "SAGI network" homepage section.
//
// - Live mode (VITE_SAGI_SWARM_URL set): polls /nodes + /stats from the SAGI mock
//   backend. A `tokens_awarded` delta gives a node a quiet ambient pulse (bot
//   activity); a `human_signals` delta fires a louder deep-pink burst + a
//   `humanBurst` event — the tell that a real person contributed via the SDK app.
// - Simulation mode (env unset, or a live poll throws): a self-contained, fetch-free
//   animation so the prod homepage always looks alive without any backend.
//
// `active` is driven by the section's in-view state so nothing polls/animates while
// the section is scrolled out of view.

import { useEffect, useRef, useState } from "react";
import { getNodes, getStats, LIVE, type NetworkNode, type Stats } from "./swarmClient";

export interface HumanBurst {
  /** Monotonic id (timestamp) so consumers can react to each distinct burst. */
  id: number;
  tokens: number;
}

export interface NetworkState {
  nodes: NetworkNode[];
  stats: Stats;
  pulsingIds: Set<string>;
  humanPulseIds: Set<string>;
  humanBurst: HumanBurst | null;
  live: boolean;
}

const EMPTY_STATS: Stats = {
  players: 0,
  votes: 0,
  tokens_awarded: 0,
  human_signals: 0,
  human_tokens: 0,
};

function spherePoint(radius: number): [number, number, number] {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const r = radius * (0.4 + Math.random() * 0.6);
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)];
}

// Mirrors SDK/mock-network's swarm: a bright core, an outer passive shell, and an
// inner active cloud — so simulated and live swarms look identical.
function makeSimNodes(): NetworkNode[] {
  const core: NetworkNode = { id: "core", type: "passive", x: 0, y: 0, z: 0, active: true };
  const passive = Array.from({ length: 25 }, (_, i) => {
    const [x, y, z] = spherePoint(9);
    return { id: `passive-${i}`, type: "passive" as const, x, y, z, active: Math.random() > 0.2 };
  });
  const active = Array.from({ length: 40 }, (_, i) => {
    const [x, y, z] = spherePoint(6);
    return { id: `active-${i}`, type: "active" as const, x, y, z, active: Math.random() > 0.25 };
  });
  return [core, ...passive, ...active];
}

export function useNetworkStats(active: boolean): NetworkState {
  const [nodes, setNodes] = useState<NetworkNode[]>(() => (LIVE ? [] : makeSimNodes()));
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const [humanPulseIds, setHumanPulseIds] = useState<Set<string>>(new Set());
  const [humanBurst, setHumanBurst] = useState<HumanBurst | null>(null);
  const [mode, setMode] = useState<"live" | "sim">(LIVE ? "live" : "sim");

  // Keep the latest nodes readable inside interval callbacks without re-subscribing.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── pulse helpers ───────────────────────────────────────────────────────────
  function pickActives(n: number): string[] {
    const actives = nodesRef.current.filter((nd) => nd.type === "active" && nd.id !== "core");
    if (actives.length === 0) return [];
    const out: string[] = [];
    for (let i = 0; i < n && actives.length > 0; i++) {
      out.push(actives[Math.floor(Math.random() * actives.length)].id);
    }
    return out;
  }

  function pulseAmbient(ids: string[], ms: number) {
    if (ids.length === 0) return;
    setPulsingIds((prev) => new Set([...prev, ...ids]));
    setTimeout(() => {
      if (!mountedRef.current) return;
      setPulsingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, ms);
  }

  function pulseHuman(tokens: number) {
    const ids = ["core", ...pickActives(5)];
    setHumanPulseIds((prev) => new Set([...prev, ...ids]));
    setHumanBurst({ id: Date.now(), tokens });
    setTimeout(() => {
      if (!mountedRef.current) return;
      setHumanPulseIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, 1500);
  }

  // ── live mode ─────────────────────────────────────────────────────────────────
  const lastTokens = useRef(-1);
  const lastHumanTokens = useRef(-1);
  const lastHumanSignals = useRef(-1);

  useEffect(() => {
    if (mode !== "live" || !active) return;
    let cancelled = false;

    const loadNodes = () => getNodes().then((n) => { if (!cancelled) setNodes(n); }).catch(() => {});
    loadNodes();
    const nodesId = setInterval(loadNodes, 5000);

    const tick = async () => {
      try {
        const s = await getStats();
        if (cancelled) return;
        setStats(s);

        // First successful read seeds the baselines so we don't replay backlog.
        if (lastTokens.current < 0) {
          lastTokens.current = s.tokens_awarded;
          lastHumanTokens.current = s.human_tokens ?? 0;
          lastHumanSignals.current = s.human_signals ?? 0;
          return;
        }

        const humanSignals = s.human_signals ?? 0;
        if (humanSignals > lastHumanSignals.current) {
          pulseHuman(Math.max(0, (s.human_tokens ?? 0) - lastHumanTokens.current));
        } else if (s.tokens_awarded > lastTokens.current) {
          // Ambient (bot) reward — quiet single ambient pulse.
          pulseAmbient(pickActives(1), 600);
        }

        lastTokens.current = s.tokens_awarded;
        lastHumanTokens.current = s.human_tokens ?? 0;
        lastHumanSignals.current = humanSignals;
      } catch {
        // Backend unreachable → degrade gracefully to the simulation.
        if (cancelled) return;
        if (nodesRef.current.length === 0) setNodes(makeSimNodes());
        setMode("sim");
      }
    };
    tick();
    const statsId = setInterval(tick, 2000);

    return () => {
      cancelled = true;
      clearInterval(nodesId);
      clearInterval(statsId);
    };
  }, [mode, active]);

  // ── simulation mode ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "sim" || !active) return;
    if (nodesRef.current.length === 0) setNodes(makeSimNodes());

    const id = setInterval(() => {
      // Believable ambient drift in the counters + a couple of ambient pulses.
      setStats((s) => {
        const reward = Math.random() < 0.6 ? Math.max(5, Math.round(10 + Math.random() * 40)) : 0;
        return {
          ...s,
          players: s.players,
          votes: s.votes + 1 + (Math.random() < 0.4 ? 1 : 0),
          tokens_awarded: s.tokens_awarded + reward,
          human_signals: s.human_signals,
          human_tokens: s.human_tokens,
        };
      });
      pulseAmbient(pickActives(Math.random() < 0.4 ? 2 : 1), 600);
    }, 1600);

    return () => clearInterval(id);
  }, [mode, active]);

  return { nodes, stats, pulsingIds, humanPulseIds, humanBurst, live: mode === "live" };
}
