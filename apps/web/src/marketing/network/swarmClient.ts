// Swarm data source for the marketing "SAGI network" section.
//
// This is deliberately decoupled from apps/api: it talks to the standalone SAGI
// mock network (the same in-memory backend the SDK contribute app writes to), so
// a human contributing in that app ripples into the homepage swarm.
//
// Prod-safe by default: when VITE_SAGI_SWARM_URL is unset (which it is in the
// sagi.network build), LIVE is false and the section runs a self-contained
// client-side simulation — zero network calls, no `localhost` fetches. Set the
// env to `http://localhost:8000/api/sagi` (or a deployed mock) to go live.

const BASE = import.meta.env.VITE_SAGI_SWARM_URL ?? "";

/** True only when a swarm backend URL is configured. */
export const LIVE = BASE !== "";

export interface NetworkNode {
  id: string;
  type: "passive" | "active";
  x: number;
  y: number;
  z: number;
  active: boolean;
}

export interface Stats {
  players: number;
  votes: number;
  tokens_awarded: number;
  // Human-only tallies (see SDK/mock-network getStats). Optional so older mock
  // builds without the fields still typecheck.
  human_signals?: number;
  human_tokens?: number;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`SAGI swarm ${res.status}`);
  return res.json() as Promise<T>;
}

export const getNodes = () => request<NetworkNode[]>("/nodes");
export const getStats = () => request<Stats>("/stats");
