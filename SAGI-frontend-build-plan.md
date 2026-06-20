# SAGI Frontend — Build Plan & Spec

A handoff spec for building the SAGI prototype frontend with Claude Code. The backend (the "engine") is built separately by the co-founder; this app is **mock-first** and talks to one typed `Api` interface, so swapping mock data for the real engine later is a single-file change with zero edits in components.

Design direction is fixed: **same system as the website** (Geist + Geist Mono, near-black surfaces, teal + orange accents, colorblind-safe). This app is the *dark dashboard* variant of that system.

---

## 1. Principles

- **TypeScript everywhere.** Types are the contract between UI, mock data, and the real engine.
- **Mock-first.** Everything works standalone with fake data + a simulated realtime stream. No backend needed to develop or demo.
- **One swap point.** `api.ts` exports either `mockApi` or `httpApi` (same interface). The co-founder's engine plugs in here.
- **Config-driven & customizable.** Design via tokens in one CSS file; brand text and flags in one `config.ts`; each dashboard element is a self-contained feature folder you can add/remove without touching the others.
- **Minimal dependencies.** Only packages that clearly earn their place (listed below).
- **Colorblind-safe by rule.** Colour is never the only signal — every status, delta, and series also carries an icon, shape, label, or text. (Hard constraint.)

---

## 2. Stack (minimal, with rationale)

| Concern | Choice | Why / alternative |
|---|---|---|
| Build tool | **Vite** + React 18 + TypeScript | Fastest SPA setup; no server needed since the engine is separate. *Alt: Next.js App Router if you later want SSR/file routing/API routes — see note below.* |
| Routing | **react-router-dom** v6 | Login + dashboard + per-element pages. |
| Styling | **`tokens.css` (CSS variables) + Tailwind CSS v4** | Tokens are the source of truth; Tailwind v4 consumes them via `@theme` for fast, consistent building. *Alt: drop Tailwind and use CSS Modules — tokens.css still drives everything (zero extra deps).* |
| Fonts | **`geist`** (npm, by Vercel) | Self-hosts Geist + Geist Mono, Vite-friendly. *Alt: `@fontsource-variable/geist` or local woff2.* |
| Charts | **recharts** | Progress + metric + network charts quickly. *Alt: hand-rolled SVG for total colorblind control (0 deps).* |
| Icons | **lucide-react** | Clean line icons matching the aesthetic; also carry the non-colour status signal. |
| Data fetching | none for prototype (plain async + a tiny `useAsync` hook) | Add **@tanstack/react-query** only when the real engine lands (caching/refetch/websocket sync). |

**Required packages:** `react`, `react-dom`, `react-router-dom`, `typescript`, `vite`, `@vitejs/plugin-react`.
**Recommended:** `tailwindcss`, `@tailwindcss/vite`, `geist`, `recharts`, `lucide-react`.
**Later (real backend):** `@tanstack/react-query`.

> **If you choose Next.js instead:** keep everything below identical except (a) pages live in `app/<route>/page.tsx` instead of `pages/` + `routes.tsx`, (b) add `"use client"` to interactive components, (c) the mock `subscribeNetwork` and `AuthContext` stay client-side. The types, api layer, design system, and feature folders are unchanged.

---

## 3. Design system

This app reuses the website's `DESIGN.md` palette as a **dark dashboard**. Put this in `src/styles/tokens.css` as the single source of truth (Tailwind v4 reads it via `@theme`, or use the vars directly in CSS Modules).

