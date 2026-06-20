# SAGI Token Economy — Approach v2 (Implementation Reference)

Reference material for the prototype token economy, ahead of the full implementation plan. v2 keeps the v1 recommendation and adds: the concrete current implementation stack, data model / schemas, a sharpened token calculator (integer money + two emission models), and the full **demo / showcase mode switch** (`LedgerMode`) so the prototype is controllable and can show curated fake data illustrating production (v1) behaviour.

Goal unchanged: **login → start a compute/training session → tokens land in your wallet → the whole network's tokens are visible in realtime** — and now, **a demo operator can stage a believable, reproducible, in-production-looking version of all of that, under full control.**

---

## 0. TL;DR (updated)

Build a **blockchain-inspired, append-only, signed token ledger** ("SAGI Ledger") in the TS monorepo, and run it through a **mode switch** (`demo | sandbox | production`). The ledger is just a fold over a stream of transactions; "fake data" is simply transactions you authored rather than ones produced by real compute, so a curated demo and the real system share one substrate. Concrete stack: **Drizzle ORM + better-sqlite3** (data), **SSE** (realtime), **`@noble/ed25519` + `@noble/hashes`** (signatures/hashing), **integer base units + BigInt** (money), **`@faker-js/faker`** seeded (demo fixtures). Sequencer-sealed blocks (no wasteful mining). Clean upgrade path to a real chain.

---

## 1. Scope discipline — build / stub / defer

The business-model paragraph is **mainnet** economics. For the prototype:

| Mechanism (model) | Prototype |
|---|---|
| Earn for verified compute | **Build** — work-receipts + PoUW calculator |
| Earn for bounty / breakthrough | **Build** — bounty payout transactions |
| Capped, decaying emission | **Build** — core issuance logic; powers the supply-curve insight |
| Staking to submit work | **Stub** — `stake` field + admission hook |
| Slashing bad submissions | **Stub** — validity check exists; nothing to slash yet |
| Buyback-and-burn from fees | **Defer** — model a burn address + knob; don't wire real revenue |
| Utility token (no dividend/profit/governance) | **Respected by construction** |

Reason: stake / slash / burn only do real work with adversaries and real sponsor revenue. The prototype proves **issuance + ledger + earn loops + the demo switch**, with typed hooks for the rest.

---

## 2. Architecture (with the transaction-source abstraction)

The key idea that makes demo mode clean: **`state = reduce(transactions)`**. The chain doesn't care whether a transaction came from real compute or from a fixtures file — so real and synthetic flow through one pipeline, and a mode switch picks which **sources** are active.

```
TRANSACTION SOURCES                      LEDGER CORE                         READ MODEL + DELIVERY
─────────────────                        ───────────                         ─────────────────────
• Real work-receipts  (engine/GA) ─┐
• Bounty/breakthrough events       ─┤──► validate (sig + rules)          ┌─► wallets   (addr → balance…)
• Fixtures importer  (demo)        ─┤    token calculator → reward       ├─► chain     (blocks, txs)   ──► SSE ──► Frontend
• Live demo driver   (demo)        ─┘    seal block (sequencer, no PoW)  └─► netStats  (supply, emission, height…)
                                         append tx → block → state
        ▲                                                                         │
        └──────────── LedgerMode (demo | sandbox | production) selects sources ───┘
```

- Shared **`packages/ledger`** holds token **types** + the **pure calculator** (engine and web import the same contract).
- Prototype: the Ledger runs **inside the engine** as one module; structured (receipt → validate → deterministic state transition) so it can be split out / decentralised later.

---

## 3. Implementation stack (current, grounded)

