import type { Bounty, Milestone, SponsorType } from "../types";

// Static seeds for the mock api. Generators in ./generators.ts turn these into
// the full domain shapes (with timestamps anchored to "now").

export interface Contributor {
  username: string;
  tokens: number;
  computePower: number; // GFLOPS
  device: string;
  region: string;
}

/** Organism / contributor pool used by the leaderboard and the network view. */
export const contributors: Contributor[] = [
  { username: "meridian-04", tokens: 128_400, computePower: 1840, device: "8×H100 cluster", region: "us-east" },
  { username: "helix-2f", tokens: 96_250, computePower: 1320, device: "4×A100 rig", region: "eu-west" },
  { username: "aleph-knot", tokens: 81_010, computePower: 960, device: "RTX 4090 ×2", region: "ap-south" },
  { username: "ada", tokens: 64_730, computePower: 720, device: "M3 Max laptop", region: "eu-north" },
  { username: "tessellate", tokens: 52_180, computePower: 610, device: "RTX 4080", region: "us-west" },
  { username: "lin", tokens: 47_905, computePower: 540, device: "Colab A100", region: "ap-east" },
  { username: "vantage", tokens: 39_440, computePower: 880, device: "6×L40S", region: "us-east" },
  { username: "cytose", tokens: 28_300, computePower: 410, device: "RTX 3090", region: "eu-central" },
  { username: "favo", tokens: 21_770, computePower: 300, device: "M2 Pro laptop", region: "sa-east" },
  { username: "halcyon", tokens: 18_220, computePower: 1500, device: "16×H100 pod", region: "us-central" },
  { username: "nimbus", tokens: 12_640, computePower: 260, device: "RTX 4070", region: "eu-west" },
  { username: "quill", tokens: 8_410, computePower: 180, device: "M1 laptop", region: "ap-south" }
];

export const devices: string[] = [
  "8×H100 cluster",
  "4×A100 rig",
  "RTX 4090 ×2",
  "M3 Max laptop",
  "RTX 4080",
  "Colab A100",
  "6×L40S",
  "RTX 3090",
  "M2 Pro laptop"
];

export const regions: string[] = ["us-east", "us-west", "eu-west", "eu-north", "ap-south", "ap-east", "sa-east"];

interface BountySeed {
  id: string;
  title: string;
  sponsor: string;
  sponsorType: SponsorType;
  description: string;
  rewardTokens: number;
  status: Bounty["status"];
  targetMetric: string;
  target?: number;
  progress: number;
  participants: number;
  // closed only
  winner?: string;
  finalMetric?: number;
}

export const bountySeeds: BountySeed[] = [
  {
    id: "b-001",
    title: "First to 0.85 transfer under fixed compute",
    sponsor: "Halcyon Compute",
    sponsorType: "hardware",
    description:
      "Reach a 0.85 cross-task transfer score within a 1 PFLOP-hour budget. Hidden-task verification decides the winner.",
    rewardTokens: 50_000,
    status: "open",
    targetMetric: "Transfer score",
    target: 0.85,
    progress: 0.71,
    participants: 214
  },
  {
    id: "b-002",
    title: "One-shot rule learning under 1k interactions",
    sponsor: "Vantage Capital",
    sponsorType: "quant",
    description: "Adapt to a switched reward rule from a single failed episode, using fewer than 1,000 interactions.",
    rewardTokens: 35_000,
    status: "active",
    targetMetric: "Interactions to adapt",
    target: 1000,
    progress: 0.46,
    participants: 138
  },
  {
    id: "b-003",
    title: "Memory-efficient organism below 50MB state",
    sponsor: "Cytose Bio",
    sponsorType: "biotech",
    description: "Maintain task structure across multi-environment evaluation while keeping persistent state under 50MB.",
    rewardTokens: 20_000,
    status: "open",
    targetMetric: "Persistent state",
    target: 50,
    progress: 0.33,
    participants: 91
  },
  {
    id: "b-004",
    title: "Recover from rule inversion within 3 episodes",
    sponsor: "Tessell Robotics",
    sponsorType: "robotics",
    description: "After an inverted control mapping, restore baseline performance within three episodes.",
    rewardTokens: 28_000,
    status: "active",
    targetMetric: "Episodes to recover",
    target: 3,
    progress: 0.58,
    participants: 76
  },
  {
    id: "b-005",
    title: "Delayed-memory maze with mutable rules",
    sponsor: "Meridian Lab",
    sponsorType: "lab",
    description: "Solve a delayed-memory maze whose transition rules mutate mid-episode.",
    rewardTokens: 24_000,
    status: "open",
    targetMetric: "Success rate",
    target: 0.9,
    progress: 0.19,
    participants: 54
  },
  {
    id: "b-101",
    title: "First verified 0.80 transfer",
    sponsor: "Halcyon Compute",
    sponsorType: "hardware",
    description: "The opening transfer milestone — first organism to clear a verified 0.80 cross-task score.",
    rewardTokens: 40_000,
    status: "closed",
    targetMetric: "Transfer score",
    target: 0.8,
    progress: 1,
    participants: 312,
    winner: "meridian-04",
    finalMetric: 0.812
  },
  {
    id: "b-102",
    title: "Sub-2k interaction adaptation",
    sponsor: "Vantage Capital",
    sponsorType: "quant",
    description: "Adapt to a rule switch in under 2,000 interactions — the precursor to the current one-shot bounty.",
    rewardTokens: 18_000,
    status: "closed",
    targetMetric: "Interactions to adapt",
    target: 2000,
    progress: 1,
    participants: 187,
    winner: "helix-2f",
    finalMetric: 1740
  },
  {
    id: "b-103",
    title: "Stable state across 5 environments",
    sponsor: "Cytose Bio",
    sponsorType: "biotech",
    description: "Hold task structure across five shifting environments without catastrophic forgetting.",
    rewardTokens: 15_000,
    status: "closed",
    targetMetric: "Environments held",
    target: 5,
    progress: 1,
    participants: 143,
    winner: "aleph-knot",
    finalMetric: 6
  }
];

/** Progress-to-AGI milestones (reached ones get a date in the generator). */
export const milestoneSeeds: Array<Omit<Milestone, "reachedAt"> & { reachedDaysAgo?: number }> = [
  { id: "m1", label: "Self-improving population loop", value: 1, reachedDaysAgo: 210 },
  { id: "m2", label: "Verified 0.80 cross-task transfer", value: 0.8, reachedDaysAgo: 96 },
  { id: "m3", label: "One-shot recovery from rule switch", value: 1, reachedDaysAgo: 28 },
  { id: "m4", label: "Sustained transfer above 0.85", value: 0.85 },
  { id: "m5", label: "Open-ended skill acquisition", value: 1 },
  { id: "m6", label: "General transfer across unseen domains" }
];

export interface MetricDef {
  key: string;
  label: string;
  unit?: string;
  start: number;
  end: number;
  jitter: number;
  tone: "teal" | "orange";
}

/** Metric series definitions (mirror the website metrics). */
export const metricDefs: MetricDef[] = [
  { key: "transfer", label: "Best transfer score", start: 0.41, end: 0.83, jitter: 0.02, tone: "teal" },
  { key: "algorithms", label: "Algorithms evolved", start: 320, end: 2048, jitter: 60, tone: "teal" },
  { key: "compute", label: "Total compute (PFLOP-h)", unit: "PFLOP-h", start: 120, end: 980, jitter: 25, tone: "orange" },
  { key: "contributors", label: "Active contributors", start: 1800, end: 11842, jitter: 320, tone: "teal" }
];