```css
:root {
  /* ---- Brand palette (from the website) ---- */
  --sagi-black:#000000; --sagi-dark:#041414; --sagi-dark-raised:#0B1E1E;
  --sagi-paper:#FAF8F0; --sagi-white:#FFFFFF; --sagi-light-muted:#F7F7F7;
  --sagi-teal:#17C4C4; --sagi-teal-deep:#159999; --sagi-teal-pale:#EFF9F9;
  --sagi-orange:#F0783D; --sagi-orange-deep:#C85E2A;

  /* ---- Semantic (dark dashboard) ---- */
  --bg:var(--sagi-dark);
  --surface:var(--sagi-dark-raised);
  --surface-2:#0E2626;
  --text:var(--sagi-paper);
  --text-muted:#9FB6B6;
  --text-faint:#6E8585;
  --border:rgba(250,248,240,.10);
  --border-strong:rgba(250,248,240,.18);

  --accent:var(--sagi-teal);          /* intelligence / network / token axis */
  --accent-ink:var(--sagi-teal-deep);
  --accent-2:var(--sagi-orange);      /* economy / reward axis */
  --accent-2-ink:var(--sagi-orange-deep);

  /* Status + deltas — ALWAYS paired with an icon/label, never colour alone */
  --status-open:var(--sagi-teal);
  --status-live:var(--sagi-orange);
  --status-closed:#7C8E8E;
  --positive:#36C690;
  --negative:#E1664B;

  /* ---- Type ---- */
  --font-sans:"Geist", system-ui, sans-serif;
  --font-mono:"Geist Mono", ui-monospace, monospace;
  --fs-display:2.5rem; --fs-h1:2rem; --fs-h2:1.5rem; --fs-h3:1.125rem;
  --fs-body:.95rem; --fs-sm:.8125rem; --fs-mono:.8125rem;

  /* ---- Space / radius / shadow / container ---- */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px;
  --radius-sm:6px; --radius:10px; --radius-lg:16px;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.25);
  --container:1320px;
}
```

**Conventions (encode meaning, not decoration):**
- **Mono = data.** Use Geist Mono for numbers, token amounts, compute figures, IDs, timestamps, table labels. Geist for prose/headings.
- **Teal = intelligence/network/token; Orange = economy/reward.** Use consistently (e.g. token *earned* teal, *burned/staked* orange) — but always with a sign/icon too.
- **Eyebrows + hairline dividers** for section structure (mirrors the site). Avoid 01/02/03 numbering unless the content is a real sequence (the session flow and progress milestones are; the dashboard grid is not).

**Colorblind rules (build into every component):**
- Status chips = colour **+ icon + text** (e.g. ● open / ▶ live / ✓ closed).
- Deltas = colour **+ arrow + sign** (▲ +120 / ▼ −15).
- Charts = distinct **line styles/markers + direct end-of-line labels**, never a colour-only legend; max ~2 accent hues per chart (teal/orange) which differ in lightness.
- Never rely on red/green alone for good/bad.

**Fonts:** `import { GeistSans } from "geist/font/sans"` / `geist/font/mono` (or `@fontsource`), then map to `--font-sans` / `--font-mono`.

---

## 4. Project structure

```
sagi-frontend/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    main.tsx
    App.tsx                  # providers + router
    routes.tsx               # route table
    styles/
      tokens.css             # design tokens (source of truth)
      globals.css            # reset + base element styles
    lib/
      types.ts               # ALL domain types (the contract)
      config.ts              # brand text, feature flags, USE_MOCK, API_BASE_URL
      api.ts                 # Api interface + active impl export
      http.ts                # httpApi (real engine) — stub for now
      format.ts              # token/number/compute/date formatters
      useAsync.ts            # tiny async-state hook (loading/error/data)
      mock/
        index.ts             # mockApi: implements Api
        data.ts              # seed data
        generators.ts        # builders + the realtime network simulator
    auth/
      AuthContext.tsx        # username-only auth (localStorage)
      ProtectedRoute.tsx
    components/
      ui/                    # Button, Card, Stat, StatusChip, Delta, Table,
                             # ProgressBar, Sparkline, Avatar, Tag, PageHeader,
                             # EmptyState, Skeleton, MetricChart
      layout/                # AppShell, SideNav, TopBar
    features/                # one folder per dashboard element (widget + helpers)
      profile/  tokens/  leaderboard/  bounties/
      progress/  network/  session/
    pages/                   # route-level pages (placeholders to start)
      LoginPage.tsx
      DashboardPage.tsx      # composes the 8 widgets in a grid
      ProfilePage.tsx
      TokensPage.tsx
      LeaderboardPage.tsx
      BountiesPage.tsx       # tabs: Current | History
      BountyDetailPage.tsx
      ProgressPage.tsx
      NetworkPage.tsx
      SessionPage.tsx
      NotFoundPage.tsx
```

**Pattern:** a *feature* owns its dashboard **widget** (compact card for `DashboardPage`) and any feature-specific logic; the matching **page** in `pages/` is the full-screen view. Shared, dumb visuals live in `components/ui`.

---

## 5. Routing map

