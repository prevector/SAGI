# SAGI SDK — Unified Design

Merges the original Compute SDK brief with the human-signal surface into one SDK with two contribution paths sharing a single core.

## Purpose

Allow games and applications to contribute **compute** and **human judgment** to the SAGI network, and to earn token rewards for both.

The SDK:

* connects an application to SAGI;
* receives approved compute jobs and signal tasks;
* executes genomes in a restricted runtime, and surfaces judgment tasks to the user;
* submits results and responses for validation;
* records earned token rewards.

The SDK must never execute arbitrary code received from the network.

## Architecture and team responsibilities

The SAGI system splits into three layers:

1. **The Network Coordinator** (Side A / Deep Tech)
   - Orchestrates compute jobs and signal tasks across the network
   - Validates compute results by independent reproduction (deterministic agreement)
   - Settles signal bets against ground-truth evaluation results
   - Maintains the ledger and distributes token rewards
   - Exposes endpoints that the SDK client calls

2. **The SDK Client** (Side B / Signal Path)
   - Thin wrapper around network communication
   - Provides language-native interfaces for applications
   - Handles identity, wallet, and local configuration
   - Enforces resource limits and restricted execution boundaries
   - Does NOT implement business logic (validation, settlement) — the coordinator owns that

3. **Host Applications** (End users + developers)
   - Games, dashboards, passive compute nodes
   - Use the SDK to contribute compute, signal, or both
   - Never call the coordinator directly; always through the SDK
   - Configuration specifies which paths are enabled: `[compute]`, `[signal]`, or `[compute, signal]`

**How the paths complement each other:**
- Signal path → users play games and make judgment calls: "which creature is fitter?"
- Those signals flow to the coordinator, which uses them to prioritize which candidates get expensive evaluation
- Compute path → distributed nodes execute evaluation jobs on those candidates
- Results come back to the coordinator, which compares them against signals
- Accurate signals are rewarded; compute work is validated and rewarded
- Better models from the search enable better games, which attract more players, which provide better signals — a flywheel

## Two contribution paths

| Path | Donates | Does | Validated by |
|---|---|---|---|
| **Compute** | idle cycles | runs genome jobs (SEARCH / VERIFY / VALIDATE / BENCHMARK) | independent reproduction (deterministic agreement) |
| **Signal** | human judgment | triages which candidates deserve expensive evaluation (DUEL) | settlement against the network's ground-truth evaluation |

They form one loop: **the signal path decides *what* to evaluate; the compute path *does* the evaluating.** A single host app can run both — the player's taps choose targets while their idle cycles supply the work — with both earning into one wallet. An application may enable either path or both.

## Core architecture

```text
Host application
    ↓
SAGI SDK
    ├── Core
    │   ├── Network Client
    │   ├── Identity and Wallet
    │   ├── Ledger Client            (read balance, verify rewards)
    │   └── Resource Controller
    ├── Compute Path
    │   ├── Job Scheduler
    │   ├── Restricted Genome Runtime
    │   └── Result Validator
    └── Signal Path
        ├── Task Client
        ├── Response Submitter
        └── Leaderboard Reader
            ↓
        SAGI Network
```

## Public SDK interface

```text
# core
initialize(config)
connect()
disconnect()
get_status()
get_statistics()
get_wallet()
get_balance()
get_transactions()
on_reward_received(callback)
on_error(callback)

# compute path
set_compute_budget(budget)
set_execution_policy(policy)
start_contributing()
pause_contributing()
stop_contributing()
on_job_started(callback)
on_job_completed(callback)

# signal path
request_task()                       # -> SignalTask (e.g. a duel)
on_task(callback)
submit_signal(task_id, response)
get_leaderboard(limit)               # read search state, for dashboards
on_task_settled(callback)            # fired when a scout bet resolves
```

## Configuration

```text
Config:
    application_id
    node_identity
    wallet_address
    network_endpoint
    supported_runtime_version
    enabled_paths            # [compute], [signal], or both
    compute_capabilities
    resource_limits
```

Applications define strict compute limits:

```text
ComputeBudget:
    maximum_cpu_percentage
    maximum_gpu_percentage
    maximum_memory
    maximum_execution_time
    battery_policy
    foreground_or_background_only
```

The signal path is near-free (API calls only); it carries a light policy, e.g. maximum tasks cached and whether tasks may be surfaced in the foreground.

---

# Compute path

## Compute job

The network distributes signed jobs:

```text
ComputeJob:
    job_id
    job_type
    genome
    environment
    random_seed
    runtime_version
    resource_limit
    expected_output_schema
    reward
    signature
```

Job types:

```text
SEARCH      Execute a candidate genome in an environment.
VERIFY      Repeat an existing result using an independent node.
VALIDATE    Run a candidate across additional environments or seeds.
BENCHMARK   Measure performance, memory use and execution time.
```

## Restricted execution

Only SAGI-defined genome operations may execute.

```text
execute(job):
    verify_job_signature(job)
    verify_runtime_version(job)
    validate_genome(job.genome)
    enforce_resource_limits(job)

    runtime = create_restricted_runtime()
    result = runtime.execute(
        genome = job.genome,
        environment = job.environment,
        seed = job.random_seed
    )

    return create_signed_result(result)
```

The runtime provides:

