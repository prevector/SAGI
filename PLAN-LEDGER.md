# PLAN-LEDGER.md — Phase B (approval gate)

Implementation plan for the SAGI token economy, adapted from `SAGI-token-economy-approach-v2.md` to the real repo (`RESEARCH-LEDGER.md`) **and to the user's simplification**: everything runs **server-side in a SQL database**, kept simple; the **blockchain layer is designed-for but deferred behind a switch** (`ledger.chain`), to be enabled later for the real MVP.

> **Approval gate:** do not start Phase C until this plan is approved.

---

## 1. Scope (build now / seam-for-later / defer)

| Area | Decision |
|---|---|
| Base-unit money (`BigInt`) + pure PoUW calculator + capped geometric emission | **Build now** (`packages/ledger`, headless-tested) |
| SQL data layer (Drizzle + better-sqlite3) in `apps/api` | **Build now** — wallets, transactions, sessions, bounties, epochs, (+empty blocks/receipts) |
| Earn loop: session completes → reward computed → wallet credited (pending → confirmed at epoch close) | **Build now** |
| SSE realtime broadcast + read model (wallet, leaderboard, network stats, recent txs) | **Build now** |
| `LedgerMode` (`demo \| sandbox \| production`) + seeded fixtures + `synthetic` tag + `production` purge | **Build now** |
| Live demo driver + hidden control panel (trigger breakthrough / advance epoch / pick winner) | **Build now** (server-driven; no `ws`) |
| Bounty / breakthrough payouts (`BOUNTY_PAYOUT`) | **Build now** (server/driver-triggered; seam to real GA `solved`) |
| Mini chain explorer surface (blocks/txs/wallet views) | **Build now** — txs + wallet live; blocks panel shows "chain off" until enabled |
| ed25519 keypairs, signed work-receipts, hash-chained sealed blocks, merkle, `verifyChain` | **Deferred behind `ledger.chain`** — schema reserves nullable `sig`/`blockHeight`; `address` already real; flip on later with no data-model reshape |
| `STAKE` / `SLASH` / `BURN` | **Stub** (knobs/hooks, no enforcement) |
| Real GA usefulness (client attestation / `remoteSource`), per-node signing, real chain/P2P, ERC-20, real wallets, sponsor-fee→burn | **Defer** (typed seams documented) |

---

## 2. Module placement

```
packages/ledger/                 # ISOMORPHIC (web + api safe). composite, dist/, declarations.
  src/
    money.ts                     # DECIMALS, ONE, Base=bigint, toBase/fromBase, fmt, parse, add/sub/mulFrac
    types.ts                     # Address, TxKind, Transaction, WorkReceipt, WalletState,
                                 #   LedgerNetworkStats, Bounty(ledger), LedgerMode, EmissionConfig, Block(reserved)
    emission.ts                  # E(epoch) geometric decay + cap; (halving alt, config-selectable)
    calculator.ts               # epochRewards(receipts, epoch, cfg): Map<Address, Base>  (PURE)
    address.ts                   # deriveAddress(username) -> "sagi1<hex>" (no keypair yet; chain adds keys)
    dto.ts                       # wire DTOs: amounts as decimal STRINGS (BigInt-safe JSON)
    index.ts                     # isomorphic exports
  src/fixtures/                  # node-only subpath "@sagi/ledger/fixtures" (faker) — web never imports
    genesis.ts                   # buildGenesis(seed,{users,days}) -> {wallets, txs, bounties}  synthetic:true
  *.test.ts                      # headless vitest: calculator split, emission cap, determinism, money round-trips

apps/api/src/ledger/            # NODE-ONLY service (hosts the ledger)
  db/schema.ts                   # Drizzle SQLite tables
  db/client.ts                   # better-sqlite3 + drizzle instance (path from env)
  db/migrate.ts                  # drizzle-kit generate/push wiring
  service.ts                     # Ledger: submit(receipt), payBounty(), closeEpoch(), state(), purgeSynthetic()
  sources.ts                     # TxSource set: realReceipts | genesisFixtures | demoDriver
  driver.ts                      # live demo driver (timer) + control-panel actions
  sse.ts                         # SSE hub: register/unregister clients, broadcast(NetworkUpdate)
  read.ts                        # read-model builders: TokenSummary, leaderboard, NetworkSnapshot DTOs
  routes.ts                      # express routes (REST + /api/network/stream + /api/demo/*)
  config.ts                      # LedgerMode + EmissionConfig from env

apps/web/src/
  lib/http.ts                    # implement all routes + subscribeNetwork via EventSource
  lib/format.ts                  # + formatTokensStr(decimalString) (bigint-safe display)
  lib/config.ts                  # features.ledgerExplorer; useMock default false
  features/ledger/               # explorer feature
    ExplorerPage / BlockList / TxList / WalletView (reuse components/ui)
    DemoControls.tsx             # hidden control panel (demo mode only)
  components/layout/navItems.ts  # + "Ledger" nav item
  routes.tsx                     # + /ledger route
```