```
/login                 LoginPage              (public)
/                      DashboardPage          (protected) — grid of all 8 widgets
/profile               ProfilePage
/tokens                TokensPage
/leaderboard           LeaderboardPage
/bounties              BountiesPage           (tabs: Current | History)
/bounties/:id          BountyDetailPage
/progress              ProgressPage           ("progress to AGI" + metrics)
/network               NetworkPage            (realtime overview)
/session               SessionPage            (start / monitor a session)
*                      NotFoundPage
```

`ProtectedRoute` redirects to `/login` when there's no username in storage. Each dashboard widget has a "View all →" link to its full page.

---

## 6. Auth (username-only, prototype)

No password, no email, no verification. Enter a username → stored in `localStorage` → app treats you as that user. The mock api derives a profile/avatar from the username.

```tsx
// src/auth/AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";

type AuthState = { username: string | null;
  login: (u: string) => void; logout: () => void };
const Ctx = createContext<AuthState | null>(null);
const KEY = "sagi.username";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem(KEY));
  const login = (u: string) => { const v = u.trim(); localStorage.setItem(KEY, v); setUsername(v); };
  const logout = () => { localStorage.removeItem(KEY); setUsername(null); };
  return <Ctx.Provider value={{ username, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => {
  const c = useContext(Ctx); if (!c) throw new Error("useAuth outside provider"); return c;
};
```

```tsx
// src/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
export default function ProtectedRoute() {
  const { username } = useAuth();
  return username ? <Outlet /> : <Navigate to="/login" replace />;
}
```

`LoginPage`: single username input + "Enter network" button (active voice). On submit → `login(username)` → navigate to `/`. Show validation inline ("Pick a username to continue"), not a toast.

---

## 7. Data model — `src/lib/types.ts`

The contract for the whole app. Mock and real engine both produce these shapes.

```ts
export type ID = string;
export type ISODate = string;
export interface TimeseriesPoint { t: ISODate; v: number; }

/* Profile (1) + tokens (2) */
export interface User { id: ID; username: string; joinedAt: ISODate; avatarSeed: string; }
export interface Profile extends User {
  rank: number; totalTokens: number;
  computeContributed: number;     // GFLOP-hours
  sessionsRun: number;
  status: "online" | "idle" | "offline";
}
export type TokenReason = "compute" | "bounty" | "stake" | "slash" | "burn";
export interface TokenEntry { id: ID; amount: number; reason: TokenReason; at: ISODate; bountyId?: ID; note?: string; }
export interface TokenSummary {
  total: number; earned24h: number;
  byReason: Record<TokenReason, number>;
  history: TimeseriesPoint[];      // cumulative balance over time
  ledger: TokenEntry[];
}

/* Leaderboard (3) */
export interface LeaderboardEntry {
  rank: number; userId: ID; username: string;
  tokens: number; computePower: number; delta?: number; isCurrentUser?: boolean;
}

/* Bounties — current (4) + historic (5) */
export type BountyStatus = "open" | "active" | "closed";
export type SponsorType = "hardware" | "quant" | "biotech" | "robotics" | "lab";
export interface Bounty {
  id: ID; title: string; sponsor: string; sponsorType: SponsorType;
  description: string; rewardTokens: number; status: BountyStatus;
  targetMetric: string; target?: number; progress: number;   // 0..1
  participants: number; createdAt: ISODate; deadline?: ISODate;
  winner?: string; finalMetric?: number; closedAt?: ISODate;  // historic only
}

/* Progress to AGI (6) */
export interface Milestone { id: ID; label: string; reachedAt?: ISODate; value?: number; }
export interface MetricSeries { key: string; label: string; unit?: string; points: TimeseriesPoint[]; }
export interface ProgressOverview {
  overallProgress: number;         // 0..1 -> "progress to AGI"
  headline: string;
  milestones: Milestone[];
  metrics: MetricSeries[];         // mirrors the website metrics
}

/* Realtime network (7) */
export interface NetworkNode {
  id: ID; username: string; status: "active" | "idle";
  computePower: number;            // GFLOPS
  device: string; region?: string; joinedAt: ISODate;
}
export interface NetworkStats { activeContributors: number; totalCompute: number; runningSessions: number; tokensEmitted24h: number; }
export interface NetworkSnapshot { stats: NetworkStats; nodes: NetworkNode[]; at: ISODate; }

/* Sessions (8) */
export type SessionStatus = "queued" | "running" | "completed" | "failed";
export interface Session {
  id: ID; userId: ID; bountyId?: ID; startedAt: ISODate;
  status: SessionStatus; computeAllocated: number; durationMin?: number;
  progress: number; tokensEarned?: number; result?: string;
}
export interface NewSessionInput { bountyId?: ID; computeAllocated: number; durationMin: number; }
```

