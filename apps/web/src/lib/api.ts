import type {
  Bounty,
  BountyStatus,
  ID,
  LeaderboardEntry,
  NetworkSnapshot,
  NewSessionInput,
  ProgressOverview,
  Profile,
  Session,
  TokenSummary
} from "./types";
import { config } from "./config";
import { mockApi } from "./mock";
import { httpApi } from "./http";

/**
 * The single data contract for the whole app. Components only ever import
 * `api`. Mock now; swap to httpApi by flipping config.useMock — no component
 * changes required.
 */
export interface Api {
  getProfile(userId: ID): Promise<Profile>;
  getTokens(userId: ID): Promise<TokenSummary>;
  getLeaderboard(opts?: { limit?: number }): Promise<LeaderboardEntry[]>;
  getBounties(status?: BountyStatus): Promise<Bounty[]>;
  getBounty(id: ID): Promise<Bounty>;
  getProgress(): Promise<ProgressOverview>;
  getNetwork(): Promise<NetworkSnapshot>;
  /** Subscribe to live network snapshots. Returns an unsubscribe function. */
  subscribeNetwork(cb: (snap: NetworkSnapshot) => void): () => void;
  getSessions(userId: ID): Promise<Session[]>;
  startSession(userId: ID, input: NewSessionInput): Promise<Session>;
}

export const api: Api = config.useMock ? mockApi : httpApi;