| Concern | Choice | Why | Later / alt |
|---|---|---|---|
| Language / layout | TypeScript monorepo, shared `packages/ledger` | One contract for engine + web | — |
| **Data** | **Drizzle ORM + better-sqlite3** | TS-first, type-safe schema-in-TS, ~280KB, zero runtime overhead; better-sqlite3 is synchronous + file-based (simplest) | Postgres (`pg`) if the engine uses it; `libsql`/Turso for a remote option; Drizzle Studio to browse |
| **Crypto** | **`@noble/ed25519`** (signatures) + **`@noble/hashes`** (SHA-256) | Audited, zero-dependency, works in Node + browser | `node:crypto` (built-in SHA-256/ECDSA) is a fine no-dep alternative |
| **Realtime** | **SSE** (Server-Sent Events) | Unidirectional server→client streaming dashboards are SSE's sweet spot: HTTP-based, `EventSource` auto-reconnect, low overhead, scalable | `ws` (v8.x) when bidirectional is needed (e.g. interactive demo controls); the frontend's `subscribeNetwork(cb)` hides the transport |
| **Money** | **Integer base units + `BigInt`** | Never use floats for balances; pick decimals (e.g. 1 SAGI = 1e9 base units), do all arithmetic in `BigInt`, store as a `bigint`/text column | — |
| **Demo data** | **`@faker-js/faker`** (seeded) | TS-native, MIT, `faker.seed(n)` ⇒ identical data every run — deterministic fixtures | `chance`/`casual` exist; faker is the default |
| Determinism (non-faker) | `seedrandom`/`alea` | Seed the rest of the world from one value | — |
| Upgrade-path tooling | `viem` + OpenZeppelin ERC-20 + Hardhat/Anvil **or** CometBFT/Cosmos-SDK | For the real-chain step (see §8) | — |

> better-sqlite3 caveat: its transactions are **synchronous** — the `db.transaction(...)` callback must not be `async`. Postgres/libSQL drivers are async.

---

## 4. Data model & schemas

### 4.1 Money (base units)

```ts
export const DECIMALS = 9n;                          // 1 SAGI = 1_000_000_000 base units
export const ONE = 10n ** DECIMALS;                  // base units per token
export type Base = bigint;                            // ALL balances/amounts are base units, never floats
export const fmt = (x: Base) => `${x / ONE}.${(x % ONE).toString().padStart(Number(DECIMALS),'0')}`;
```

### 4.2 Core types

```ts
type Address = string;                                // hex of SHA-256(pubkey), e.g. "sagi1a3f…"
interface KeyPair { address: Address; pub: Uint8Array; priv: Uint8Array; }

type TxKind = "GENESIS" | "COMPUTE_REWARD" | "BOUNTY_PAYOUT"
            | "STAKE" | "SLASH" | "BURN";             // last three: stub/defer

interface Transaction {
  id: string;                                         // = txHash
  kind: TxKind;
  to: Address; from?: Address;                        // mint txs have no `from`
  amount: Base;
  ts: number;
  meta?: Record<string, unknown>;                     // e.g. { sessionId, computeUnits, usefulness, bountyId }
  synthetic?: true;                                   // demo/fixtures/driver-authored (see §9)
  sig?: string;                                        // signer (node/sequencer in prototype; per-user later)
}

interface WorkReceipt {                               // the "earn by compute" input (signed)
  sessionId: string; address: Address;
  computeUnits: number;                               // normalized throughput × time
  usefulness: number;                                 // training signal (fitness/progress); default 1.0
  ts: number; nonce: string; sig: string;
  stake?: Base;                                       // STUB hook (no enforcement in prototype)
}

interface Block {
  height: number; ts: number;
  prevHash: string; merkleRoot: string;               // merkle root of tx ids
  txs: Transaction[];
  sealedBy: Address;                                  // sequencer (replaces PoW miner)
  hash: string;                                        // sha256(height‖prevHash‖merkleRoot‖ts‖sealedBy)
  sig: string;                                          // sequencer signature over hash
}

interface WalletState { address: Address; username: string; total: Base; pending: Base; bountiesWon: number; computeUnits: number; synthetic?: true; }
interface NetworkStats { supplyTotal: Base; supplyCirculating: Base; emissionThisEpoch: Base; epoch: number; height: number; latestHash: string; activeContributors: number; totalCompute: number; }
```

### 4.3 Tables (Drizzle, SQLite)

- `wallets` — read model: `address (pk), username, total, pending, bountiesWon, computeUnits, synthetic`.
- `transactions` — **append-only**: `id (pk), kind, fromAddr, toAddr, amount, ts, meta(json), synthetic, sig, blockHeight`.
- `blocks` — **append-only**: `height (pk), ts, prevHash, merkleRoot, hash, sealedBy, sig`.
- `bounties` — `id (pk), title, targetMetric, reward, status, winnerAddr, synthetic`.
- (optional) `work_receipts` — audit of admitted receipts.

