# SAGI Token Economy — How it works & the upgrade seams

A working prototype token economy: **login → run a session → tokens credited to your wallet via a capped-emission PoUW calculator → the whole network's tokens + a mini chain explorer visible in realtime over SSE.** Per the build direction it runs **entirely server-side on SQL, kept simple**; the blockchain layer (signed, hash-chained blocks) is **designed-for but deferred behind a switch**. See `SAGI-token-economy-approach-v2.md` (reference), `RESEARCH-LEDGER.md` (codebase map), `PLAN-LEDGER.md` (plan).

## Layout

| Piece | Where |
|---|---|
| Money (BigInt base units), types, pure PoUW calculator, capped emission, address derivation, wire DTOs | `packages/ledger` (isomorphic, headless-tested) |
| SQL ledger service: earn loop, epochs, bounty payouts, seeding, purge | `apps/api/src/ledger/` (Drizzle + better-sqlite3) |
| `LedgerMode` (demo / sandbox / production), seeded fixtures, demo driver, control panel | `apps/api/src/ledger/{config,fixtures,driver,routes}.ts` |
| SSE realtime + REST | `apps/api/src/ledger/{sse,routes,read,explorer}.ts` |
| Frontend wiring (`Api`, `subscribeNetwork`), explorer page, demo controls | `apps/web/src/lib/{http,api}.ts`, `apps/web/src/features/{ledger,demo}/`, `pages/LedgerPage.tsx` |

## Core invariants

- **Money is `BigInt` base units** in memory and `TEXT` base units in SQLite — never a float. `DECIMALS=9` (1 SAGI = 1e9 base units). Over the wire, the explorer carries **exact base-unit decimal strings**; the existing display surfaces use SAGI numbers converted at the read seam (`toSagiNumber`). Tested headless: the epoch split sums **exactly** to the emission pool (no minting drift) and the cumulative emission never exceeds the cap.
- **Emission**: geometric decay `E(k)=E0·r^k`, default `E0=1,050,000 SAGI`, `r=0.95` ⇒ **cap = 21,000,000 SAGI**. Halving is a config alt. Reward share = `computeUnits·usefulness / Σ` of the epoch pool. `computeUnits = computeAllocated × durationMin`; `usefulness` defaults to `1.0` (GA-fitness seam below).
- **Earn loop**: session completes → `WorkReceipt` into the open epoch → provisional `pending` recomputed → at epoch close the calculator mints `COMPUTE_REWARD` txs and `pending` becomes confirmed `total`.
- **`synthetic` tag** on every economy row + tx meta. `demo` seeds a reproducible faker population (same `LEDGER_SEED` ⇒ identical world) + closed-bounty winners; the live driver animates it. `sandbox` is real-only/ephemeral. `production` carries **no synthetic data and purges any on boot**.

## Config (env)

`LEDGER_MODE` (`demo`|`sandbox`|`production`, default demo in dev / production in prod) · `LEDGER_SEED` · `LEDGER_DB_PATH` · `LEDGER_E0` / `LEDGER_R` / `LEDGER_EPOCH_MS` · `LEDGER_GENESIS_USERS` / `_DAYS`. Frontend: `VITE_USE_MOCK=1` falls back to the pure mock. See `.env.example`.

---

## Seam 1 — Real GA usefulness & breakthroughs

Today the earn loop uses `usefulness = 1.0` and breakthroughs are triggered by the demo driver / control panel. The session GA (`apps/web/.../session/visual/learning`) already exposes `bestFitness` and a `solved` boolean.

- **Usefulness**: map the GA's `bestFitness` into `WorkReceipt.usefulness` (e.g. normalize to ~`[0.5, 2.0]`). The receipt is minted in `LedgerService.completeIfDue`; that's the one line to change.
- **Breakthrough**: when the GA's `solved` fires for a session that targeted a bounty, call `LedgerService.triggerBreakthrough(solvingWalletAddress)` (already used by the control panel). The wiring point is the client GA's solved event → `POST /api/demo/win` (or a dedicated `POST /api/breakthrough`) with the session's bounty.

## Seam 2 — The blockchain layer (`ledger.chain`)

The data model already reserves what the chain needs, so turning it on is additive, not a migration:

- `transactions` is **append-only**; rows carry nullable `sig` and `block_height`. A `blocks` table is reserved. The `Block` type and `latestHash` field already exist (empty for now). The address format (`sagi1` + SHA-256 prefix) is chosen so a real keypair can hash to the same address.

To enable:
1. **Per-node / per-user signing**: generate an `@noble/ed25519` keypair per wallet (custodial first), sign each `WorkReceipt` and `Transaction`; populate `sig`. (`@noble/hashes` is already a dep for hashing; add `@noble/ed25519`.)
2. **Sequencer-sealed blocks**: at epoch close, batch the epoch's txs into a `Block` — `merkleRoot` = pair-and-hash of tx ids, `hash = SHA256(height‖prevHash‖merkleRoot‖ts‖sealedBy)`, signed by the sequencer; set each tx's `block_height`. Add `verifyChain()` (re-hash every block, check `prevHash` links + signatures). Surface real blocks in the explorer (`/api/ledger/blocks`, already wired to return `[]`).
3. **Decentralise** (later): replace the trusted sequencer with CometBFT/Cosmos-SDK, **or** settle to an EVM-L2 ERC-20 (`viem` + OpenZeppelin). The prototype's `receipt → validate → state-transition` maps onto `tx → mempool → block`.

## Seam 3 — Sinks (staking / slashing / burn)

`STAKE`/`SLASH`/`BURN` are in the `TxKind` contract; `LedgerService.{stake,slash,burn}` are typed hooks guarded by `sinksEnabled = false` (no-ops). They do real work only with a submission market (stake/slash) and real sponsor revenue (buyback-burn). To enable: flip `sinksEnabled`, add enforcement (admission/lock for stake, validity-market penalty for slash, fee→buyback for burn) and the corresponding tx writes + a burn address.

## Seam 4 — Realtime transport

`subscribeNetwork` is an SSE `EventSource` against `/api/network/stream` (coalesced to one update per frame). If the demo control panel ever needs a server→client back-channel beyond polling, swap to `ws` behind the same `subscribeNetwork` seam — no component changes.
