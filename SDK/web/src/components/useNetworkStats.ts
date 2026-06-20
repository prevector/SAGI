// Shared live-network state: polls nodes + stats and tracks which node should
// pulse on each tokens_awarded delta. Both the 3D swarm and the dashboard cards
// read from one instance so their numbers never disagree.

import { useEffect, useRef, useState } from "react";
import { getNodes, getStats } from "../sdk/index";
import type { NetworkNode, Stats } from "../sdk/index";

export interface NetworkState {
  nodes: NetworkNode[];
  stats: Stats;
  pulsingIds: Set<string>;
}

export function useNetworkStats(): NetworkState {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [stats, setStats] = useState<Stats>({ players: 0, votes: 0, tokens_awarded: 0 });
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());
  const lastTokens = useRef(0);

  useEffect(() => {
    getNodes().then(setNodes).catch(() => {});
    const id = setInterval(() => getNodes().then(setNodes).catch(() => {}), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = async () => {
      try {
        const s = await getStats();
        setStats(s);
        const delta = s.tokens_awarded - lastTokens.current;
        if (delta > 0 && nodes.length > 0) {
          const actives = nodes.filter((n) => n.type === "active" && n.id !== "core");
          if (actives.length > 0) {
            const target = actives[Math.floor(Math.random() * actives.length)];
            setPulsingIds((prev) => new Set([...prev, target.id]));
            setTimeout(
              () => setPulsingIds((prev) => { const next = new Set(prev); next.delete(target.id); return next; }),
              600,
            );
          }
        }
        lastTokens.current = s.tokens_awarded;
      } catch { /* network not ready yet */ }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [nodes]);

  return { nodes, stats, pulsingIds };
}
