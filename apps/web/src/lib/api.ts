import type { NetworkStatsDTO, TxDTO, WalletDTO } from "@sagi/ledger";
import type {
  Bounty,
  BountyStatus,
  ID,
  ISODate,
  LeaderboardEntry,
  NetworkSnapshot,
  NewSessionInput,
  ProgressOverview,
  Profile,
  Session,
  SponsorType,
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
 * The bounty a sponsor is about to fund, as captured by the launch form. This
 * is a *draft*: the bounty only becomes a real `open` bounty once the EUR
 * payment clears (Mollie), so nothing here is persisted to the ledger yet.
 */
export interface BountyDraftInput {
  title: string;
  algorithmType: string;
  sponsorType: SponsorType;
  description: string;
  /** Estimated compute the bounty is expected to consume, in GFLOP-hours. */
  computeEstimate: number;
  targetMetric: string;
  target?: number;
  startDate: ISODate;
  endDate: ISODate;
  /** EUR the sponsor commits. tokens = amountEur / 10 (1 token = €10). */
  amountEur: number;
  /** Reward tokens minted for the winner (derived from amountEur). */
  tokens: number;
}

/** The payment hand-off returned after a draft is accepted for checkout. */
export interface BountyCheckout {
  /** Contribution id — echoed back on the return URL so the page can poll status. */
  draftId: ID;
  provider: "mollie";
  status: string;
  amountEur: number;
  tokens: number;
  /** Where the browser should be sent to complete payment (Mollie hosted page). */
  checkoutUrl: string;
}

/** Live status of a bounty contribution, re-fetched from Mollie server-side. */
export interface BountyContributionStatus {
  status: string; // created | open | pending | authorized | paid | canceled | expired | failed
  settled: boolean; // true once the status can no longer change
  tokens: number;
  amountEur: number;
  bountyId?: ID; // the open bounty, present once paid
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
  /**
   * Accept a bounty draft for funding and return a payment hand-off. The bounty
   * is created (status `open`) only after the EUR payment clears — see the
   * Mollie seam in apps/api/src/payments.ts.
   */
  createBountyDraft(input: BountyDraftInput): Promise<BountyCheckout>;
  /** Poll a contribution's payment status (authoritative; re-fetched from Mollie). */
  getBountyContributionStatus(contributionId: ID): Promise<BountyContributionStatus>;
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