---

## 8. Data / API layer — `src/lib/api.ts`

One interface; mock now, engine later. **Components only ever import `api`.**

```ts
import type {
  ID, Profile, TokenSummary, LeaderboardEntry, Bounty, BountyStatus,
  ProgressOverview, NetworkSnapshot, Session, NewSessionInput
} from "./types";
import { config } from "./config";

export interface Api {
  getProfile(userId: ID): Promise<Profile>;
  getTokens(userId: ID): Promise<TokenSummary>;
  getLeaderboard(opts?: { limit?: number }): Promise<LeaderboardEntry[]>;
  getBounties(status?: BountyStatus): Promise<Bounty[]>;
  getBounty(id: ID): Promise<Bounty>;
  getProgress(): Promise<ProgressOverview>;
  getNetwork(): Promise<NetworkSnapshot>;
  subscribeNetwork(cb: (snap: NetworkSnapshot) => void): () => void; // returns unsubscribe
  getSessions(userId: ID): Promise<Session[]>;
  startSession(userId: ID, input: NewSessionInput): Promise<Session>;
}

import { mockApi } from "./mock";
import { httpApi } from "./http";
export const api: Api = config.useMock ? mockApi : httpApi;
```

```ts
// src/lib/config.ts
export const config = {
  brand: { name: "SAGI", tagline: "A distributed, open search for AGI" },
  useMock: true,                       // flip to false when the engine is live
  apiBaseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8080",
  features: { realtimeNetwork: true, sessions: true },
};
```

**Realtime (mock):** `subscribeNetwork` runs a `setInterval` that mutates node count / compute / status and emits a new `NetworkSnapshot` every ~2s; returns a cleanup that clears it. **Real:** swap the body for a WebSocket/SSE against `apiBaseUrl` — same signature, no component changes.

**`http.ts`** is a stub now (each method `throw new Error("engine not wired")` or a `fetch` skeleton) so the interface compiles; the co-founder fills it in against the engine's REST/WS endpoints.

---

## 9. The 8 dashboard elements

Each = a **widget** (compact card on `DashboardPage`) + a **full page**. For each: data source, key UI, customise point, colorblind note.

**1. Profile** — `features/profile`, `/profile`
- Data: `api.getProfile`. UI: seeded `Avatar` (from `avatarSeed`), username (mono), join date, rank, status dot+label. Page adds editable display name (local for now) + totals strip.
- Customise: avatar generator swappable; fields driven by `Profile` type.

**2. Total tokens earned** — `features/tokens`, `/tokens`
- Data: `api.getTokens`. Widget: big `Stat` (total, mono) + `Sparkline` of `history` + `Delta` (earned24h). Page: `byReason` breakdown (teal earned / orange burned-staked, each with sign+icon) + `ledger` table.
- Colorblind: every amount shows `+`/`−` and a reason icon; never colour alone.

**3. Leaderboard** — `features/leaderboard`, `/leaderboard`
- Data: `api.getLeaderboard`. UI: ranked `Table` (rank, user, tokens, compute, Δ). Widget = top 5; page = full + sort. Current user row: left teal bar + bold + `you` tag.
- Customise: column set + sort comparators are props.

**4. Current bounties** — `features/bounties`, `/bounties` (tab: Current)
- Data: `api.getBounties("open"|"active")`. UI: bounty cards — sponsor (+ `SponsorType` tag), reward (mono), `StatusChip`, `ProgressBar`, CTA **"Start session"** → `/session?bounty=:id`.
- Customise: card is one component reused by history.

**5. Historic bounties** — same folder, `/bounties` (tab: History)
- Data: `api.getBounties("closed")`. UI: same card, shows winner + `finalMetric` + closed date; muted styling.

**6. Progress to AGI** — `features/progress`, `/progress`
- Data: `api.getProgress`. UI: hero **overall progress** (big % + labelled `ProgressBar`), `headline`, **milestone stepper** (reached vs upcoming via check/○ + date, not colour), and `MetricChart`s over `metrics` (mirror website metrics: algorithms evolved, best generalization score, total compute, contributors).
- Customise: `metrics[]` is data-driven — add a series and a chart renders.

