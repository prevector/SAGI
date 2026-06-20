# PLAN — Realtime Top-10 Leaderboard (learning-score ranked, bounties won)

## Goal
A realtime, top-10 leaderboard in the web app that ranks organisms by their
**best simulation/learning score** (from the evolution engine), and also shows
**bounties won** and tokens. It must work end-to-end with the engine currently
built (`@sagi/evolution` GA → `trainOne`/`fitnessOf`) flowing through the SQL
ledger, not just the mock.

## Decisions (confirmed)
- **Ranking key = learning score** (best normalized GA transfer score in `[0,1]`),
  tie-broken by tokens. Tokens + bounties-won are columns, not the rank key.
- **Upgrade both** the dashboard widget (top 10) and the `/leaderboard` page to
  realtime; reuse the existing `features/leaderboard` components.
- **Realtime transport** mirrors the proven network SSE pattern
  (`/api/network/stream` + `subscribeNetwork` + `useNetwork`).

## What exists today (grounding)
- `LeaderboardEntry` (`packages/shared/src/domain.ts`): `rank, userId, username,
  tokens, computePower, delta?, isCurrentUser?` — **no score, no bountiesWon**.
- `buildLeaderboard` (`apps/api/src/ledger/read.ts`) ranks by `wallets.total`
  (tokens) only. `wallets` already has `bountiesWon` + `computeUnits` columns
  (unused by the leaderboard).
- The GA (`trainOne`, `verifyGenome`, `fitnessOf`) produces a real
  `bestFitness`/`solved`/rollout `bestDist`, but it is **not** wired into the
  economy — `LedgerService.completeIfDue` hardcodes `usefulness: 1.0`
  ("seam: real GA fitness later").
- Leaderboard UI is **fetch-once** (`useAsync`); realtime already works for the
  network widget via SSE. `service.broadcast()` already fires on every change
  (session create/complete, epoch close, bounty payout, driver tick).

## Score definition (normalized, truthful to the engine)
Add a normalized transfer score `score ∈ [0,1]` computed from a real GA run's
best rollout:
- `progress = 1 - bestDist / maxDist` (how close to the exit), plus a solved
  bonus, clamped to `[0,1]`. This matches the product's existing 0..1 "transfer
  score" semantics (bounty targets like `0.85`, metric `Best transfer score`).
- Persist raw `bestFitness` is optional; the leaderboard displays the normalized
  `score`.

---

## A. Shared contract (one type, flows everywhere)
**`packages/shared/src/domain.ts`** — extend `LeaderboardEntry`:
```ts
export interface LeaderboardEntry {
  rank: number;
  userId: ID;
  username: string;
  score: number;        // NEW — best normalized GA transfer score (rank key), 0..1
  bountiesWon: number;  // NEW
  tokens: number;
  computePower: number;
  delta?: number;       // 24h / this-epoch movement (kept)
  isCurrentUser?: boolean;
}
```
`apps/web/src/lib/types.ts` re-exports `Domain.LeaderboardEntry`, so this
propagates automatically. TypeScript will then flag **every** producer/consumer
(mock, http read model, table) — a built-in checklist.

## B. Backend — wire the real evolution algorithm
1. **Schema** (`apps/api/src/ledger/db/schema.ts`, Drizzle defs **and** `SCHEMA_DDL`):
   - `wallets`: add `bestScore REAL NOT NULL DEFAULT 0`.
   - `sessions`: add `score REAL` (the score computed for that session).
2. **Compute the score from the GA** (`apps/api/src/ledger/service.ts`):
   - In `createSession`, run a **bounded** `trainOne({ seed: <session/bounty
     seed>, cols, rows, maxGenerations })` synchronously with small caps
     (e.g. 11×11, `maxGenerations ≈ 40`) so it returns in well under ~100ms.
     Derive `score ∈ [0,1]` from the outcome (`bestFitness`/`bestDist`/`solved`)
     and store it on the session row. (Running at creation, not at the
     epoch-close timer, keeps the timer non-blocking.)
   - In `completeIfDue`, replace `usefulness: 1.0` with the session's `score`
     (learning quality now drives the reward — a real economic link), and update
     the wallet: `bestScore = max(bestScore, score)`.
   - **Risk/mitigation noted:** `trainOne` loops to `maxGenerations`; keep caps
     small. Fallback if too heavy under load: score from a single bounded
     `rollout` instead of a full GA. Will measure during implementation.
3. **Synthetic population so the demo moves**
   (`apps/api/src/ledger/fixtures.ts` + `service.ts` driver hooks):
   - `buildGenesis`: assign each synthetic wallet a deterministic `bestScore`
     (faker-seeded, KNOWN winners higher). Closed-bounty winners already get
     `bountiesWon++`; give them a `bestScore` near their `finalMetric`.
   - `addSyntheticWork` (driver): occasionally nudge a synthetic wallet's
     `bestScore` upward so ranks reshuffle live during a showcase.
4. **Read model** (`apps/api/src/ledger/read.ts`):
   - `buildLeaderboard`: sort by `bestScore` DESC, tie-break `total` DESC;
     emit `score: w.bestScore`, `bountiesWon: w.bountiesWon`, plus existing
     `tokens`, `computePower`, `delta` (pending), `isCurrentUser`.

## C. Backend — realtime transport (SSE, mirrors network)
- Add a second `SseHub` instance for the leaderboard (reuse the existing
  `SseHub` class; no new abstraction).
- **`apps/api/src/ledger/routes.ts`**: add `GET /api/leaderboard/stream`
  (auth-gated, immediate first push of `buildLeaderboard(db, "", 10)`), exactly
  like `/api/network/stream`.