`username ↔ address` is set by an **auto-generated keypair on first login** (custodial demo wallet — no seed phrases). The dead-simple `username:total_tokens` you asked for *is* the `wallets` table; the append-only `transactions`/`blocks` behind it are the chain (auditable + explorable).

### 4.4 Block sealing & integrity (no mining)

`hash = SHA256(height ‖ prevHash ‖ merkleRoot(txIds) ‖ ts ‖ sealedBy)`; each tx is hashed and signed, verified by rehash + signature check; `merkleRoot` is pair-and-hash of tx ids (optional Merkle proofs via a ~20-line helper or `merkletreejs`). **Replace PoW mining with a sequencer-sealed, signed block** — the "work" that secures SAGI is the *useful compute*, not hashing, which matches the thesis and avoids burning electricity on nonces. Chain validity = re-hash every block and check the `prevHash` links + signatures. (Optional advanced step: a state-root trie over balances for verifiable state.)

---

## 5. Token calculator — Proof of Useful Work (integer + emission models)

Reward scales with **compute × usefulness**, bounded by a **decaying emission**, all in base units.

```
work_i      = computeUnits_i · usefulness_i           // usefulness from the training/GA signal; default 1.0
reward_i    = E(epoch) · ( work_i / Σ_j work_j )      // share of the epoch pool  → relative/competitive
```

**Two emission models** (pick one in config):

- **(a) Smooth geometric decay** — `E(k) = E0 · r^k` per epoch (`0<r<1`). Total cap = `E0 / (1−r)` (geometric series). Simplest, smoothest.
- **(b) Supply-threshold halving (Bittensor-style, recognizable)** — fixed block reward that **halves when circulating supply crosses milestones** (not on a block-number schedule), asymptotically approaching a hard cap (Bittensor: 21M cap, halve at supply checkpoints; recycling fees can delay a halving). More legible to a crypto-literate audience; pairs naturally with "the network shifts from growth incentives to efficiency incentives."

Notes: `computeUnits` = normalized device throughput × time (prototype: `computeAllocated × duration`); `usefulness` is the on-thesis lever (reward *useful* work, not raw cycles). Rewards finalize at **epoch/block close** → the wallet shows **pending → confirmed**. Implement as a **pure, unit-tested** function; keep `E0, r, decimals, epoch length, milestones, computeUnit normalization` in config.

---

## 6. The two earning systems

### 6.1 Compute rewards (work-receipts → PoUW)
Engine/session emits a **signed `WorkReceipt`**; the ledger verifies signature + rules (and the `stake` hook, stubbed), runs the calculator, and appends a `COMPUTE_REWARD` tx in the next sealed block. Who signs: the node/sequencer key in the prototype, with the structure to move to **per-user signing** later.

### 6.2 Bounties / breakthroughs
A `bounty` has a target metric + reward pool. A completion event from the engine/session — e.g. the **session GA solving its maze under a step/score threshold**, or a training run hitting a target — emits a `BOUNTY_PAYOUT` tx to the winner. Counted separately so the leaderboard shows "bounties won." (Real model: sponsor funds escrow; prototype: a fixed pool.) This is exactly where "achieving a breakthrough" plugs into the real engine.

---

## 7. Realtime delivery + read model

On each block close, recompute and **broadcast over SSE**: `NetworkStats` + leaderboard (top-N by tokens and by bounties) + recent blocks/txs + changed wallet balances. The frontend Wallet, Leaderboard, and Network-overview pages consume the `subscribeNetwork` seam (SSE now; swap to `ws` if interactive demo controls need a back-channel — no UI change). Front-end guidance: coalesce high-frequency events and update from a single store to avoid re-render storms; per `DESIGN.md`, status/▲▼ changes always carry a non-colour cue (icon/label), never colour alone (colourblind).

---

## 8. The blockchain layer & the real-chain upgrade

