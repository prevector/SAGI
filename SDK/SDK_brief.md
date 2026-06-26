

# SAGI Compute SDK — Short Design

## Purpose

Allows applications to contribute passive (compute) & active (labelling) activities to the SAGI network. The SDK will be public in the future. 

The SDK:

* connects an application to SAGI;
* receives approved compute jobs;
* executes genomes in a restricted runtime;
* submits results for validation;
* records earned token rewards.

The SDK must never execute arbitrary code received from the network.

## Core architecture

```text
Host application
    ↓
SAGI SDK
    ├── Network Client
    ├── Identity and Wallet
    ├── Job Scheduler
    ├── Restricted Genome Runtime
    ├── Result Validator
    └── Local Resource Controller
            ↓
        SAGI Network
```

## Public SDK interface

```text
initialize(config)
connect()
disconnect()

set_compute_budget(budget)
set_execution_policy(policy)

start_contributing()
pause_contributing()
stop_contributing()

get_status()
get_statistics()

get_wallet()
get_balance()
get_transactions()

on_job_started(callback)
on_job_completed(callback)
on_reward_received(callback)
on_error(callback)
```

## Configuration

```text
Config:
    application_id
    node_identity
    wallet_address
    network_endpoint
    supported_runtime_version
    compute_capabilities
    resource_limits
```

Applications define strict limits:

```text
ComputeBudget:
    maximum_cpu_percentage
    maximum_gpu_percentage
    maximum_memory
    maximum_execution_time
    battery_policy
    foreground_or_background_only
```

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

Initial job types:

```text
SEARCH
    Execute a candidate genome in an environment.

VERIFY
    Repeat an existing result using an independent node.

VALIDATE
    Run a candidate across additional environments or seeds.

BENCHMARK
    Measure performance, memory use and execution time.
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

Results should be independently reproducible by other nodes.

## Validation

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

## Identity and wallet

Each SDK installation owns a cryptographic node identity.

```text
NodeIdentity:
    public_key
    private_key
    node_id
```

The private key remains local.

The SDK wallet supports:

```text
get_address()
get_balance()
list_transactions()
sign_result()
verify_reward()
transfer_tokens(destination, amount)
```

The SDK should not contain consensus or token-issuance logic. It communicates with the SAGI network through signed transactions.

## Rewards

Rewards may depend on:

```text
reward =
    accepted_compute
    × job_difficulty
    × verification_quality
    × reliability_factor
```

No reward is issued for:

* invalid results;
* duplicate submissions;
* jobs exceeding execution limits;
* results that fail independent verification.

## Application integration

The host application controls when compute is available.

Example game flow:

```text
game starts
SDK connects

while game is running:
    application reports available compute budget
    SDK executes jobs within that budget

game becomes performance-sensitive:
    SDK pauses compute

game returns to idle state:
    SDK resumes compute

game closes:
    SDK finishes or checkpoints current job
    SDK disconnects
```

The SDK must remain isolated from gameplay logic. SAGI jobs cannot modify game state.

## Security boundary

The trusted components are:

```text
signed SAGI job specification
verified SAGI runtime
local SDK
```

The untrusted components are:

```text
received genomes
claimed results
remote nodes
host applications
```

Every job and result must be:

* versioned;
* hashed;
* signed;
* resource-bounded;
* reproducible;
* independently verified.

## Initial SDK scope

Version 1 should contain only:

```text
network connection
node identity
wallet access
compute-budget management
signed job reception
restricted genome execution
result submission
verification jobs
reward tracking
```

It should not initially support:

```text
arbitrary user code
custom execution engines
general smart contracts
direct peer-to-peer code execution
host filesystem or network access
```



