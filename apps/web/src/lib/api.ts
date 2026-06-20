import type { NetworkStatsDTO, TxDTO, WalletDTO } from "@sagi/ledger";
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

/** Chain-explorer wallet view: the wallet plus its recent transactions. */
export interface WalletView {
  wallet: WalletDTO;
  txs: TxDTO[];
}

/**
 * The single data contract for the whole app. Components only ever import
 * `api`. Mock now; swap to httpApi by flipping config.useMock — no component
 * changes required.
 */
export interface Api {
  getProfile(userId: ID): Promise<Profile>;
  getTokens(userId: ID): Promise<TokenSummary>;
  getLeaderboard(opts?: { limit?: number }): Promise<LeaderboardEntry[]>;
  /** Subscribe to live top-N leaderboard standings. Returns an unsubscribe function. */
  subscribeLeaderboard(cb: (rows: LeaderboardEntry[]) => void): () => void;
  getBounties(status?: BountyStatus): Promise<Bounty[]>;
  getBounty(id: ID): Promise<Bounty>;
  getProgress(): Promise<ProgressOverview>;
  getNetwork(): Promise<NetworkSnapshot>;
  /** Subscribe to live network snapshots. Returns an unsubscribe function. */
  subscribeNetwork(cb: (snap: NetworkSnapshot) => void, opts?: { surface?: "app" | "terminal" }): () => void;
  getSessions(userId: ID): Promise<Session[]>;
  startSession(userId: ID, input: NewSessionInput): Promise<Session>;
  /* Chain explorer (exact base-unit amounts as decimal strings). */
  getLedgerStats(): Promise<NetworkStatsDTO>;
  getRecentTx(limit?: number): Promise<TxDTO[]>;
  getWalletView(address: string): Promise<WalletView>;
}

export const api: Api = config.useMock ? mockApi : httpApi;