**7. Realtime network overview** — `features/network`, `/network`
- Data: `api.getNetwork` + `api.subscribeNetwork`. UI: aggregate `Stat`s (active contributors, total compute, running sessions, tokens emitted 24h) + live `Table` of nodes (user, device, compute mono, status chip). Optional small live "pulse" bars.
- Customise: poll/stream cadence in the mock generator; row component reused.

**8. Start new session** — `features/session`, `/session`
- Data: `api.startSession`, `api.getSessions`. UI: form (active voice) — pick bounty (or "Open exploration"), compute amount (slider), duration → **"Start session"**; then a running `Session` card with live `ProgressBar` (mock advances `progress`, then `status: completed` and credits `tokensEarned`). List of past sessions below.
- This is the interactive centrepiece; keep the simulator in `mock/generators.ts` so it's easy to tune.

---

## 10. Shared UI primitives (build these first)

`Button`, `Card`, `Stat` (label + value + optional `Delta` + icon), `StatusChip` (colour+icon+text), `Delta` (arrow+sign+value), `Table<T>` (typed, optional sort), `ProgressBar` (labelled), `Sparkline`, `MetricChart` (recharts wrapper with end-labels), `Avatar` (seeded), `Tag`, `PageHeader` (eyebrow + title), `EmptyState` (invites an action), `Skeleton`. All consume tokens; all colorblind-safe by construction.

---

## 11. Build order — phased task list for Claude Code

Build the **contracts and primitives before features**; keep each task small and file-scoped.

- **Phase 0 — scaffold.** Vite + React + TS; install packages; add `tokens.css` + `globals.css`; wire fonts; `config.ts`; `App.tsx` with `AuthProvider` + router; `ProtectedRoute`; `LoginPage`. *Done when:* login stores a username and lands on an empty dashboard.
- **Phase 1 — design system + primitives.** Build every `components/ui` primitive against the tokens, plus `AppShell` + `SideNav` + `TopBar` (username, logout). *Done when:* a primitives sandbox page renders all components on-brand.
- **Phase 2 — types + mock api.** `types.ts`, then `mock/data.ts`, `mock/generators.ts` (incl. the network simulator), `mock/index.ts`, `api.ts`, `http.ts` stub, `useAsync.ts`. *Done when:* `api.*` returns data and `subscribeNetwork` emits.
- **Phase 3 — dashboard shell.** `DashboardPage` = responsive grid of 8 placeholder widgets, each wired to its `api` call with loading/empty states and a "View all →" link.
- **Phase 4 — features, one at a time.** In order: profile → tokens → leaderboard → bounties (+ detail + history tabs) → progress → network → session. Each: build the full page, then the compact widget reusing the same components.
- **Phase 5 — polish.** Loading skeletons, empty/error states (interface voice), responsive to mobile, keyboard focus, `prefers-reduced-motion`, a colorblind pass (audit every status/delta/chart for a non-colour signal).
- **Phase 6 — engine swap.** Co-founder implements `httpApi` (REST + WS) against the same `Api`; flip `config.useMock = false`. No component changes.

**How to prompt Claude Code:** give it this file as context; tell it the **current phase** and the **specific files** to create; have it treat `types.ts` as the immovable contract; build primitives before the features that use them; one feature folder per task. Keep tasks to a few files so diffs stay reviewable.

---

## 12. Customisation levers (so it's easy to improve)

- **Design:** change palette/fonts/scale in `tokens.css` only — everything inherits.
- **Brand/flags/endpoint:** `config.ts` (name, tagline, `useMock`, `apiBaseUrl`, feature toggles).
- **Contract:** `types.ts` — add a field, TypeScript shows every place to update.
- **Data shape/volume:** `mock/` generators — tune counts, ranges, cadence.
- **Add/remove a dashboard element:** drop a folder in `features/` + a page + a widget on the grid; nothing else is coupled.
- **Backend:** implement `httpApi`; flip one flag.

---

## 13. Quick-start commands

```bash
npm create vite@latest sagi-frontend -- --template react-ts
cd sagi-frontend
npm i react-router-dom geist lucide-react recharts
npm i -D tailwindcss @tailwindcss/vite      # optional but recommended
# then add tokens.css, wire Tailwind v4 @theme (or use CSS Modules), and follow Phase 0
npm run dev
```
