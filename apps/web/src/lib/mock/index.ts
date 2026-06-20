import type { Api } from "../api";
import type { NetworkSnapshot } from "../types";
import {
  buildBounties,
  buildLeaderboard,
  buildNetworkBase,
  buildProfile,
  buildProgress,
  buildTokenSummary,
  createSession,
  listSessions,
  stepNetwork
} from "./generators";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// The mock derives "you" highlighting from the logged-in user. The real engine
// gets this from the session cookie; AuthContext calls setCurrentUser in mock mode.
let currentUser = "you";
export function setCurrentUser(username: string): void {
  currentUser = username;
}

// Network snapshot is a singleton so getNetwork and subscribeNetwork agree.
let currentNetwork: NetworkSnapshot = buildNetworkBase();
const bounties = buildBounties();

export const mockApi: Api = {
  async getProfile(userId) {
    await delay(180);
    return buildProfile(userId);
  },
  async getTokens(userId) {
    await delay(200);
    return buildTokenSummary(userId);
  },
  async getLeaderboard(opts) {
    await delay(160);
    return buildLeaderboard(currentUser, opts?.limit);
  },
  async getBounties(status) {
    await delay(160);
    return status ? bounties.filter((b) => b.status === status) : bounties;
  },
  async getBounty(id) {
    await delay(120);
    const bounty = bounties.find((b) => b.id === id);
    if (!bounty) throw new Error(`Bounty ${id} not found`);
    return bounty;
  },
  async getProgress() {
    await delay(200);
    return buildProgress();
  },
  async getNetwork() {
    await delay(160);
    return currentNetwork;
  },
  subscribeNetwork(cb, _opts?) {
    const handle = setInterval(() => {
      currentNetwork = stepNetwork(currentNetwork);
      cb(currentNetwork);
    }, 2000);
    return () => clearInterval(handle);
  },
  async getSessions(userId) {
    await delay(140);
    return listSessions(userId);
  },
  async startSession(userId, input) {
    await delay(260);
    return createSession(userId, input);
  },
  // Chain explorer — the mock has no real ledger, so these return empty/zeroed
  // shapes. The real httpApi serves populated data from the SQL ledger.
  async getLedgerStats() {
    await delay(120);
    return {
      supplyTotal: "0",
      supplyCirculating: "0",
      emissionThisEpoch: "0",
      epoch: 0,
      height: 0,
      latestHash: "",
      activeContributors: currentNetwork.nodes.length,
      totalCompute: 0
    };
  },
  async getRecentTx() {
    await delay(120);
    return [];
  },
  async getWalletView(address) {
    await delay(120);
    return {
      wallet: { address, username: address, total: "0", pending: "0", bountiesWon: 0, computeUnits: 0 },
      txs: []
    };
  }
};
