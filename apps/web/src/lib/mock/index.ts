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
  subscribeNetwork(cb) {
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
  }
};