Build (per §4.4): addresses, signed work-receipts/txs, **sequencer-sealed hash-chained blocks**, emission as block logic, a derived read model, and a **mini chain explorer** on the network page. Honest framing: a *blockchain-inspired ledger* — real primitives (hashing, signatures, append-only chain, deterministic state machine), minus decentralised consensus/P2P (a trusted sequencer stands in).

**Upgrade path:** (1) compute nodes **sign their own receipts** (already structured); (2) replace the sequencer with a **CometBFT / Cosmos-SDK app-chain** (Tendermint BFT) for real decentralisation, **or** anchor/settle to an **EVM L2 testnet ERC-20** (OpenZeppelin token, `viem` client, Hardhat/Anvil locally) for transferability + a MiCA-aligned, no-premine launch; (3) turn on **staking/slashing** and **buyback-burn** when there's a submission market + real revenue. The prototype's `receipt → validate → state-transition` maps onto a chain's `tx → mempool → block`.

---

## 9. Showcase / demo mode — the `LedgerMode` switch

The control-and-fake-data requirement, made first-class. Same seam philosophy as the app's `Api` (mock/http) and `TrainingSource` (local/remote).

### 9.1 The mode

```ts
type LedgerMode = "demo" | "sandbox" | "production";   // config.ledger.mode
```

| Mode | Sources active | Use |
|---|---|---|
| **demo** | seeded synthetic genesis **+** optional live driver **+** the real user's own actions | Investor/pitch showcase: live, populated, reproducible, directed |
| **sandbox** | real receipts only, ephemeral/local store | Dev + tests; no synthetic data |
| **production** | real receipts only; synthetic **excluded/purged** | Live v1 |

### 9.2 Transaction-source abstraction
Because `state = reduce(txStream)`, the ledger reads from a set of **sources**; the mode toggles which are on:

```ts
interface TxSource { name: string; start(emit: (tx: Transaction) => void): void; stop(): void; }
// realReceipts (engine/GA) · genesisFixtures (demo) · demoDriver (demo)
```

### 9.3 Seeded synthetic genesis fixtures
A generator builds a believable, **deterministic** world at genesis with `faker.seed(SEED)`:
- N fake usernames, each with a **real keypair + address** (so the explorer looks legit), a plausible balance distribution, and a backlog of `COMPUTE_REWARD` txs spread over an emission curve, plus a few **closed bounties** with winners.
- Replayed into real sealed blocks (a genesis backlog), so the network looks alive and **explorable** the moment you open it. Same `SEED` ⇒ identical demo every time (full control for a pitch).

```ts
function buildGenesis(seed: number, opts: { users: number; days: number }): { wallets: WalletState[]; txs: Transaction[]; bounties: Bounty[] }
// uses faker.seed(seed); every produced wallet/tx/bounty is tagged synthetic:true
```

### 9.4 Live demo driver (optional)
Emits **plausible txs on a timer** — other "contributors" earning, a bounty closing — so the leaderboard and network page **move** during a demo with nobody running real compute. **Pausable** and **scriptable** via a hidden **demo control panel**: "trigger a breakthrough now," "advance emission an epoch," "make wallet X win the next bounty." (This is the one place a `ws` back-channel may be worth it; otherwise drive it server-side.)

### 9.5 The real user, layered on top
The presenter's own session produces a **genuine signed `WorkReceipt`** and a real reward, sitting on top of the synthetic population — so the demo is partly real (what happens on stage) and partly curated (the world around it).

### 9.6 The synthetic tag (no contamination)
Every synthetic wallet/tx/bounty carries `synthetic: true` (column + tx `meta`). `production` filters them out, and a one-shot **purge** drops the synthetic set when going live. Fake users still get **real keypairs and properly signed txs**, so the chain explorer is fully legit — the flag is the only thing separating demo from real, and it guarantees no fake balances leak into a real economy.

### 9.7 Sequencing (de-risks the timeline)
**Phase 1 (no chain) already runs in demo mode** — seeded fake balances + a moving leaderboard give a controllable, in-production-looking demo *before* the ledger exists. The chain (Phase 2) then slots underneath without changing the frontend or the demo controls. So the blockchain layer never blocks the fake-data/control goal — it's additive.

