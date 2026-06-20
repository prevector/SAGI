// Static content for the SAGI landing page — copy is taken verbatim from
// site/STRUCTURE.md (reconciled with the Framer build). Sample/illustrative data
// (counters, leaderboard, bounties, sponsors) mirrors the Framer site 1:1.

/** Where "Join the network" sends visitors — into the dashboard's login. */
export const APP_LOGIN = "/app/login";
/** Placeholder destination for not-yet-wired secondary links. */
export const PLACEHOLDER = "#";

export interface NavLink {
  label: string;
  href: string;
}

// S01 — in-page anchors to the section ids set on each <section>.
export const navLinks: NavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Tokens", href: "#tokens" },
  { label: "Bounties", href: "#bounties" },
  { label: "Backers", href: "#backers" },
];

// S05 — the only on-page numbering.
export interface Step {
  title: string;
  body: string;
  icon: "Dna" | "Bug" | "Cpu" | "GitBranch";
}
export const steps: Step[] = [
  { title: "Genome", body: "A candidate mind is described as a compact genome.", icon: "Dna" },
  { title: "Organism", body: "The genome is grown into an organism and placed in many environments.", icon: "Bug" },
  { title: "Your hardware", body: "Your machine evaluates mutated offspring and returns their fitness.", icon: "Cpu" },
  {
    title: "Selection",
    body: "Evolution Strategies selects and mutates the population. Discoveries propagate.",
    icon: "GitBranch",
  },
];

// S04 — organism cards.
export interface OrganismSpec {
  behavior: "adapts" | "remembers" | "recovers";
  label: string;
  caption: string;
}
export const organisms: OrganismSpec[] = [
  { behavior: "adapts", label: "ADAPTS", caption: "Learns a new rule from a single experience." },
  { behavior: "remembers", label: "REMEMBERS", caption: "Holds onto what mattered across its life." },
  { behavior: "recovers", label: "RECOVERS", caption: "Turns around when the world flips on it." },
];

// S06 — reward rails.
export interface RewardRailSpec {
  title: string;
  body: string;
  icon: "Cpu" | "Trophy";
}
export const rewardRails: RewardRailSpec[] = [
  {
    title: "Compute rewards",
    body: "Earn tokens for every cycle of search your hardware contributes — idle laptop, GPU rig, or cloud node.",
    icon: "Cpu",
  },
  {
    title: "Bounties",
    body: "Earn larger rewards for a verified breakthrough that significantly improves an organism or algorithm — plus rewards for building hard environments, reproducing results, and finding benchmark exploits.",
    icon: "Trophy",
  },
];

// S06 — illustrative stat strip.
export interface CounterSpec {
  to: number;
  suffix?: string;
  caption: string;
}
export const counters: CounterSpec[] = [
  { to: 2400000, suffix: " SAGI", caption: "paid to contributors" },
  { to: 11800, caption: "nodes in the network" },
  { to: 63, caption: "open bounties" },
];

// S06 — sample bounty card.
export const sampleBounty = {
  title: "First to 0.80 transfer under a fixed compute budget",
  reward: "50,000 SAGI",
  tag: "Open",
  helper: "Verified on hidden tasks.",
};

// S07 — leaderboard.
export interface LeaderboardEntry {
  rank: string;
  organism: string;
  score: string;
  status: "Verified" | "Pending";
  reward: string;
}
export const leaderboard: LeaderboardEntry[] = [
  { rank: "01", organism: "meridian-04", score: "0.812", status: "Verified", reward: "50,000 SAGI" },
  { rank: "02", organism: "helix-2f", score: "0.799", status: "Verified", reward: "—" },
  { rank: "03", organism: "aleph-knot", score: "0.781", status: "Pending", reward: "—" },
  { rank: "04", organism: "northwind-7", score: "0.774", status: "Verified", reward: "—" },
  { rank: "05", organism: "corabel-x", score: "0.769", status: "Pending", reward: "—" },
];

// S07 — open bounties list.
export interface OpenBounty {
  title: string;
  reward: string;
}
export const openBounties: OpenBounty[] = [
  { title: "One-shot rule learning under 1k interactions", reward: "35,000 SAGI" },
  { title: "Memory-efficient organism < 50MB state", reward: "20,000 SAGI" },
  { title: "Hardest transfer environment (community-judged)", reward: "15,000 SAGI" },
];

// S08 — fictional sponsor marks (illustrative, per footer disclaimer).
export const sponsors: string[] = [
  "Helix Research",
  "Praxis AI",
  "Meridian Labs",
  "Aleph Compute",
  "Northwind Intelligence",
  "Vantage AI",
  "Corabel",
  "Synthex",
];

// S10 — footer link columns.
export interface FooterColumn {
  title: string;
  links: NavLink[];
}
export const footerColumns: FooterColumn[] = [
  {
    title: "Project",
    links: [
      { label: "Thesis", href: PLACEHOLDER },
      { label: "Paper", href: PLACEHOLDER },
      { label: "GitHub", href: PLACEHOLDER },
    ],
  },
  {
    title: "Network",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Tokens", href: "#tokens" },
      { label: "Bounties", href: "#bounties" },
      { label: "Leaderboard", href: "#bounties" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: PLACEHOLDER },
      { label: "X", href: PLACEHOLDER },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: PLACEHOLDER },
      { label: "Privacy", href: PLACEHOLDER },
    ],
  },
];

export const footerDisclaimer =
  "SAGI is a research project. Network tokens are utility rewards for contributed compute and verified contributions, not an investment or a promise of financial return. Sponsor logos shown are illustrative.";
