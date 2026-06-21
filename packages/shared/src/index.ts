// Structured domain model for the React dashboard (build plan §7). Exposed
// under the `Domain` namespace so its `Bounty`/`LeaderboardEntry` do not clash
// with the legacy presentational types below that feed the old /api/dashboard.
export * as Domain from "./domain.js";
export * from "./football.js";

export type Status = "verified" | "pending";

export interface NetworkMetric {
  label: string;
  value: string;
  detail: string;
}

export interface PopulationStat {
  label: string;
  value: string;
  change: string;
}

export interface OrganismCard {
  id: string;
  title: string;
  lineage: string;
  trait: string;
  status: Status;
  summary: string;
}

export interface Bounty {
  id: string;
  title: string;
  reward: string;
  focus: string;
  status: Status;
}

export interface LeaderboardEntry {
  rank: string;
  organism: string;
  transferScore: string;
  status: Status;
  reward: string;
}

export interface ActivityEvent {
  time: string;
  title: string;
  description: string;
}

export interface DashboardSnapshot {
  generatedAt: string;
  headline: string;
  subheadline: string;
  metrics: NetworkMetric[];
  population: PopulationStat[];
  organisms: OrganismCard[];
  bounties: Bounty[];
  leaderboard: LeaderboardEntry[];
  activity: ActivityEvent[];
}

export interface SessionInfo {
  authenticated: boolean;
  mode: "development" | "production";
  user: {
    name: string;
  } | null;
}

const dashboardSeed: Omit<DashboardSnapshot, "generatedAt"> = {
  headline: "A living search through possible minds",
  subheadline:
    "SAGI grows candidate learning systems as organisms, evaluates them across shifting environments, and rewards the search for generalization.",
  metrics: [
    {
      label: "Active nodes",
      value: "11,842",
      detail: "Laptops, GPU rigs, and cloud workers contributing search cycles."
    },
    {
      label: "Open bounties",
      value: "63",
      detail: "Focused challenges for transfer, memory efficiency, and recovery."
    },
    {
      label: "Rewards paid",
      value: "2.4M SAGI",
      detail: "Utility tokens earned for verified compute and benchmark work."
    }
  ],
  population: [
    {
      label: "Current generation",
      value: "2048",
      change: "+128 in the last epoch"
    },
    {
      label: "Mutation families",
      value: "17",
      change: "3 new operators under trial"
    },
    {
      label: "Transfer benchmark",
      value: "0.812",
      change: "Best verified score this week"
    }
  ],
  organisms: [
    {
      id: "meridian-04",
      title: "Meridian 04",
      lineage: "Plastic recurrent lattice",
      trait: "Adapts from one episode",
      status: "verified",
      summary: "Recovered from a rule switch after a single failed attempt."
    },
    {
      id: "helix-2f",
      title: "Helix 2F",
      lineage: "Memory-gated topology",
      trait: "Remembers task structure",
      status: "verified",
      summary: "Maintained stable state across multi-environment evaluation."
    },
    {
      id: "aleph-knot",
      title: "Aleph Knot",
      lineage: "Symbolic-plastic hybrid",
      trait: "Recovers after disruption",
      status: "pending",
      summary: "Strong early transfer score, awaiting hidden-task verification."
    }
  ],
  bounties: [
    {
      id: "b-001",
      title: "First to 0.80 transfer under fixed compute",
      reward: "50,000 SAGI",
      focus: "Cross-task generalization",
      status: "verified"
    },
    {
      id: "b-002",
      title: "One-shot rule learning under 1k interactions",
      reward: "35,000 SAGI",
      focus: "Rapid adaptation",
      status: "pending"
    },
    {
      id: "b-003",
      title: "Memory-efficient organism below 50MB state",
      reward: "20,000 SAGI",
      focus: "Compact persistent memory",
      status: "pending"
    }
  ],
  leaderboard: [
    {
      rank: "01",
      organism: "meridian-04",
      transferScore: "0.812",
      status: "verified",
      reward: "50,000 SAGI"
    },
    {
      rank: "02",
      organism: "helix-2f",
      transferScore: "0.799",
      status: "verified",
      reward: "—"
    },
    {
      rank: "03",
      organism: "aleph-knot",
      transferScore: "0.781",
      status: "pending",
      reward: "—"
    }
  ],
  activity: [
    {
      time: "02:14 UTC",
      title: "Population reseeded",
      description: "Selection promoted 128 offspring from the recovery benchmark."
    },
    {
      time: "01:42 UTC",
      title: "Hidden-task verification passed",
      description: "Meridian 04 cleared transfer validation and unlocked a bounty."
    },
    {
      time: "00:57 UTC",
      title: "New environment published",
      description: "Community benchmark added a delayed-memory maze with mutable rules."
    }
  ]
};

export function getDashboardSnapshot(): DashboardSnapshot {
  return {
    ...dashboardSeed,
    generatedAt: new Date().toISOString()
  };
}
