// SAGI SDK client — signal path surface.
// All UI code imports from here only. Swap to the real SDK by reimplementing this file.

const BASE = "/api/sagi";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`SAGI API ${res.status}: ${await res.text().catch(() => "")}`);
  return res.json() as Promise<T>;
}

export interface CandidateParams {
  layers: number;
  width: number;
  connections: number;
  efficiency: number;
  seed: string;
}

export interface SignalTask {
  task_id: string;
  type: "DUEL";
  a: { id: string; params: CandidateParams };
  b: { id: string; params: CandidateParams };
}

export interface Candidate {
  id: string;
  params: CandidateParams;
  score: number;
  rank: number;
}

export interface Wallet {
  tokens: number;
  scouts: number;
  correct: number;
  rank: number;
}

export interface RewardEvent {
  type: "reward";
  candidate_id: string;
  tokens: number;
  ts: number;
}

export interface Stats {
  players: number;
  votes: number;
  tokens_awarded: number;
}

export interface NetworkNode {
  id: string;
  type: "passive" | "active";
  x: number;
  y: number;
  z: number;
  active: boolean;
}

export const registerUser = (deviceId: string) =>
  request<{ user_id: string }>("/users", { method: "POST", body: JSON.stringify({ device_id: deviceId }) });

export const requestTask = (userId: string) =>
  request<SignalTask>(`/tasks/next?user_id=${encodeURIComponent(userId)}`);

export const submitSignal = (taskId: string, userId: string, picked: "a" | "b", candidateAId: string, candidateBId: string) =>
  request<{ bet_id: string }>("/signal", {
    method: "POST",
    body: JSON.stringify({ task_id: taskId, user_id: userId, picked, candidate_a_id: candidateAId, candidate_b_id: candidateBId }),
  });

export const getLeaderboard = (limit = 20) =>
  request<Candidate[]>(`/leaderboard?limit=${limit}`);

export const getWallet = (userId: string) =>
  request<Wallet>(`/users/${encodeURIComponent(userId)}/wallet`);

export const pollFeed = (userId: string, since: number) =>
  request<RewardEvent[]>(`/users/${encodeURIComponent(userId)}/feed?since=${since}`);

export const getStats = () => request<Stats>("/stats");

export const getNodes = () => request<NetworkNode[]>("/nodes");
