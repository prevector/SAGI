# RESEARCH-LEDGER.md — Phase A findings (read-only)

Research for the SAGI token economy (see `SAGI-token-economy-approach-v2.md` for *what*, this doc for *where it plugs in*). Read-only pass — no code was changed. Output: findings + integration map + open questions. **Phase B (`PLAN-LEDGER.md`) does not start until the open questions below are resolved.**

---

## 0. TL;DR for the planner

- **The repo is greenfield for a ledger.** There is **no database, no ORM, no realtime transport, and no server-side compute engine** today. `apps/api` is a stateless Express server (signed-cookie auth + one static JSON dashboard). That's good news: nothing to refactor around, but also means the "real work-receipts from the engine" source has **no real producer yet** — sessions are mocked, and the only real compute (the GA) runs **in the browser**.
- **The "engine" in the plan = two things:** (a) `apps/api` (the only server — this is where the **ledger service + DB + SSE** must live), and (b) the **session GA** (`apps/web/.../session/visual/learning/`, a pure headless `GaTrainer`) which is the real *usefulness* + *breakthrough* source but currently runs client-side.
- **Money is `number` everywhere in the existing frontend domain** (`TokenSummary.total`, `LeaderboardEntry.tokens`, `Session.tokensEarned`, `NetworkStats.tokensEmitted24h`). The ledger must be `BigInt` base units internally and at the DB/API boundary; the wire format and the frontend display path need an explicit decision (JSON can't carry `BigInt`). See **OQ-3**.
- **The frontend seams are clean and ready.** `Api` interface + `config.useMock` swap + `subscribeNetwork(cb)` realtime seam already exist. We feed the ledger through these without touching components. The only genuinely new surface is the **mini chain explorer**.
- **Key dependencies are all absent** (`better-sqlite3`, `drizzle-orm`, `@noble/*`, `@faker-js/faker`, `ws`) — only `seedrandom` is present (used by the web GA). All ledger deps are net-new installs.

---

## 1. Monorepo structure & build wiring

**npm workspaces** (`package.json`): `apps/*` + `packages/*`. Not pnpm/lerna.

```
apps/
  api/    @sagi/api  — Express 5 server (Node, ESM). Stateless. (server.ts, auth.ts, env.ts)
  web/    @sagi/web  — Vite 7 + React 19 SPA. Contains the session GA.
packages/
  shared/ @sagi/shared — domain types + a static dashboard seed. Browser- & node-safe.
experiments/  enu_iaf_benchmark.ts (standalone tsx script; unrelated to sessions)
deploy/       systemd + Caddy examples
scripts/      release.sh
```

**TypeScript layout (project references + path alias):**
- `tsconfig.base.json`: `module: ESNext`, `moduleResolution: Bundler`, `strict`, `target ES2022`, and **`paths: { "@sagi/shared": ["packages/shared/src/index.ts"] }`** (dev resolves to source).
- Root `tsconfig.json` references `packages/shared` + `apps/api` (web is built separately by Vite with `tsc --noEmit`).
- `packages/shared` is `composite: true`, emits `dist/` with `declaration`. At runtime the built `apps/api` imports `@sagi/shared` → `dist/index.js` (per its `package.json` `main`/`exports`). In dev, `tsx`/Vite use the path alias to source.
- Build order (`npm run build`): `@sagi/shared` → `@sagi/api` → `@sagi/web`. Dev: `npm-run-all --parallel` → `dev:api` (`tsx watch src/server.ts`) + `dev:web` (`vite`).

**Implication for `packages/ledger`:** mirror `packages/shared` exactly — `composite`, `dist/`, declarations, add to root `tsconfig.json` references, add `@sagi/ledger` to `tsconfig.base.json` paths, and add it as a dep + tsconfig reference in any consumer. **Critical constraint:** `packages/ledger` is imported by **both** `apps/web` (browser) and `apps/api` (node). Therefore its public entry **must stay isomorphic** — money, types, the pure calculator, hashing/signing (`@noble/*` is isomorphic ✓). Anything node-only (**`better-sqlite3`/Drizzle**, the SSE loop) lives in `apps/api`, **not** in the browser-reachable part of `packages/ledger`. `@faker-js/faker` is heavy and node-side-only in practice — keep the fixtures generator out of the web bundle (own subpath export `@sagi/ledger/fixtures`, or place it in `apps/api`). See **OQ-5**.

---

## 2. Work + usefulness + breakthrough sources (the session GA)

The GA is a **pure, headless, deterministic** `GaTrainer` class. (Detailed map confirmed by sub-agent.)

| Signal | Where | Shape |
|---|---|---|
| **Pure GA core** | `apps/web/src/features/session/visual/learning/trainer.ts` — `GaTrainer` | `new GaTrainer({cols,rows})`, `reset(seed)`, `step()`, `stats()`, `championPath()`. No React/DOM. Runs synchronously; same seed ⇒ same evolution. |
| **Usefulness / fitness** | `learning/fitness.ts` `fitnessOf()` | scalar; unsolved `[0,~100]` (progress to exit), solved `[200,300]` (+solved bonus +speed bonus). This is the on-thesis "usefulness" lever. |
| **Per-generation stats** | `learning/types.ts` `TrainerStats` | `{ generation, bestFitness, bestSteps, solved }` |
| **Breakthrough / success** | `TrainerStats.solved: boolean` (champion reached maze exit, `maze/sensors.ts atExit()`) | exact-cell match, no step threshold today. A bounty "threshold" (e.g. solved under N steps) can read `bestSteps`. |
| **Snapshot (per tick)** | `learning/snapshot.ts` `CellPathSnapshot extends TrainerStats` | adds `path`, `attempts`. Extendable with `computeUnits`. |
| **React boundary** | `learning/useGaRun.ts` (throttles `step()` to ~420ms/gen, lifts snapshots to state) | the hook owns the trainer; the trainer is React-unaware. |
| **Local/remote seam** | `learning/types.ts` `TrainingSource = {kind:"local",trainer} \| {kind:"remote",subscribe(seed,cb)}` | **`remoteSource.ts` is a typed stub that emits nothing** ("engine telemetry not wired yet"). `TrainingUpdate extends TrainerStats { bestGenome?: unknown }`. |

**Compute amount** comes from the `Session` record, not the GA: `Session.computeAllocated` (GFLOPS, 100–2000) + `durationMin` (5–120). A natural `computeUnits = computeAllocated × durationMin` normalization (per v2 §5). Alternatively derive from GA effort (population × rollout steps) — see **OQ-2**.

**The decisive finding:** the GA runs **in the browser**, and **sessions are fully mocked** (`apps/web/src/lib/mock/generators.ts`) — `SessionVisual` only uses `session.id` as a *seed* for an independent client-side GA; there is **no link** between a "session" and a real GA run, and **no server-side compute at all**. So a *genuine* `WorkReceipt` ("the real user's session produces a real signed receipt", v2 §9.5) has no natural producer today. Resolving who runs the real GA and where the receipt is minted is **OQ-1** — the single biggest design decision.

---

## 3. The engine's data layer

**There is none.** `apps/api` is stateless:
- Auth = HMAC-signed cookie (`apps/api/src/auth.ts`, `node:crypto`), no user store.
- `/api/dashboard` returns a static seed from `@sagi/shared` (`getDashboardSnapshot()`).
- No Drizzle, no SQLite/Postgres, no migrations, no `*.db`. `node_modules` confirms `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, `@noble/*`, `@faker-js/faker`, `ws` are **all absent**.

**Implication:** add Drizzle + better-sqlite3 **fresh in `apps/api`** (greenfield, zero migration risk). DB file path goes through `env.ts`; `.gitignore` already ignores `runs/` — add the db file/dir there or to a new ignore. The ledger **service** (DB access, sources, block-sealing loop, SSE broadcast) lives in `apps/api/src/ledger/` (node-only), importing the pure core from `@sagi/ledger`.

---

## 4. Frontend integration points

**The single data contract** (`apps/web/src/lib/api.ts`): every component imports `api`; `api = config.useMock ? mockApi : httpApi`. Methods relevant to the ledger:
- `getTokens(userId) → TokenSummary` — feeds `TokensWidget`/`TokensPage`.
- `getLeaderboard({limit}) → LeaderboardEntry[]` — feeds `LeaderboardWidget`/`LeaderboardTable`.
- `getNetwork() → NetworkSnapshot` + **`subscribeNetwork(cb) → unsubscribe`** — feeds `NetworkPage`/`NetworkWidget` via `useNetwork.ts` (initial fetch + live subscription).
- `getSessions(userId)` / `startSession(userId,input)` — `SessionPage`.

**Realtime seam (the broadcast target):** `subscribeNetwork`. Mock impl = `setInterval(stepNetwork, 2000)` (`apps/web/src/lib/mock/index.ts:59`). Http impl = `notWired` stub (`apps/web/src/lib/http.ts:33`) commented "WS or SSE at `/api/network/stream`". **Plan: implement `httpApi.subscribeNetwork` with `EventSource` against a new `GET /api/network/stream` (SSE) in `apps/api`.** No component changes — `useNetwork` already drives it.

**`userId` is the username.** `SessionPage` sets `userId = username`; mock keys all per-user data by username; there are no separate numeric user IDs.

**Where the chain explorer slots in:**
- New nav item in `apps/web/src/components/layout/navItems.ts` (lucide icon, e.g. `Boxes`/`Blocks`) + route in `routes.tsx` + page in `pages/`. Reuse `Table`, `Card`, `Stat`, `StatusChip`, `Tag`, `mono` from `components/ui`.
- And/or extend `NetworkPage.tsx` with a "recent blocks / txs" panel — it already renders `snap.stats` cards + a node `Table`, and consumes the live `useNetwork` stream, so ledger stats (height, supply, emission, latest hash) and recent blocks ride the same SSE update.

**Domain-type reconciliation (important):** the existing frontend `NetworkStats` (`packages/shared/src/domain.ts:126`) is `{ activeContributors, totalCompute, runningSessions, tokensEmitted24h }` — **different** from v2's ledger `NetworkStats` (`supplyTotal, supplyCirculating, emissionThisEpoch, epoch, height, latestHash, …`). Plan must **extend, not replace** — the SSE payload should carry both the existing live-network fields and the new ledger fields, so current widgets keep working while the explorer gets supply/height/hash. Same for `TokenSummary`/`LeaderboardEntry` (numbers today).

---

## 5. Auth / identity → where keypairs attach

- Username-only login, HMAC-signed cookie (`apps/api/src/auth.ts`). In dev (`DEV_MODE`/non-production) the server **auto-authenticates** as `"Local developer"` — login isn't required locally.
- `apps/web/src/auth/AuthContext.tsx`: `/api/session`, `/api/auth/login`, `/api/auth/logout`; exposes `username`. Mock mode mirrors the name into `setCurrentUser` for "you" highlighting.
- **No user record exists** beyond the cookie string. So the natural home for the **auto-generated custodial keypair + address** is the new `wallets` table (`address` PK, `username`), created/looked-up **on first authenticated ledger interaction** (or at `setSessionCookie` in `server.ts` login). Custodial: store the private key server-side for demo (v2 §4.3: "auto-generated keypair on first login — no seed phrases"). Where exactly the priv key lives (a column on `wallets`? a separate `keys` table? never persisted and re-derived?) is **OQ-4**.

---

## 6. Config & shared types

- **Server config:** `apps/api/src/env.ts` → `AppEnv` from `process.env` (`PORT`, `SESSION_SECRET`, `SECURE_COOKIES`, `NODE_ENV`/`DEV_MODE`). `.env.example` exists. **Add `LEDGER_MODE` (`demo|sandbox|production`), `LEDGER_SEED`, emission params, db path** here.
- **Frontend config:** `apps/web/src/lib/config.ts` — static object: `useMock`, `apiBaseUrl`, `features.{realtimeNetwork,sessions,session3dVisual}`. **Add `features.ledgerExplorer`** (and the explorer respects `realtimeNetwork` for the live stream).
- **Shared types:** `packages/shared/src/domain.ts` (the structured domain, exported as namespace `Domain` from `index.ts`) + legacy presentational types in `index.ts`. **New ledger types (money, `Transaction`, `Block`, `WorkReceipt`, `WalletState`, ledger `NetworkStats`, `LedgerMode`) go in `packages/ledger`**, not `shared`, since the v2 contract is the ledger's own. The frontend's display domain stays in `shared`; the SSE/HTTP DTOs map ledger→display at the `apps/api` boundary.

---

## 7. Realtime transport

**None today.** Mock fakes it with `setInterval`. `apps/api` is plain Express 5 with `express.json()` — no streaming endpoints, no `ws`. Plan: **SSE** via a new `GET /api/network/stream` writing `text/event-stream` (set `Content-Type`, `Cache-Control: no-cache`, `Connection: keep-alive`, flush headers, push on each sealed block; clean up on `req.on("close")`). `EventSource` auto-reconnects. `ws` only if the demo control panel needs a back-channel (v2 §9.4) — defer per the plan.

---

## 8. Integration map (where each piece lands)

| Concern | Lands in | Notes |
|---|---|---|
| Money, ledger types, pure calculator, hashing/signing | **`packages/ledger`** (isomorphic) | imported by web + api; `@noble/*` ok in browser |
| Fixtures generator (`buildGenesis`, faker) | `packages/ledger/fixtures` subpath **or** `apps/api` (node-only) | keep faker out of the web bundle (**OQ-5**) |
| DB schema + migrations (Drizzle/better-sqlite3) | **`apps/api/src/ledger/db/`** | greenfield; db file under an ignored dir |
| Ledger service (sources, validate, seal loop, read model) | **`apps/api/src/ledger/`** | hosts the `Ledger` interface; node-only |
| `LedgerMode` switch + demo driver + control panel | `apps/api` (driven server-side) | `ws` back-channel only if needed |
| SSE endpoint | `apps/api` `GET /api/network/stream` (+ REST: `/api/tokens/:id`, `/api/leaderboard`, `/api/network`, `/api/blocks`, `/api/tx/:id`) | implements the routes `http.ts` already expects |
| `subscribeNetwork` (SSE client) | `apps/web/src/lib/http.ts` | replace the `notWired` stub with `EventSource` |
| Wallet / Leaderboard / Network surfaces | **reuse** existing widgets/pages | feed via existing `Api` methods |
| Mini chain explorer | new page + `navItems.ts` + `routes.tsx`, and/or a `NetworkPage` panel | reuse `components/ui` primitives |
| Keypair/address per user | `wallets` table, created on first login/interaction | custodial demo wallet (**OQ-4**) |
| Config flags | `apps/api/src/env.ts` (`LEDGER_MODE`, seed, emission) + `web/src/lib/config.ts` (`features.ledgerExplorer`) | |

---

## 9. Design / colourblind constraints for new UI

`DESIGN.md` is written for the **Framer landing site** (fonts, palette as Framer styles) — the React app has its **own** token system (`apps/web/src/styles/tokens.css` + `globals.css`, `var(--accent-*)`, `var(--s4)`, `.mono`). The binding rule still applies and is **already enforced** in the app: **colour is never the only signal** — see `components/ui/Delta.tsx` (arrow icon + sign + colour) and `StatusChip`. The explorer/wallet must follow suit (status carried by icon/label/shape/mono, not colour), and reuse the existing UI primitives and CSS tokens rather than `DESIGN.md`'s Framer values.

---

## 10. Open questions — RESOLVED (2026-06-20)

**Direction set by the user: simplify. Everything runs server-side in a SQL database; keep it simple and straightforward. The blockchain layer (ed25519-signed, hash-chained blocks, merkle, `verifyChain`) is designed-for but DEFERRED behind a switch — enable it later for the real prototype/MVP.** This is consistent with the runbook's de-risking order (Phase 1 has no chain; the chain is additive). Resolutions:

- **OQ-1 → server-side, SQL, simple.** No client-attested or browser-extracted GA for now. `apps/api` owns sessions in SQL; on session completion the server runs the pure calculator and writes the reward (`transactions` + `wallets` read-model), then broadcasts over SSE. A typed seam keeps the door open for real GA fitness (via the existing `remoteSource`/client attestation) and for the chain later.
- **OQ-2 → `computeUnits = computeAllocated × durationMin`; `usefulness` default `1.0`** with a seam to feed real GA `bestFitness` later.
- **OQ-3 → decimal strings on the wire.** Ledger/DB use `BigInt` base units; SSE/HTTP serialize amounts as decimal strings; a string/bigint-aware formatter on the frontend; existing display types stay mostly `number`, converted at the seam.
- **OQ-4 → no keypairs now.** Addresses are derived deterministically from username (e.g. `sagi1<hash(username)>`); ed25519 custodial keypairs + signatures arrive with the deferred chain toggle. `transactions`/`blocks` keep nullable `sig` columns so the chain folds in without migration upheaval.
- **OQ-5 → fixtures generator is node-only in `apps/api`** (faker stays out of the web bundle). `packages/ledger` holds the isomorphic money + types + pure calculator (headless-tested per DoD); `apps/api` holds DB, service, fixtures, SSE.
- **OQ-6 → geometric decay default** `E(k)=E0·r^k`, `DECIMALS=9`; concrete `E0`/`r`/epoch-length chosen in `PLAN-LEDGER.md`.
- **OQ-7 → demo runs through the real API.** `demo` mode serves the frontend from `httpApi` against `apps/api` with a seeded faker population persisted in SQL; `mockApi` becomes dev-only. (Reusing existing `mock/data.ts` contributor names for continuity is optional polish.)

**Re-scope note:** the v2 doc and the runbook's Phase C describe building the signed hash-chained ledger *now*. Per the user's direction this is **deferred** — `PLAN-LEDGER.md` builds the SQL-backed earn loop + demo + SSE now, with the `transactions` table append-only and a `ledger.chain` seam so the block/signature layer can be switched on later without reshaping the data model.

---

## 10b. Original open questions (for the record)

- **OQ-1 — Who produces the *real* `WorkReceipt`, and where? (blocking)** The GA is client-side and sessions are mocked; there is no server-side compute. Options:
  - **(a)** Move/extract `GaTrainer` to run **headless in `apps/api`** when a session is started, producing genuine compute/usefulness/solved → mint the receipt server-side. Cleanest "real" story; requires extracting the GA out of `apps/web` (e.g. into `packages/`), a non-trivial lift.
  - **(b)** Keep the GA in the browser; on session/maze completion the **client POSTs a result** to `apps/api`, which signs/mints the receipt (server still holds the custodial key). Lighter; the "work" is client-attested (fine for a custodial prototype).
  - **(c)** `apps/api` **derives** a receipt from the `Session` record alone (`computeAllocated × durationMin`, usefulness=1) — simplest, but no real GA usefulness/breakthrough signal.
  - Recommendation to confirm: **(b)** for the earn loop now, with a typed seam toward (a). Which do you want?
- **OQ-2 — `computeUnits` normalization & `usefulness` mapping.** Use `computeAllocated × durationMin` for computeUnits? Map GA `bestFitness` → `usefulness` (e.g. normalize to ~[0.5,2.0]), or default `usefulness=1.0` until the GA is wired (OQ-1)?
- **OQ-3 — `BigInt` over the wire & in the frontend.** Confirm: ledger/DB use `BigInt` base units (DoD: no floats). The JSON boundary serializes amounts as **decimal strings**; the frontend either (a) keeps display types as `number` and converts at the seam (lossy only past 2^53 base units — `formatTokens` already compacts), or (b) migrates `TokenSummary`/`LeaderboardEntry`/etc. to `string`. Recommendation: **strings on the wire + a `bigint`/string-aware formatter**, leave display types mostly as-is. OK?
- **OQ-4 — Custodial key storage.** Private keys on a `wallets` column, a separate `keys` table, or held in memory/re-derived from a server seed? (Demo-grade; just pick one to document.)
- **OQ-5 — Fixtures generator placement.** `@sagi/ledger/fixtures` subpath (so the type is shared but faker is tree-shaken out of web) vs living entirely in `apps/api`. Either works; confirm preference.
- **OQ-6 — Emission model default.** v2 locks **geometric decay** `E(k)=E0·r^k` as default (halving as config alt). Confirm `E0`, `r`, epoch length, `DECIMALS=9` for the plan.
- **OQ-7 — Phase-1 demo population vs the existing mock.** In `demo` mode the SSE-backed real API replaces the current `mockApi` population. Should the seeded `buildGenesis` fixtures **reuse the existing `mock/data.ts` contributor names** for visual continuity, or generate a fresh faker population? (Affects whether `useMock` stays the demo path or `demo` mode runs through `httpApi` against `apps/api`.)

---

*Next: on answers to OQ-1…OQ-7, write `PLAN-LEDGER.md` (Phase B) — module placement, pinned deps, finalized contracts, Drizzle schema, `LedgerMode` machinery, SSE event schema, and a file-by-file task list — then pause for approval.*