* deterministic execution;
* fixed supported operations;
* bounded memory;
* bounded execution time;
* no filesystem access;
* no network access;
* no native code loading;
* no access to the host application;
* reproducible random-number generation.

## Job lifecycle

```text
connect to network
advertise compute capabilities
request job
receive signed job
validate job
execute genome
collect metrics
sign result
submit result
await network acceptance
receive token reward
```

## Result format

```text
ComputeResult:
    job_id
    node_id
    genome_hash
    environment_hash
    random_seed
    outputs
    fitness
    execution_metrics
    runtime_version
    result_hash
    node_signature
```

Results must be independently reproducible by other nodes.

## Compute validation

A result is accepted only after sufficient independent agreement.

```text
submit(result)

network:
    assign same job to independent nodes
    compare deterministic outputs
    reject inconsistent results
    accept verified result
    distribute rewards
```

Nodes must not know which other nodes are validating the same job.

---

# Signal path

## Signal task

The network distributes signed judgment tasks:

```text
SignalTask:
    task_id
    task_type                # DUEL (v1)
    candidates               # items to judge, e.g. two genomes
    render_hints             # cheap-eval metrics / behaviour to encode in the creature
    expected_response        # schema of a valid answer, e.g. pick in {a, b}
    reward_policy
    signature
```

Task type (v1):

```text
DUEL        Present two candidates; the user picks the fitter.
```

Future types (out of v1 scope): RANK, RATE, RED_TEAM, CURATE.

The task surfaces uncertain candidates — pairs the cheap automated proxy cannot separate — so human judgment is spent where it is worth the most. The signal triages which candidates the network promotes to expensive full evaluation.

## Task lifecycle

```text
connect to network
request task
receive signed task
render task to the user        (host application owns presentation)
collect the user's response
sign response
submit signal
await settlement
receive token reward           (if the scout proves accurate)
```

## Response format

```text
SignalResponse:
    task_id
    node_id
    choice
    response_time
    runtime_version
    node_signature
```

## Signal validation

Signals are not validated by reproduction; they are validated by **settlement against ground truth** — the network's own full evaluation is the oracle.

```text
submit(response)

network:
    record the scout's open bet
    seed gold-standard tasks (known answers) to calibrate reliability
    down-weight or reject low-reliability and sybil signals
    when the candidate is scored by full evaluation:
        settle open bets against ground truth
        reward accurate scouts

aggregate many independent responses; bound any single identity's weight
```

The host app must not learn which tasks are gold-standard, and the SDK must not reveal it.

---

# Shared core

## Identity and wallet

Each SDK installation owns a single cryptographic node identity, used by **both** paths to sign compute results and signal responses.

```text
NodeIdentity:
    public_key
    private_key
    node_id
```

The private key remains local. For casual apps, the SDK manages the keypair transparently so a player never handles keys; the same identity still produces signed compute results.

The SDK wallet supports:

```text
get_address()
get_balance()
list_transactions()
sign_result()
verify_reward()
transfer_tokens(destination, amount)
```

The SDK contains no consensus or token-issuance logic. Issuance, settlement and the ledger live in the network; the SDK communicates through signed transactions and reads its balance.

## Rewards

Both paths settle into the same wallet, as two reward types.

```text
compute_reward =
    accepted_compute
    × job_difficulty
    × verification_quality
    × reliability_factor

signal_reward =
    correct_prediction          (backed candidate proved higher-ranked)
    × task_difficulty
    × scout_reliability
```

No reward is issued for:

* invalid or unverified compute results;
* compute jobs exceeding execution limits;
* duplicate submissions on either path;
* signals that fail gold-standard checks or are sybil/duplicate;
* signals that backed the losing candidate.

## Application integration

The host application controls when compute is available and when judgment tasks may be shown.

```text
game starts
SDK connects (compute + signal enabled)

while game is running:
    application reports available compute budget
    SDK runs compute jobs within that budget   (background)
    at natural moments, SDK surfaces a duel     (foreground)
    user picks; SDK submits the signal

game becomes performance-sensitive:
    SDK pauses compute
    (signal tasks may continue — they are near-free)

game returns to idle:
    SDK resumes compute

game closes:
    SDK finishes or checkpoints the current job
    SDK disconnects
```

The SDK must remain isolated from gameplay logic. SAGI jobs and tasks cannot read or modify game state, and gameplay cannot influence results or responses beyond the user's genuine choice.

## Security boundary

Trusted:

```text
signed SAGI job and task specifications
verified SAGI runtime
local SDK
the network's ground-truth evaluation
```

Untrusted:

```text
received genomes
claimed results
remote nodes
host applications
human responses            (noisy, sybil-prone, adversarial)
```

Every job and result must be versioned, hashed, signed, resource-bounded, reproducible and independently verified. Every task and response must be versioned, hashed, signed, gold-calibrated, aggregated, and settled against ground truth.

## Initial SDK scope

Version 1 should contain:

```text
network connection
node identity (shared by both paths)
wallet access
compute-budget management
signed job reception
restricted genome execution
compute result submission
verification jobs
signed task reception (DUEL)
signal submission
settlement against ground truth
leaderboard read
reward tracking (compute + signal)
```

It should not initially support:

```text
arbitrary user code
custom execution engines
general smart contracts
direct peer-to-peer code execution
host filesystem or network access
signal task types beyond DUEL
client-side reward computation or consensus
```