`packages/ledger` is added to: root `tsconfig.json` references, `tsconfig.base.json` `paths` (`@sagi/ledger` + `@sagi/ledger/fixtures`), root `package.json` workspaces (already `packages/*`), and `apps/api` / (optionally `apps/web`) deps + tsconfig references. Mirrors `packages/shared` (composite, `dist/`, declarations).

---

## 3. Dependencies (pinned, net-new)

`apps/api`: `drizzle-orm@^0.36`, `better-sqlite3@^11`, `@faker-js/faker@^9`; dev `drizzle-kit@^0.28`, `@types/better-sqlite3@^7`.
`packages/ledger`: `@noble/hashes@^1.5` (SHA-256 for address derivation now, block hashing later). `@noble/ed25519@^2` added only when the chain toggle is built (deferred) — not installed now.
`apps/web`: no new runtime deps (uses native `EventSource`). `seedrandom` already present.
`ws`: **not added** (demo driver is server-side; control panel uses plain POST).

> Versions are targets; pin exact resolved versions at install. better-sqlite3 transactions are synchronous — the `db.transaction(...)` callback must not be `async`.

---

## 4. Finalized contracts

### 4.1 Money (`packages/ledger/src/money.ts`)
```ts
export const DECIMALS = 9n;
export const ONE = 10n ** DECIMALS;          // 1 SAGI = 1_000_000_000 base units
export type Base = bigint;                    // ALL amounts/balances; never a float
export const toBase = (sagi: number | string): Base => /* parse decimal -> base units */;
export const fmt = (x: Base): string =>       // "1234.500000000"
  `${x / ONE}.${(x % ONE).toString().padStart(Number(DECIMALS), "0")}`;
export const toWire = (x: Base): string => x.toString();   // base-unit decimal string for JSON
export const fromWire = (s: string): Base => BigInt(s);
```

### 4.2 Core types (`types.ts`)
```ts
type Address = string;                        // "sagi1" + hex(SHA256(username)).slice(0,38)
type TxKind = "GENESIS" | "COMPUTE_REWARD" | "BOUNTY_PAYOUT" | "STAKE" | "SLASH" | "BURN"; // last 3 stub
interface Transaction { id: string; kind: TxKind; to: Address; from?: Address;
  amount: Base; ts: number; epoch: number; meta?: Record<string, unknown>;
  synthetic?: true; sig?: string; blockHeight?: number; }     // sig/blockHeight null until chain on
interface WorkReceipt { sessionId: string; address: Address; computeUnits: number;
  usefulness: number; ts: number; nonce: string; epoch: number; synthetic?: true;
  sig?: string; stake?: Base; }                                // sig stub; stake stub
interface WalletState { address: Address; username: string; total: Base; pending: Base;
  bountiesWon: number; computeUnits: number; synthetic?: true; }
interface LedgerNetworkStats { supplyTotal: Base; supplyCirculating: Base;
  emissionThisEpoch: Base; epoch: number; height: number; latestHash: string;
  activeContributors: number; totalCompute: number; }
interface EmissionConfig { model: "geometric" | "halving"; E0: Base; r: number;
  epochMs: number; cap: Base; }
// Block reserved for the deferred chain layer (typed, unused until ledger.chain on).
```

### 4.3 Calculator (`calculator.ts`, pure)
```ts
// work_i = computeUnits_i * usefulness_i ; reward_i = E(epoch) * work_i / Σ work_j  (integer math)
export function epochRewards(receipts: WorkReceipt[], epoch: number, cfg: EmissionConfig): Map<Address, Base>;
export function emission(epoch: number, cfg: EmissionConfig): Base;   // E0*r^epoch, capped
```
Integer split: distribute `E(epoch)` by integer-floored proportional shares, assign the rounding remainder to the largest-work address so `Σ rewards === E(epoch)` exactly (no minting drift; emission cap provably holds).

### 4.4 Defaults (emission)
`DECIMALS=9`, model `geometric`, `E0 = 1_050_000 SAGI`, `r = 0.95` ⇒ **cap = E0/(1−r) = 21,000,000 SAGI** (matches the Bittensor comparable). `epochMs`: env-configurable — **demo `10_000`** (leaderboard visibly moves), **sandbox/production `3_600_000`** (1h). `computeUnits = computeAllocated × durationMin`; `usefulness` default `1.0`.