- **`apps/api/src/ledger/service.ts`**: in `broadcast()`, also push
  `buildLeaderboard(db, "", 10)` to the leaderboard hub. Because `broadcast()`
  already fires on every ledger change, the leaderboard is realtime for free.
  The shared stream omits `isCurrentUser`; the client re-marks "you" by username.
- **`apps/api/src/server.ts`**: instantiate the leaderboard hub, pass it into
  `LedgerService` and `createLedgerRouter`.
- *Alternative considered & rejected:* multiplexing both payloads onto the
  existing `/api/network/stream` via named SSE events — higher blast radius on
  the working network client for no real gain in a prototype.

## D. Frontend — Api contract + realtime
- **`apps/web/src/lib/api.ts`**: add
  `subscribeLeaderboard(cb: (rows: LeaderboardEntry[]) => void): () => void;`.
- **`apps/web/src/lib/http.ts`**: implement via `EventSource('/api/leaderboard/
  stream')` reusing the same rAF-coalescing pattern as `subscribeNetwork`.
- **`apps/web/src/lib/mock/index.ts` + `generators.ts`**:
  - `buildLeaderboard` (mock): add `score` + `bountiesWon`, rank by score.
  - add `stepLeaderboard(prev)` (bump scores/tokens, occasional bounty win +
    rank reshuffle) and `subscribeLeaderboard` (setInterval ~2s), mirroring
    `stepNetwork`/`subscribeNetwork`.
- **`apps/web/src/lib/config.ts`**: add `features.realtimeLeaderboard: true`.
- **NEW `apps/web/src/features/leaderboard/useLeaderboard.ts`**: initial
  `api.getLeaderboard({ limit: 10 })` + live subscribe, surfaced as
  `AsyncState<LeaderboardEntry[]>` (mirror `useNetwork`); marks `isCurrentUser`
  from `useAuth().username`; gated by `config.features.realtimeLeaderboard`.

## E. Frontend — component (upgrade both)
- **`LeaderboardTable.tsx`** (+ `.module.css`):
  - Add **Score** column (mono, e.g. `0.873`) as the lead metric after rank.
  - Add **Bounties** column: lucide `Trophy` icon + count (colorblind-safe:
    icon + number, never color alone).
  - Keep tokens / compute / delta on the full variant; compact variant =
    rank · organism · score · bounties.
  - Live affordance: a `● Live` status (icon + text) and a subtle row
    transition on rank change, gated by `prefers-reduced-motion`.
  - Default sort on the full page = score DESC; keep column sorting.
- **`LeaderboardWidget.tsx`**: switch to `useLeaderboard()` (top 10),
  `variant="compact"`.
- **`pages/LeaderboardPage.tsx`**: switch to `useLeaderboard()` (live full list).

## F. Tests & verification
- **Backend unit** (alongside `read.ts`/`service` tests): `buildLeaderboard`
  sorts by `bestScore` then tokens and includes `bountiesWon`; a completed
  session records a non-zero `bestScore` and sets `usefulness` from the score.
- **Type-check**: `npm run build` — the shared-type change forces every site to
  update; zero TS errors is the gate.
- **Manual** (`npm run dev`, demo mode): watch the widget + page reorder live as
  the demo driver runs and on "trigger breakthrough" (bounty win → `bountiesWon`
  increments live); confirm "you" highlighting; confirm reduced-motion.

## G. File touch list
**Backend**
- `packages/shared/src/domain.ts` — extend `LeaderboardEntry`.
- `apps/api/src/ledger/db/schema.ts` — `wallets.bestScore`, `sessions.score` (+DDL).
- `apps/api/src/ledger/service.ts` — GA score wiring + leaderboard broadcast.
- `apps/api/src/ledger/read.ts` — rank by score, new fields.
- `apps/api/src/ledger/fixtures.ts` — synthetic `bestScore`.
- `apps/api/src/ledger/routes.ts` — `/api/leaderboard/stream`.
- `apps/api/src/server.ts` — leaderboard hub wiring.
- `apps/api/src/ledger/*.test.ts` — ranking + score tests.

**Frontend**
- `apps/web/src/lib/api.ts` — `subscribeLeaderboard`.
- `apps/web/src/lib/http.ts` — EventSource impl.
- `apps/web/src/lib/mock/{index,generators}.ts` — score/bounties + step/subscribe.
- `apps/web/src/lib/config.ts` — `realtimeLeaderboard` flag.
- `apps/web/src/features/leaderboard/useLeaderboard.ts` — NEW.
- `apps/web/src/features/leaderboard/LeaderboardTable.tsx` (+`.module.css`).
- `apps/web/src/features/leaderboard/LeaderboardWidget.tsx`.
- `apps/web/src/pages/LeaderboardPage.tsx`.

## H. Build order
1. Shared type (`LeaderboardEntry`) → let TS surface all call sites.
2. Backend schema + GA score wiring + read-model ranking (+ tests).
3. Backend leaderboard SSE (hub + route + broadcast + server wiring).
4. Frontend Api: `subscribeLeaderboard` (mock + http) + config flag.
5. `useLeaderboard` hook.
6. Table (score + bounties columns + live affordance) → widget → page.
7. `npm run build` (type gate) + manual demo-mode verification.

## Risks / notes
- Synchronous `trainOne` cost — bounded caps; fallback to single rollout.
- Score normalization fixed to `[0,1]` to match existing product semantics.
- Shared SSE stream marks "you" client-side (username from auth).
