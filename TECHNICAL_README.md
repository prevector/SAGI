# SAGI Technical README

This document is the implementation brief for a TypeScript version of:

- [Network of Evolvable Neural Units: Evolving to Learn at a Synaptic Level](https://arxiv.org/abs/1912.07589)

It is intentionally a design document, not an implementation. The goal is to capture the paper's important technical structure, note what your Python MVP already explored, and define a TypeScript-first plan for building the next version cleanly.

## Scope

We want to implement the paper's core idea:

- evolve a shared neuron update rule
- evolve a shared synapse update rule
- give every neuron and every synapse its own private state
- let learning happen through local state dynamics during an episode
- optimize the shared rules with Evolution Strategies rather than backpropagation through time

We do not want to start with the entire paper at full fidelity. The first TypeScript target should be a faithful but staged implementation that preserves the paper's shape.

## Paper Core

Based on the paper, the essential model is:

- an Evolvable Neural Unit, or ENU, is a recurrent local processor with internal memory
- there is one shared ENU parameter set for neuron compartments
- there is one shared ENU parameter set for synapse compartments
- every neuron and synapse has unique internal state, even though parameters are shared
- synaptic plasticity is stored in synapse state, not in fixed network weights
- reward is part of the local signal flow
- the outer optimization loop evolves the shared parameters with Evolution Strategies

The key result in the paper is not just task performance. It is that local dynamics can evolve to produce:

- integrate-and-fire-like behavior
- STDP-like synaptic behavior
- reinforcement-like adaptation in a T-maze

This is the part worth preserving.

## ENU Structure

From the paper, the ENU is a gated recurrent unit with:

- update gate
- reset gate
- cell gate
- output gate
- internal memory state
- multi-channel input and output vectors

Important design properties:

- the memory state is the dynamic parameter store
- the output can be fed back into future processing
- clipping is allowed because optimization is evolutionary, not gradient-based
- multiple channels are not cosmetic, they are part of the representational flexibility

For the TypeScript implementation, the practical interpretation is:

- each ENU instance owns a `state: Float32Array`
- each ENU update consumes an `input: Float32Array`
- the shared rule parameters define how that state is updated
- the ENU emits an `output: Float32Array`

## Network Structure

The paper's ENU network has:

- neuron ENUs that act like soma or axon compartments
- synapse ENUs that act like dendrite or synaptic compartments
- a connection structure that broadcasts neuron output into synapse computations
- an integration step that sums incoming synapse outputs per neuron
- recurrent rollout over multiple time steps

The important distinction from a conventional neural net is this:

- the network's long-lived intelligence is not mainly stored in a big weight matrix
- the shared rules define how neurons and synapses behave
- the per-unit private state defines what they currently know inside an episode

That means the TypeScript system should treat the network as a population of local state machines, not as a standard dense layer stack.

## Optimization Loop

The paper uses Evolution Strategies because:

- the objective is not directly differentiable
- learning unfolds over long sequences
- local plasticity is the point, so backprop through the episode is not the intended mechanism

Important paper details:

- Gaussian perturbations around a center genome
- approximate gradient from fitness evaluations
- fitness ranking to reduce outlier effects
- batch multiple environments per offspring
- weight sharing keeps the evolved parameter space relatively small

For the TypeScript implementation, the first version should use:

- antithetic sampling
- centered ranks or linear rank shaping
- a simple SGD or Adam-style optimizer on the genome center
- parallel evaluation across candidates and episodes

## What Your Python MVP Already Proved

Your existing Python work in [../es/experiments/evolved_learning_rule_mvp/README.md](/Users/tim/Code/es/experiments/evolved_learning_rule_mvp/README.md:1) already established useful constraints.

The Python MVP intentionally simplified the paper by using:

- token prediction instead of embodied control
- MLP-like local update rules instead of explicit GRU-like ENUs
- a single message channel per synapse
- direct vectorized evaluation in MLX

That work is still valuable because it clarified:

- how to structure shared neuron and synapse rules
- how to batch ES candidates and episodes
- how to treat within-episode remapping as the thing that forces actual learning
- what runtime and debugging pressure points will matter in practice

The most useful retained ideas from the Python MVP are:

- explicit genome specification
- clear separation between shared parameters and dynamic per-episode state
- family-based held-out evaluation
- logging position-wise accuracy, not just aggregate reward or accuracy

## TypeScript Architecture

The cleanest TypeScript layout is:

```text
packages/
  core/
    math/
    genome/
    enu/
    network/
    es/
    tasks/
    metrics/
  viz/
    timelines/
    state-views/
    overlays/
apps/
  lab/
    ui/
    api/
```

Suggested package roles:

- `core/math`: tensor-free numeric helpers built on `Float32Array`
- `core/genome`: flatten, unflatten, mutate, serialize shared rule parameters
- `core/enu`: ENU update equations and state containers
- `core/network`: neuron-synapse rollout and sparse connectivity
- `core/es`: candidate generation, rank shaping, center updates
- `core/tasks`: IAF, STDP, T-maze, and simpler debug tasks
- `core/metrics`: episode fitness, transfer metrics, logging summaries
- `viz`: all visual representations of state and learning
- `apps/lab`: the interactive dashboard and experiment runner UI

## Runtime Strategy

Keep the first implementation simple:

- run training in Node, not the browser
- use `Float32Array` and explicit loops first
- add worker threads before adding any GPU abstraction
- use deterministic seeds everywhere

Reason:

- the core difficulty is correctness of local-state dynamics
- GPU abstraction too early will hide bugs in indexing, layout, and reset logic
- TypeScript can handle this if the first version is sparse and disciplined

Later upgrades:

- worker-thread population evaluation
- WebAssembly kernels if profiling justifies it
- optional GPU backend only after the reference CPU path is trusted

## Implementation Phases

### Phase 1

Build the minimum paper-shaped core:

- genome spec for shared neuron and synapse parameters
- explicit ENU cell with gated memory
- sparse neuron/synapse network rollout
- deterministic reset semantics
- ES loop with antithetic perturbations

### Phase 2

Match the paper's controlled subproblems:

- evolve IAF-like behavior
- evolve STDP-like behavior

These are critical because they validate the local dynamics before the full task.

### Phase 3

Add a simple learning task:

- first a symbolic or token-memory task
- then a grid or T-maze analogue

This lets you preserve the paper's structure while keeping debugging manageable.

### Phase 4

Add transfer and robustness evaluation:

- task remapping per episode
- held-out variants
- state probes
- trajectory logging

## Data Structures

The implementation should be explicit about memory ownership.

Recommended shapes:

- neuron shared params: one flattened genome block
- synapse shared params: one flattened genome block
- neuron state: `[numNeurons][neuronStateSize]`
- neuron output: `[numNeurons][numChannels]`
- synapse state: `[numSynapses][synapseStateSize]`
- synapse output: `[numSynapses][numChannels]`
- connectivity: sparse edge list, not dense adjacency, unless profiling proves otherwise

Do not hide these behind a heavy tensor abstraction at the start.

## Non-Negotiable Technical Requirements

These are the parts that must stay true if the implementation is going to count as a real continuation of the paper:

- neuron parameters are shared across all neurons
- synapse parameters are shared across all synapses
- neurons and synapses each keep private evolving internal state
- learning during an episode happens through local state updates
- the outer loop evolves the shared rules, not a conventional task-trained weight matrix

If any of those disappear, the project turns into something adjacent but different.

## Visual Instrumentation

The system should expose learning as a visible process, not only as a scalar fitness curve.

The most useful visual surfaces are:

- synapse-state heatmaps over time
- neuron memory channel traces
- reward-channel propagation timelines
- pre/post spike alignment views for STDP experiments
- action-selection traces for T-maze episodes
- population fitness distributions across ES candidates
- lineage history of center genomes across generations

The visual goal is not “pretty charts”. It is to make local learning dynamics legible.

## Visual Direction

Based on your reference image, the right aesthetic is:

- dark instrument panel
- phosphor green and amber accents
- grid and wireframe overlays
- discrete tiles for units, channels, or memory cells
- visible labels for memory, recall, dissolve, reward, transfer, state
- noisy, living, signal-processing feel rather than clean SaaS cards

The UI should look like:

- a biological computation lab
- an organism debugger
- a console for watching learning crystallize

Not like:

- a generic AI dashboard
- a fintech analytics product
- a smooth pastel admin panel

## First Technical Deliverable

Before writing the main TypeScript implementation, the first serious engineering target should be:

1. ENU cell spec
2. genome layout spec
3. rollout semantics spec
4. one tiny deterministic debug environment
5. logging and replay format

That will prevent the project from turning into a pile of clever animation around underspecified learning dynamics.

## Recommended Next Step

Do not start with the full T-maze.

Start with this sequence:

1. TypeScript ENU cell and genome serialization
2. IAF mimic task
3. STDP mimic task
4. tiny remapped symbolic memory task
5. only then a spatial environment

That is the shortest path to a real reproduction rather than a vague homage.

## Sources

- Paper abstract and structure: [arXiv abstract](https://arxiv.org/abs/1912.07589)
- Readable HTML version used for technical interpretation: [ar5iv HTML](https://ar5iv.labs.arxiv.org/html/1912.07589)
- Existing Python MVP reference: [../es/experiments/evolved_learning_rule_mvp/README.md](/Users/tim/Code/es/experiments/evolved_learning_rule_mvp/README.md:1)
- Existing Python training loop: [../es/experiments/evolved_learning_rule_mvp/train_evolved_learning_rule.py](/Users/tim/Code/es/experiments/evolved_learning_rule_mvp/train_evolved_learning_rule.py:1)