### 4.5 Wire DTOs (`dto.ts`)
All token fields cross JSON as **decimal base-unit strings**. Frontend display types stay `number` where lossless-enough; a new `formatTokensStr(s: string)` formats from the string/BigInt. The extended `NetworkSnapshot` adds ledger fields alongside the existing `{activeContributors,totalCompute,runningSessions,tokensEmitted24h}` so current widgets keep working.

---

## 5. DB schema (Drizzle, SQLite — BigInt stored as TEXT)

- **wallets** — read model: `address(pk)`, `username(unique)`, `total(text)`, `pending(text)`, `bountiesWon(int)`, `computeUnits(int)`, `synthetic(int 0/1)`.
- **transactions** — append-only: `id(pk)`, `kind`, `fromAddr(null)`, `toAddr`, `amount(text)`, `ts(int)`, `epoch(int)`, `meta(text json)`, `synthetic(int)`, `sig(null)`, `blockHeight(null)`.
- **sessions** — `id(pk)`, `username`, `bountyId(null)`, `startedAt(int)`, `status`, `computeAllocated(int)`, `durationMin(int)`, `progress(real)`, `tokensEarned(text null)`, `result(null)`, `synthetic(int)`.
- **bounties** — `id(pk)`, `title`, `sponsor`, `sponsorType`, `description`, `rewardTokens(text)`, `status`, `targetMetric`, `target(real null)`, `progress(real)`, `participants(int)`, `createdAt(int)`, `winner(null)`, `finalMetric(real null)`, `closedAt(null)`, `synthetic(int)`.
- **epochs** — `idx(pk int)`, `startTs(int)`, `endTs(int null)`, `pool(text)`, `emitted(text)`, `status('open'|'closed')`.
- **work_receipts** — audit of admitted receipts (mirrors `WorkReceipt`); `synthetic`, `sig(null)`.
- **blocks** — reserved (empty until `ledger.chain`): `height(pk)`, `ts`, `prevHash`, `merkleRoot`, `hash`, `sealedBy`, `sig`.

DB file under `runs/ledger.db` (already git-ignored), path from `env.ts`. `synthetic` on every economy row; `production` excludes/purges where `synthetic=1`.

---

## 6. `LedgerMode` machinery

`config.ledger.mode` from `LEDGER_MODE` env (default `demo` in dev, `production` when `NODE_ENV=production`).