---

## 10. Economic dynamics & insights

Surface these as telemetry (they feed the network-overview/progress pages and are the "how the economy develops" answer):

- **Capped supply curve.** Model (a) sums to `E0/(1−r)`; model (b) approaches a hard cap via halvings. Early contributors earn more (a deliberate bootstrap). Plot the issuance curve.
- **Competitive emission.** Rewards are a share of the epoch pool, so growth lowers per-unit reward (difficulty-like), pushing contributors toward **better algorithms** (more usefulness), not just more hardware — "staged tapering shifts the network from growth incentives to efficiency incentives."
- **The demand gap.** Emissions-only networks slow but don't stop dilution, and the open question is whether the token captures the value the network creates — which is precisely what the model's **buyback-burn** is for. Track (once enabled) burn rate + net supply.
- **Track:** total / circulating supply, emission rate (epoch), tokens/epoch, active contributors + total compute, reward distribution (top-N + a simple concentration/Gini), bounties paid, block height/time; later — stake locked, slash events, burn rate, velocity.
- **Comparables:** Bittensor (work token, relative emissions, supply-threshold halving, no premine/ICO), Numerai (stake + burn), Gensyn (proof-of-learning + buy-and-burn), Render / io.net (DePIN compute).

---

## 11. Build order (phased; demo mode woven in)

1. **Earn loop, demo-capable, no chain.** Shared token **types** + **base-unit money** + the **pure calculator** (tested); the `wallets` read model; the **fixtures generator** (faker-seeded); SSE broadcast; wire the frontend **Wallet + Leaderboard + network stats**. Runs in `demo` (seeded fake + real user) or `sandbox`. *Delivers login → session → tokens → wallet → realtime immediately, and a controllable demo.*
2. **The ledger.** Addresses, signed work-receipts, **sequencer-sealed blocks**, emission-as-block-logic; replay fixtures into a **genesis backlog of real blocks**; add the **mini chain explorer**; apply the `synthetic` tag end-to-end.
3. **Breakthroughs + the driver.** Wire **bounty/breakthrough payouts** to the session GA; add the **live demo driver** + the hidden **control panel**.
4. **Sinks + decentralisation seams.** Stub `stake/slash/burn`; add per-node signing / `remote` seams; document the upgrade path; implement the `production` purge.

---

## 12. Build / stub / defer (summary)

**Build:** custodial keypairs/addresses, base-unit money, PoUW calculator + emission (one model), signed work-receipts, sequencer-sealed hash-chained ledger + blocks, `wallets` read model, bounty payouts, SSE leaderboard + network stats + mini explorer, **the `LedgerMode` switch + seeded fixtures + synthetic tag + demo driver/control panel.**
**Stub:** staking, slashing, burn address (knobs/hooks), multi-node signing.
**Defer:** real consensus/P2P, public-chain settlement / ERC-20, real wallets (seed phrases), sponsor-fee → buyback-burn, MiCA-compliant issuance.

---

### Next
The **full Claude Code implementation plan** (research → plan → branch+build → merge) will reference this doc, `DESIGN.md`, and the engine/frontend plans, and specify the `WorkReceipt` / `Transaction` / `Block` contracts, the calculator, the SSE channel, and the `LedgerMode` machinery so it builds against fixed interfaces.

### References
**Stack:** Drizzle ORM (`orm.drizzle.team`) + better-sqlite3 / libSQL-Turso · `@noble/ed25519`, `@noble/hashes` (audited, zero-dep) · SSE vs `ws` (Server-Sent Events for streaming dashboards; `ws` v8 for bidirectional) · `@faker-js/faker` v10 (MIT, `faker.seed()` deterministic) · `viem` + OpenZeppelin ERC-20 + Hardhat/Anvil · CometBFT / Cosmos-SDK.
**TS ledger references:** Predjo/blockchain-ts-2.0 · kloubert "implement blockchain with TypeScript" · radzion Merkle-tree-in-TS / proof-of-work-in-TS.
**Token-economy comparables:** Bittensor (21M cap, supply-threshold halving, no premine/ICO) · Numerai · Gensyn · Render / io.net.
