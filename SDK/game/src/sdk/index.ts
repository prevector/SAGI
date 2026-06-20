// SAGI SDK client — signal path surface (game host app).
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

// The visible "genome" of a candidate — what the network is checking. Each stat is
// an integer 1..50. Deliberately excludes how well the candidate performs.
export interface CandidateParams {
  neuronParams: number;        // parameters per neuron
  synapseStateParams: number;  // parameters describing a synapse's state
  layers: number;              // number of layers
  neuronTypes: number;         // distinct neuron types
  updateComplexity: number;    // complexity of the update rule
  seed: string;
}

export interface SignalTask {
  task_id: string;
  type: "DUEL";
  a: { id: string; params: CandidateParams };
  b: { id: string; params: CandidateParams };
}

export interface Wallet {
  tokens: number;
  scouts: number;
  correct: number;
  rank: number;
}

export interface Stats {
  players: number;
  votes: number;
  tokens_awarded: number;
}

// on_task_settled: the outcome of a bet once the network settles it against ground truth.
export interface SignalResult {
  settled: boolean;
  won: boolean | null;
  winner: "a" | "b" | null;
  tokens: number;
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

export const getSignalResult = (betId: string) =>
  request<SignalResult>(`/signal/${encodeURIComponent(betId)}`);

export const getWallet = (userId: string) =>
  request<Wallet>(`/users/${encodeURIComponent(userId)}/wallet`);

export const getStats = () => request<Stats>("/stats");