| Mode | Active `TxSource`s | Store |
|---|---|---|
| **demo** | `genesisFixtures` (seeded) + `demoDriver` (timer) + `realReceipts` (the live user's sessions) | persistent `runs/ledger.db` |
| **sandbox** | `realReceipts` only | ephemeral/local db (tests) |
| **production** | `realReceipts` only; synthetic excluded + one-shot purge on boot | persistent db |

- **Fixtures** (`@sagi/ledger/fixtures`): `buildGenesis(seed,{users,days})` with `faker.seed(seed)` → N wallets (deterministic addresses via `deriveAddress`), a backlog of `COMPUTE_REWARD` txs spread over the emission curve, a few closed bounties with winners — **all `synthetic:true`**. Replayed into the db at first boot in `demo`.
- **Synthetic tag** end-to-end (column + tx `meta.synthetic`); `purgeSynthetic()` deletes all `synthetic=1` rows + recomputes the read model.
- **Demo driver** (`driver.ts`): on a timer emits plausible `COMPUTE_REWARD`/`BOUNTY_PAYOUT` txs so the leaderboard/network move; **pausable**; control-panel actions: `triggerBreakthrough()`, `advanceEpoch()`, `makeWalletWin(address)`.
- **Control panel**: `apps/web` `DemoControls.tsx`, visible only when the API reports `mode==="demo"`; calls `POST /api/demo/*` (no `ws`).

---

## 7. SSE event schema + frontend store

`GET /api/network/stream` (text/event-stream). On each epoch close / driver tick, broadcast one `NetworkUpdate`:
```ts
interface NetworkUpdate {
  at: string;                                  // ISO
  stats: NetworkSnapshot["stats"] & {          // existing fields + ledger fields
    supplyTotal: string; supplyCirculating: string; emissionThisEpoch: string;
    epoch: number; height: number; latestHash: string; };
  leaderboard: LeaderboardEntry[];             // top-N by tokens (and bountiesWon)
  wallets: WalletDTO[];                         // changed wallets only
  recentTx: TxDTO[];                            // last N (amounts as strings)
  recentBlocks: BlockDTO[];                     // [] until ledger.chain on
}
```
Frontend: `subscribeNetwork` (EventSource) feeds a **single store**; updates **coalesced** (rAF/debounce) to avoid re-render storms; `EventSource` auto-reconnects; close on unmount (`useNetwork` already does). Reuses `NetworkSnapshot` extended shape so existing widgets are untouched.

---

## 8. REST endpoints (`apps/api`, auth-gated except health)

`GET /api/tokens/:username` · `GET /api/leaderboard?limit` · `GET /api/network` · `GET /api/network/stream` (SSE) · `GET /api/bounties?status` · `GET /api/bounties/:id` · `GET /api/sessions/:username` · `POST /api/sessions` · `GET /api/profile/:username` · `GET /api/progress` (static for now). Explorer: `GET /api/wallet/:address` · `GET /api/tx/:id` · `GET /api/blocks` (empty until chain). Demo-only: `POST /api/demo/breakthrough` · `POST /api/demo/advance-epoch` · `POST /api/demo/win`. These are exactly the routes `apps/web/src/lib/http.ts` already anticipates.

`config.useMock` defaults to **false** (frontend talks to the real `apps/api`); `mockApi` retained for pure-frontend dev.

---

## 9. File-by-file task list (sub-phases; each ends green: build + typecheck + tests)

**C1 — Shared core (headless).** `packages/ledger` scaffolding (package.json, tsconfig composite, add to base paths + root refs); `money.ts`, `types.ts`, `emission.ts`, `calculator.ts`, `address.ts`, `dto.ts`, `index.ts`. Tests: proportional split correct; `Σ rewards === E(epoch)`; emission cap holds; same inputs ⇒ same outputs; money round-trips. *(no UI)*

**C2 — SQL earn loop + demo + SSE (no chain).** `apps/api`: install deps; `db/schema.ts`, `db/client.ts`, `db/migrate.ts`; `ledger/config.ts`, `service.ts` (submit/closeEpoch/state/purge), `read.ts`, `sse.ts`, `sources.ts` (realReceipts + genesisFixtures), `routes.ts`; wire into `server.ts`; `env.ts` gains `LEDGER_MODE/LEDGER_SEED/LEDGER_EPOCH_MS/DB_PATH/emission`; `fixtures/genesis.ts`. Frontend: `http.ts` real routes + `subscribeNetwork` (EventSource); `format.ts` `formatTokensStr`; `config.ts` `useMock=false`. **Goal loop live:** login → start session → tokens (pending→confirmed) → wallet + leaderboard + network update in realtime, in `demo`/`sandbox`.

**C3 — Mini chain explorer + synthetic tag end-to-end.** `features/ledger/` (ExplorerPage, TxList, WalletView, BlockList placeholder "chain off"); `navItems.ts` + `routes.tsx`; explorer endpoints; thread `synthetic` through read model + UI (tagged, not colour-only). Test: `production` excludes/purges synthetic.

**C4 — Breakthroughs + live driver + control panel.** `driver.ts` (timer txs + actions); bounty payout path (`BOUNTY_PAYOUT`, `bountiesWon`); `/api/demo/*`; `DemoControls.tsx` (demo-only). Seam comment for real GA `solved` → bounty.

**C5 — Sinks + seams + polish.** Stub `STAKE/SLASH/BURN` hooks (no enforcement); document the **chain upgrade path** (`ledger.chain`: ed25519 keys + signed receipts + sealed hash-chained blocks + `verifyChain`) and **enabling sinks**; `production` purge on boot. Colourblind audit on every new surface; coalesce SSE; reduced-motion; close streams on unmount; stream error handling.

---

## 10. Conventions

- **Branch** `feat/token-economy` off `main` (never commit to `main`).
- **Commits** conventional, small, green: `feat(ledger): …`, `feat(api): …`, `feat(web): …`, `test(ledger): …`.
- Money is `BigInt` base units throughout; no `number` ever holds a balance/amount server-side; strings on the wire.
- Build/test calculator + service headless before wiring UI; seed everything; engine extended additively; reuse frontend surfaces + `subscribeNetwork`; no hardcoded colours/fonts (use app CSS tokens); colour never the only signal.

## 11. PR checklist (Phase D/E)
- [ ] build / typecheck / lint clean; `apps/api` runs; frontend reuses existing surfaces.
- [ ] no floats in money (BigInt/TEXT base units; strings on wire).
- [ ] calculator tests pass headless (split correct, cap holds, deterministic).
- [ ] goal-loop smoke test: login → session → pending→confirmed tokens → live leaderboard/network.
- [ ] demo mode opens populated, moving, reproducible (same seed ⇒ same world); control panel fires scripted events; real user layers on top.
- [ ] `production` excludes/purges all `synthetic` rows.
- [ ] docs: `ledger.chain` upgrade path (keys → signed receipts → sealed blocks → `verifyChain`) and turning on staking/slashing/burn.
- [ ] PR `feat/token-economy → main` with summary + screen recording (goal loop + demo showcase); squash-merge when green; delete branch.

---

**Awaiting approval to begin Phase C (C1).**
