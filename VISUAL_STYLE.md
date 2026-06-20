# SAGI Visual Style

This is the visual direction for the learning-system UI.

## Theme

The product should feel like an instrument for observing learning, mutation, memory, and reward flow in real time.

Primary references:

- terminal diagnostics
- synthetic biology lab interfaces
- old simulation overlays
- organism debugger aesthetics
- signal-processing monitors

The screenshot reference is useful because it gets several things right:

- tiled symbolic units
- visible state labels
- layered overlays
- high contrast between organism and diagnostic UI
- learning shown as transformation, not just metrics

## Look

- background: near-black with deep blue or green atmospheric glow
- accents: phosphor green, hot orange, occasional electric blue
- typography: mono for diagnostics, expressive grotesk for headings
- geometry: grids, wireframes, scanlines, orbit traces, tiles
- motion: dissolve, pulse, route, accumulate, spike, crystallize

## Surfaces To Build

- organism grid: each tile is a unit, channel, or memory cell
- reward routing map: where positive and negative signal traveled
- synapse field: live heatmap of dynamic synapse state
- memory trace: what was retained, overwritten, recalled
- population panel: candidate genomes competing by fitness
- episode replay: step-by-step learning trace inside a single run

## Anti-Patterns

Avoid:

- normal BI dashboards
- generic “AI gradient blob” illustrations
- glass cards and bland charts
- tidy but empty card grids
- hiding the interesting state behind a summary score

## Copy Tone

Labels should sound like instrumentation:

- `recall`
- `trace`
- `drift`
- `synapse state`
- `reward pulse`
- `energy`
- `dissolving`
- `stabilized`
- `transfer`

Do not overexplain the visuals inline. The interface should look technical first, then reveal detail on interaction.
