// Shared live-network state: polls nodes + stats and tracks which node should
// pulse on each tokens_awarded delta. Both the 3D swarm and the dashboard cards
// read from one instance so their numbers never disagree.
//
// A real human contribution (human_signals delta) fires a distinct, louder
// ORANGE burst — separate from the quiet teal pulses of ambient bot activity —
// plus a humanBurst event the UI can use for a toast / counter pop.

import { useEffect, useRef, useState } from "react";
import { getNodes, getStats } from "../sdk/index";
import type { NetworkNode, Stats } from "../sdk/index";

export interface HumanBurst {
  id: number;
  tokens: number;
}

export interface NetworkState {
  nodes: NetworkNode[];
  stats: Stats;
  pulsingIds: Set<string>;
  humanPulseIds: Set<string>;
  humanBurst: HumanBurst | null;
}

export function useNetworkStats(): NetworkState {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [stats, setStats] = useState<Stats>({ players: 0, votes: 0, tokens_awarded: 0 });
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const [humanPulseIds, setHumanPulseIds] = useState<Set<string>>(new Set());
  const [humanBurst, setHumanBurst] = useState<HumanBurst | null>(null);
  const lastTokens = useRef(0);
  // -1 means "not seeded yet" — the first stats read primes these without firing,
  // so we never burst on the historical count when the page first loads.
  const lastHumanSignals = useRef(-1);
  const lastHumanTokens = useRef(0);
  const burstId = useRef(0);

  useEffect(() => {
    getNodes().then(setNodes).catch(() => {});
    const id = setInterval(() => getNodes().then(setNodes).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const activesOf = (list: NetworkNode[]) =>
      list.filter((n) => n.type === "active" && n.id !== "core");

    const pickActives = (n: number): string[] => {
      const actives = activesOf(nodes);
      if (actives.length === 0) return [];
      const shuffled = [...actives].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(n, actives.length)).map((a) => a.id);
    };

    const tick = async () => {
      try {
        const s = await getStats();
        setStats(s);

        const humanSignals = s.human_signals ?? 0;
        const humanTokens = s.human_tokens ?? 0;

        // A real person just contributed — make it unmissable.
        if (lastHumanSignals.current >= 0 && humanSignals > lastHumanSignals.current) {
          const tokens = humanTokens - lastHumanTokens.current;
          const ids = new Set<string>(["core", ...pickActives(6)]);
          setHumanPulseIds(ids);
          setHumanBurst({ id: ++burstId.current, tokens });
          setTimeout(() => setHumanPulseIds(new Set()), 1500);
        } else if (lastTokens.current > 0 && s.tokens_awarded > lastTokens.current) {
          // Ambient bot activity — a single quiet teal pulse.
          const [target] = pickActives(1);
          if (target) {
            setPulsingIds((prev) => new Set([...prev, target]));
            setTimeout(
              () =>
                setPulsingIds((prev) => {
                  const next = new Set(prev);
                  next.delete(target);
                  return next;
                }),
              600,
            );
          }
        }

        lastTokens.current = s.tokens_awarded;
        lastHumanSignals.current = humanSignals;
        lastHumanTokens.current = humanTokens;
      } catch {
        /* network not ready yet */
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [nodes]);

  return { nodes, stats, pulsingIds, humanPulseIds, humanBurst };
}
