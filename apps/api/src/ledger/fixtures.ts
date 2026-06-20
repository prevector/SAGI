// Seeded synthetic genesis (demo mode). faker.seed(SEED) => identical world
// every run. Produces a believable population with deterministic sagi1
// addresses, a balance distribution, and a backlog of COMPUTE_REWARD txs over
// the recent past. Everything here is tagged synthetic by the service. The
// well-known contributor names are included first so closed-bounty winners
// resolve and the demo matches the old mock's flavour.

import { faker } from "@faker-js/faker";
import { type Base, deriveAddress, toBase } from "@sagi/ledger";

const KNOWN = [
  "meridian-04", "helix-2f", "aleph-knot", "ada", "tessellate", "lin",
  "vantage", "cytose", "favo", "halcyon", "nimbus", "quill"
];

export interface GenesisWallet {
  address: string;
  username: string;
  total: Base; // base units
  computeUnits: number;
  createdAt: number;
}

export interface GenesisTx {
  id: string;
  toAddr: string;
  amount: Base; // base units
  ts: number;
  computeUnits: number;
}

export interface Genesis {
  wallets: GenesisWallet[];
  txs: GenesisTx[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function buildGenesis(seed: number, opts: { users: number; days: number; now: number }): Genesis {
  faker.seed(seed);

  const usernames: string[] = [];
  for (const k of KNOWN) {
    if (usernames.length < opts.users) usernames.push(k);
  }
  while (usernames.length < opts.users) {
    const candidate =
      faker.internet.username().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 16) ||
      `node-${usernames.length}`;
    if (!usernames.includes(candidate)) usernames.push(candidate);
  }

  const wallets: GenesisWallet[] = [];
  const txs: GenesisTx[] = [];

  usernames.forEach((username, i) => {
    const address = deriveAddress(username);
    const createdAt = opts.now - faker.number.int({ min: 30, max: 320 }) * DAY_MS;

    // Earlier contributors earn more (bootstrap). Total in SAGI -> base units.
    const bootstrap = 1 - i / Math.max(1, usernames.length);
    const totalSagi = Math.round(faker.number.int({ min: 6_000, max: 130_000 }) * (0.5 + bootstrap));
    const total = toBase(totalSagi);

    // Split the total into a backlog of reward txs over the recent past.
    const n = faker.number.int({ min: 4, max: 12 });
    const weights = Array.from({ length: n }, () => faker.number.float({ min: 0.4, max: 1 }));
    const weightSum = weights.reduce((a, b) => a + b, 0) || 1;

    let distributed = 0n;
    let computeUnits = 0;
    for (let k = 0; k < n; k++) {
      const isLast = k === n - 1;
      const amount = isLast
        ? total - distributed // exact remainder so the txs sum to `total`
        : (total * BigInt(Math.round((weights[k] / weightSum) * 1_000_000))) / 1_000_000n;
      distributed += amount;
      const ageDays = (opts.days * (n - k)) / n + faker.number.float({ min: 0, max: 2 });
      const ts = opts.now - Math.round(ageDays * DAY_MS);
      const units = faker.number.int({ min: 200, max: 6_000 });
      computeUnits += units;
      txs.push({
        id: `gx-${address.slice(5, 13)}-${k}`,
        toAddr: address,
        amount: amount < 0n ? 0n : amount,
        ts,
        computeUnits: units
      });
    }

    wallets.push({ address, username, total, computeUnits, createdAt });
  });

  // Stable chronological order for the backlog.
  txs.sort((a, b) => a.ts - b.ts);
  return { wallets, txs };
}

/** Deterministic, plausible device/region/compute for a username (network view). */
const DEVICES = [
  "8×H100 cluster", "4×A100 rig", "RTX 4090 ×2", "M3 Max laptop", "RTX 4080",
  "Colab A100", "6×L40S", "RTX 3090", "M2 Pro laptop", "RTX 4070", "M1 laptop"
];
const REGIONS = ["us-east", "us-west", "eu-west", "eu-north", "ap-south", "ap-east", "sa-east", "us-central", "eu-central"];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function deviceFor(username: string): string {
  return DEVICES[hash(`d:${username}`) % DEVICES.length];
}
export function regionFor(username: string): string {
  return REGIONS[hash(`r:${username}`) % REGIONS.length];
}
export function computePowerFor(username: string, computeUnits: number): number {
  // GFLOPS, loosely tied to accumulated work, deterministic.
  return 120 + (hash(`c:${username}`) % 1700) + Math.min(600, Math.round(computeUnits / 20));
}
