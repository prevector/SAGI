# PLAN.md — SAGI Frontend Prototype (Phase B)

Concrete build plan, adapted from `SAGI-frontend-build-plan.md` + `DESIGN.md` to the **real repo** (see `RESEARCH.md`). **Awaiting approval before Phase C (implementation).**

## Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| D1 | Web app | **Rebuild `apps/web` in place** as Vite + React 18 + TS + react-router-dom v6. Keep `@sagi/web` workspace, Vite proxy, `BASE_PATH`/`/sagi` support. Replace vanilla `src/`. |
| D2 | Auth | **Reuse existing server cookie auth** (`/api/session`, `/api/auth/login`, `/api/auth/logout`). `AuthContext` wraps these; dev-mode auto-auth still works. No `localStorage` auth. |
| D3 | Styling | **CSS Modules + `tokens.css`** (no Tailwind). `tokens.css` hex values straight from `DESIGN.md`. |
| D4 | Legacy types | Leave `DashboardSnapshot`/`OrganismCard`/`ActivityEvent` + `GET /api/dashboard` **untouched** (don't modify engine behaviour); React app doesn't call them. |
| D5 | Charts | **recharts**, wrapped colorblind-safe. |
| D6 | Lint | None added; gate is `tsc --noEmit` + `vite build`. |

## Placement & shared types

- **App:** `apps/web` (rebuilt). React entry `src/main.tsx` + `index.html` script swap to `main.tsx`.
- **Shared domain types:** **`packages/shared/src/`** is the single source of truth for both engine and web. Add the build-plan §7 domain model here so there is **no duplication**. Web imports via the existing `@sagi/shared` alias.
  - New file **`packages/shared/src/domain.ts`** — all §7 types (`User`, `Profile`, `TokenSummary`/`TokenEntry`/`TokenReason`, `LeaderboardEntry`, `Bounty`/`BountyStatus`/`SponsorType`, `ProgressOverview`/`Milestone`/`MetricSeries`, `NetworkSnapshot`/`NetworkStats`/`NetworkNode`, `Session`/`SessionStatus`/`NewSessionInput`, `TimeseriesPoint`, `ID`, `ISODate`).
  - **Name clash handling:** the engine's existing `Bounty` and `LeaderboardEntry` (string-shaped) stay in `index.ts` for the legacy dashboard. The new domain model lives in `domain.ts` and is **re-exported from `index.ts` under a namespace** to avoid collisions: `export * as Domain from "./domain.js"`. Web imports `import { Domain } from "@sagi/shared"` and uses `Domain.Profile`, etc. *(Alternative if cleaner during build: rename legacy `Bounty`→`LegacyBounty` etc. in `index.ts` and flat-export domain — decide at implementation, default to the namespace to keep the engine 100% untouched.)*
  - `SessionInfo` (auth) is reused as-is from `index.ts`.
- **No engine behaviour change.** `apps/api` is not modified in this build (its existing auth endpoints are consumed as-is). `packages/shared` only gains additive exports.

## API integration

- **`apps/web/src/lib/api.ts`** defines the `Api` interface (build plan §8) over `Domain.*` types. Components only ever import `api`.
- **`mockApi`** (`src/lib/mock/`) implements every method now, including `subscribeNetwork` via `setInterval` (~2s) emitting mutated `NetworkSnapshot`s.
- **`httpApi`** (`src/lib/http.ts`) is a **typed stub** (`throw new Error("engine not wired")` bodies / fetch skeletons) so the interface compiles. Documented mapping for later:
  | `Api` method | Engine route (future) |
  |---|---|
  | `getProfile` | `GET /api/profile/:id` *(not built yet)* |
  | `getTokens` | `GET /api/tokens/:id` *(not built)* |
  | `getLeaderboard` | `GET /api/leaderboard` *(not built)* |
  | `getBounties` / `getBounty` | `GET /api/bounties?status=` / `GET /api/bounties/:id` *(engine has only `/api/dashboard` today)* |
  | `getProgress` | `GET /api/progress` *(not built)* |
  | `getNetwork` / `subscribeNetwork` | `GET /api/network` / WS or SSE *(no realtime channel exists yet)* |
  | `getSessions` / `startSession` | `GET /api/sessions/:id` / `POST /api/sessions` *(not built)* |
  - Auth is **separate** from `Api`: handled by `AuthContext` against the existing `/api/session`, `/api/auth/login`, `/api/auth/logout` (relative paths, cookie-based).
- **`config.ts`**: `{ brand, useMock: true, apiBaseUrl: import.meta.env.VITE_API_URL ?? "" (same-origin/relative), features }`. `useMock` stays `true` for the prototype.

## Dependencies to add (to `apps/web`)

Runtime: `react`, `react-dom`, `react-router-dom`, `geist` (self-hosted fonts), `lucide-react`, `recharts`.
Dev: `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`. (`vite`, `typescript` already present.)
No Tailwind, no state/data-fetching libs (a tiny `useAsync` hook covers loading/error/data). `geist` replaces the Google-Fonts Space Grotesk/IBM Plex Mono import.

## Styling wiring

- `src/styles/tokens.css` — exact `DESIGN.md` palette + the build-plan §3 semantic/dashboard tokens (hex identical to `DESIGN.md`: `#041414`, `#0B1E1E`, `#17C4C4`, `#159999`, `#F0783D`, `#C85E2A`, paper `#FAF8F0`, etc.).
- `src/styles/globals.css` — reset + base element styles + `prefers-reduced-motion` defaults; maps `--font-sans`/`--font-mono` to Geist via the `geist` package.
- Per-component **CSS Modules** consume the vars. **No hardcoded hex** anywhere.

## File-by-file task list (per phase, each ends green: `tsc --noEmit` + `vite build`)

### Phase 0 — scaffold
- `packages/shared/src/domain.ts` (+ re-export in `index.ts`); confirm engine still builds.
- `apps/web/package.json` (add React deps + scripts), `vite.config.ts` (add `@vitejs/plugin-react`, keep proxy + `base`), `tsconfig.json` (jsx, keep `@sagi/shared` ref), `index.html` → `main.tsx`.
- `src/main.tsx`, `src/App.tsx` (providers + router with `basename` from `BASE_PATH`), `src/routes.tsx`.
- `src/styles/tokens.css`, `src/styles/globals.css`; wire Geist fonts.
- `src/lib/config.ts`.
- `src/auth/AuthContext.tsx` (wraps `/api/session` + `/api/auth/*`), `src/auth/ProtectedRoute.tsx`, `src/pages/LoginPage.tsx`.
- **Gate:** login (or dev auto-auth) lands on an empty dashboard; build clean.

### Phase 1 — design system + primitives + shell
- `src/components/ui/`: `Button`, `Card`, `Stat`, `StatusChip` (colour+icon+text), `Delta` (arrow+sign), `Table<T>`, `ProgressBar` (labelled), `Sparkline`, `MetricChart` (recharts, end-labels), `Avatar` (seeded), `Tag`, `PageHeader`, `EmptyState`, `Skeleton`.
- `src/components/layout/`: `AppShell`, `SideNav`, `TopBar` (username + logout).
- Optional `src/pages/SandboxPage.tsx` (dev-only) to eyeball every primitive on-brand.
- **Gate:** primitives render on-brand against tokens.

### Phase 2 — types + mock api
- `src/lib/format.ts` (token/number/compute/date formatters), `src/lib/useAsync.ts`.
- `src/lib/mock/data.ts` (seed), `src/lib/mock/generators.ts` (builders + network simulator), `src/lib/mock/index.ts` (`mockApi`).
- `src/lib/api.ts` (`Api` + active export), `src/lib/http.ts` (typed stub).
- **Gate:** `api.*` returns data; `subscribeNetwork` emits.

### Phase 3 — dashboard shell
- `src/pages/DashboardPage.tsx` — responsive grid of 8 placeholder widgets, each wired to its `api` call with loading/empty states + "View all →".
- **Gate:** grid renders with mock data + states.

### Phase 4 — features (one folder per commit), each = full page then compact widget
Order: **profile → tokens → leaderboard → bounties (+ `BountyDetailPage`, Current/History tabs) → progress → network → session.**
- `src/features/<name>/` (widget + helpers) + matching `src/pages/<Name>Page.tsx`.
- `src/pages/NotFoundPage.tsx`.
- **Gate per feature:** page + widget render from `api`; colorblind signals present.

### Phase 5 — polish
- Skeletons, empty/error states in interface voice, mobile responsive, visible keyboard focus (2px teal ring), `prefers-reduced-motion`, colorblind audit (every status/delta/chart has a non-colour signal).

## Verification gate (Phase D, before PR)
- `npm install` clean; `npm run build` builds **shared → api → web** green; `tsc --noEmit` clean across workspace; **engine still builds and runs unchanged**.
- Smoke: dev `npm run dev` → dashboard renders all 8 widgets → every page loads → network list ticks live → start-session completes and credits tokens. Verify under `BASE_PATH=/sagi` too.
- a11y/colorblind + responsive passes.

## Branch, commits, PR
- **Branch:** `feat/frontend-prototype` (never commit to `main`).
- **Commits:** small + green, `feat(web): ...` / `feat(shared): ...` convention; one feature folder per commit.
- **PR:** `feat/frontend-prototype` → `main` with summary (shared-types via `@sagi/shared`, mock-first `Api`, reused cookie auth), screenshots of login + dashboard + 8 pages, ticked Phase D checklist, and the `httpApi` route-mapping note. Squash-merge when green; delete branch.

## What this plan does NOT do
No commits to `main`; no duplicated domain types (all in `@sagi/shared`); no engine behaviour changes; no hardcoded colours/fonts; no state/data-fetching libs; no Tailwind; no monorepo tooling beyond npm workspaces.
