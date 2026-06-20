# IAF Reproduction

The closer TypeScript reproduction is:

- `experiments/enu_iaf_reproduction.ts`

The original exploratory benchmark remains:

- `experiments/enu_iaf_benchmark.ts`

## Reference Mapping

The reproduction follows the Python implementation in `implementation_paper/code`:

- `IAFEnv.py`: graded input, threshold `0.5`, reset after a spike, timing loss
- `EvolvableNeuralUnitStacked.py`: one output, recurrent output feedback, reset bias, scaled gates, clipped output
- `Optimizers.py`: antithetic mutations, rank weighting, momentum update

Important reproduced details:

- one output channel for the IAF experiment
- zero-initialized bias weights
- `sigmoid(3x)` and `tanh(3x)`
- reset gate uses `sigmoid(3 * (x - 1))`
- IAF spike output uses `clip(1000 * output, 0, 1)`
- every candidate in a generation sees the same environment batch

The full 32-state genome has `3393` parameters.

## Step-By-Step Checks

### 1. Objective diagnostics

```bash
npm run experiment:iaf:reproduce -- --mode diagnostics --memory-size 4
```

Expected:

- oracle loss: `0`
- silent output: very large loss
- always-spiking output: much better than silence, but worse than the oracle

This exposes the main paper-loss basin: evolution can first discover continuous spiking before learning correct timing.

### 2. Optimizer diagnostic

```bash
npm run experiment:iaf:reproduce -- --mode optimizer --generations 100
```

The ES optimizer moved a 16-dimensional vector from fitness `-16` to approximately `-0.001`.

### 3. Dense memory diagnostic

```bash
npm run experiment:iaf:reproduce -- \
  --mode train \
  --task potential \
  --output-gain 1 \
  --memory-size 4 \
  --generations 300 \
  --population-pairs 64 \
  --sigma 0.05
```

Observed held-out MSE:

- seed 17: `0.352` to `0.080`
- seed 29: `0.432` to `0.078`

This confirms that the recurrent ENU and ES loop can evolve accumulator-like memory.

### 4. Reduced spike experiment

```bash
npm run experiment:iaf:reproduce -- \
  --mode train \
  --task iaf \
  --memory-size 4 \
  --generations 300 \
  --population-pairs 64 \
  --sigma 0.05
```

One seed improved held-out paper loss from `22.37` to `12.61`. Other seeds converged to the always-spiking basin.

### 5. Full-cell smoke test

```bash
npm run experiment:iaf:reproduce -- \
  --mode train \
  --memory-size 32 \
  --generations 20 \
  --population-pairs 16 \
  --environments 4 \
  --sigma 0.02
```

The full cell escaped silence and reached the always-spiking basin within five generations. This verifies execution and search movement, but it is not a paper-scale reproduction.

## Current Conclusion

The optimizer works, recurrent memory learns on a dense target, and reduced IAF runs can improve spike timing. The remaining reproduction gap is scale: the Python experiment uses 512 offspring, 32 environments per offspring, CUDA batching, and thousands of generations. The local TypeScript runs use much smaller populations and therefore enter the easy always-spiking basin more often.

All summaries are written under:

- `runs/enu_iaf_reproduction/`
