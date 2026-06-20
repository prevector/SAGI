# RESEARCH.md — SAGI Foundation (Phase A)

Read-only investigation of the existing monorepo, mapped against `DESIGN.md` and `SAGI-frontend-build-plan.md`. No code was changed in this phase. Decisions for the user are at the end — **stop and approve before Phase B.**

---

## 1. Repo & tooling

| Item | Finding |
|---|---|
| Package manager | **npm** with **workspaces** (`apps/*`, `packages/*`). `package-lock.json` present; `node_modules` **not yet installed** (`npm ls` is empty) — run `npm install` before building. |
| Node | `v24.16.0` locally; README/service target Node 22+. No `.nvmrc`. |
| Language | **100% TypeScript, ESM** (`"type": "module"` in every package). |
| TS config | Root `tsconfig.base.json` → `strict: true`, `target ES2022`, `module ESNext`, `moduleResolution: Bundler`, `noEmitOnError`. Path alias **`@sagi/shared` → `packages/shared/src/index.ts`**. Root `tsconfig.json` is a project-references solution (`shared`, `api`, `web`); `shared`/`api` are `composite`. |
| Lint / format | **None configured** (no eslint/prettier/biome). Typecheck via `tsc` is the only gate today. |
| CI | **None** (no `.github/`, no workflows). |
| Root scripts | `build` (shared → api → web, in order), `dev` (`npm-run-all` parallel `dev:api` + `dev:web`), `start` (prod Node server), `release` (`scripts/release.sh`). |

## 2. Layout

```
SAGI/
  apps/api/        @sagi/api   — Express 5 server (auth + dashboard + static web)
  apps/web/        @sagi/web   — Vite + VANILLA TypeScript SPA (no framework)
  packages/shared/ @sagi/shared — shared types + seeded mock dashboard data
  deploy/          Caddyfile + systemd unit examples
  scripts/         release.sh (rsync + ssh build/restart)
  site/            Framer marketing-site docs (INSTRUCTIONS.md, STRUCTURE.md)
  DESIGN.md, SAGI-frontend-build-plan.md, README.md
```

There **is already a web app** (`apps/web`), but it is **vanilla TS** that builds its DOM with template strings in `src/main.ts` — not React, no router, no component library. It is effectively a placeholder dashboard.

## 3. Engine (backend) — `apps/api`

- **Framework:** **Express 5** (ESM, `tsx watch` in dev, `tsc` build to `dist/`). `cors` is a dependency but is **not imported/used** in `server.ts`.
- **Data exposure:** plain **REST/JSON**. No tRPC, GraphQL, WebSocket, or SSE. **No realtime channel exists.**
- **Endpoints:**
  | Method | Route | Behaviour |
  |---|---|---|
  | GET | `/health` | `{ ok, mode }` |
  | GET | `/api/session` | `SessionInfo` (auth state + username) |
  | POST | `/api/auth/login` | dev: returns session; prod: sets signed cookie from `{username}` |
  | POST | `/api/auth/logout` | clears cookie, `204` |
  | GET | `/api/dashboard` | `DashboardSnapshot` (401 if unauth) |
  - In prod (`!devMode`) Express also serves `apps/web/dist` statically with an SPA fallback to `index.html`.
- **Domain types/models** live in **`packages/shared/src/index.ts`** — this is the single shared-types home today. ⚠️ See §6: the current types are *presentational* (formatted strings), not the structured domain model the build plan needs.
- **Auth/session (already built):** username-only. `getAppEnv()` reads env; **dev mode auto-bypasses auth** (`devMode = NODE_ENV !== "production"`), returning user "Local developer". Prod sets an **HTTP-only, SameSite=lax, HMAC-signed cookie** (`sagi_session`, 7-day), `secure` in prod. Helpers: `getAuthenticatedUsername`, `isAuthenticated`, `getSessionInfo`, `set/clearSessionCookie`. This is identity-only, not real security (README says so).
- **Run locally:** `npm run dev` → API on **:4000**, web on **:5173** (Vite proxies `/api` + `/health` → :4000). Dev mode ⇒ no login needed. Env: `PORT`, `SESSION_SECRET`, `SECURE_COOKIES`, `DEV_MODE`, `NODE_ENV`, plus `BASE_PATH` for the web build. No DB, no migrations, no seed step (data is hardcoded in `shared`).
- **Sub-path hosting:** recent commit "Support hosting SAGI under `/sagi`". Vite `base` is `process.env.BASE_PATH ?? "/"`, and the vanilla web uses **relative** fetch paths (`api/session`, not `/api/session`) so it works mounted under a sub-path. **Any React rebuild must preserve relative API paths + honour `BASE_PATH`** (and configure the router `basename`).

## 4. Design

- `DESIGN.md` is present and authoritative: palette (near-black `#041414`, `bg/dark-raised #0B1E1E`, teal `#17C4C4`, orange `#F0783D`), **Geist + Geist Mono**, the **colorblind rule** (colour never the only signal), pill buttons, 16px card radius, no shadows/gradients, `prefers-reduced-motion`.
- ⚠️ **The current `apps/web` is OFF-BRAND vs `DESIGN.md`.** `styles.css` loads **Space Grotesk + IBM Plex Mono** from Google Fonts and uses `#061818`/`#17c4c4` surfaces — wrong fonts and slightly wrong palette. The React rebuild must replace these with `tokens.css` derived from `DESIGN.md` and self-hosted Geist.
- Geist is **not** in the repo yet. Build plan recommends the `geist` npm package (self-hosted); plan §3 maps it to `--font-sans` / `--font-mono`.

## 5. Build-plan vs repo reconciliation (where they disagree, repo wins on tooling)

| Build-plan assumption | Repo reality | Resolution |
|---|---|---|
| Fresh `npm create vite react-ts` app | `apps/web` already exists as **vanilla TS** in an npm workspace | Rebuild **in place**: replace `apps/web/src` contents with the React SPA, keep workspace name `@sagi/web`. |
| `localStorage` username auth (§6) | Server **signed-cookie** auth already wired (`/api/session`, `/api/auth/*`), dev bypass | **Decision D2** below. |
| App owns all domain types in `src/lib/types.ts` | Types belong in `@sagi/shared` (the contract for both sides) | Put the new domain model in **`packages/shared`**; web imports via `@sagi/shared`. |
| Tailwind v4 *or* CSS Modules | Repo uses plain CSS, no Tailwind, "minimal deps" ethos | **Decision D3** below. |
| `apiBaseUrl` absolute URL + CORS | Same-origin, relative paths, Vite proxy, sub-path mount | Keep **relative paths**; no CORS needed; honour `BASE_PATH`/router basename. |

## 6. Type-mapping table (build plan §7 → engine `@sagi/shared`)

The engine's existing types are **display strings** for the current vanilla dashboard; the build plan's are a **structured numeric domain model**. They overlap in *name* in two cases (`Bounty`, `LeaderboardEntry`) but **not in shape**. Net: essentially everything is **mock-only / new**, added to `@sagi/shared`.

| Frontend type (plan §7) | Engine type today | Reuse? |
|---|---|---|
| `User`, `Profile` | — (only `SessionInfo.user.name`) | **New (mock)** |
| `TokenSummary`, `TokenEntry`, `TokenReason`, `TimeseriesPoint` | — | **New (mock)** |
| `LeaderboardEntry` (numeric: rank/userId/tokens/compute/Δ) | `LeaderboardEntry` (strings: rank/organism/transferScore/status/reward) | **New** — name clash, different shape; do not reuse as-is |
| `Bounty`, `BountyStatus`, `SponsorType` | `Bounty` (`reward: string`, `status: "verified"\|"pending"`, `focus`) | **New** — different shape & enum |
| `ProgressOverview`, `Milestone`, `MetricSeries` | loosely `PopulationStat`, `NetworkMetric` | **New (mock)** |
| `NetworkSnapshot`, `NetworkStats`, `NetworkNode` | `NetworkMetric` (label/value/detail strings — not nodes) | **New (mock)** |
| `Session`, `SessionStatus`, `NewSessionInput` | — (`SessionInfo` is *auth* session, unrelated) | **New (mock)** |
| — | `OrganismCard`, `ActivityEvent`, `DashboardSnapshot` | Engine-only; used by current vanilla web + `/api/dashboard`. **Decision D4.** |
| `SessionInfo` (auth) | `SessionInfo` ✅ | **Reuse** if we keep server auth (D2) |

## 7. Open questions / decisions (approve before Phase B)

- **D1 — Rebuild `apps/web` in place as React?** Recommended: replace the vanilla `src/` with Vite + React + TS + react-router, keeping the `@sagi/web` workspace, the Vite proxy, and `BASE_PATH` support. *(Confirms the build plan adapted to the repo.)*
- **D2 — Auth: reuse the existing server cookie auth, or the plan's `localStorage`?** Recommended: **reuse the existing `/api/session` + `/api/auth/*`** (it's already built, supports prod + dev-bypass + `/sagi` mount). `AuthContext` would wrap those endpoints instead of `localStorage`. This deviates from plan §6 but the repo already solved it better. (Pure-mock standalone still works because dev mode auto-authenticates.)
- **D3 — Styling: CSS Modules + `tokens.css`, or Tailwind v4 + `@theme`?** Recommended: **CSS Modules + `tokens.css`** — zero extra build deps, matches the repo's minimal-deps ethos and the existing plain-CSS approach, full control for the colorblind rule. `tokens.css` hex values come straight from `DESIGN.md`.
- **D4 — The existing `DashboardSnapshot` types + `/api/dashboard`?** Recommended: **leave them untouched** (don't modify engine behaviour) but mark them legacy; the new React app uses `mockApi` against the new domain model and does not call `/api/dashboard`. Revisit/remove only when `httpApi` is wired.
- **D5 — Charts: `recharts` vs hand-rolled SVG?** Recommended: **recharts** (plan's recommended) with colorblind-safe wrappers (line styles + markers + end-of-line labels). Hand-rolled SVG is the zero-dep alternative if you want to avoid the dependency.
- **D6 — Add lint?** None exists. Recommended: **out of scope for the prototype** (keep `tsc --noEmit` as the gate) unless you want a minimal eslint added.

**Confirmations baked in (no decision needed):** new domain types live in `@sagi/shared`; self-host Geist via the `geist` package replacing Space Grotesk/IBM Plex Mono; keep relative API paths + Vite proxy; mock-first with `config.useMock` and a typed `httpApi` stub mapping to the engine later.
