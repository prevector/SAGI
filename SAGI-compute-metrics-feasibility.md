# SAGI Compute Metrics (top-right bar) — Browser Feasibility & Approach

Reference for the compute-metrics widget (CPU + GPU specs and realtime usage %). Companion to `IMPLEMENTATION_PLAN_COMPUTE_METRICS.md`.

## Verdict
- **Realtime CPU/GPU utilization %: NOT available to a web app** (Windows or Mac, any major browser) — by design (privacy/fingerprinting + security). No web API exposes system CPU% or GPU%.
- **Specs: partial.** CPU = logical core count only (`navigator.hardwareConcurrency`); no model/clock. GPU = model often readable in Chrome via WebGL `UNMASKED_RENDERER_WEBGL` or WebGPU `adapter.info`, but **inconsistent/blocked on Safari and Firefox** (and deliberately minimized for privacy); no VRAM/clock.
- **Closest to CPU%:** the **Compute Pressure API** — Chromium desktop only (Safari/WebKit opposes it; Firefox doesn't ship it) — and it returns **coarse states** (`nominal`/`fair`/`serious`/`critical`), **not a percentage**, **CPU-only** (no GPU source).
- **GPU utilization:** no API at all, anywhere.
- ⇒ **True realtime % requires the SAGI native agent** running on the machine. Browser-only can show specs (best-effort) + a coarse CPU pressure indicator.

## Why (the limits, briefly)
- Compute Pressure API: states not %, CPU-only, Chromium-only; the spec intentionally avoids exposing utilization (calls raw CPU% "misleading").
- GPU model: WebGL unmasked renderer is full in Chrome but disabled by Firefox `resistFingerprinting` and generic in Safari; WebGPU `adapter.info` is minimized (vendor/architecture, rarely the exact model).
- Main-thread "busyness" proxies (rAF/timer jitter) measure *your tab's* contention, not the system — crude and misleading.

## Tiered approach (one seam, swappable)
A `ComputeMetricsSource` with three implementations:
- **`mock`** — fabricated specs + animated fake % (for showcasing; see the implementation plan).
- **`browser`** — best-effort: `hardwareConcurrency` (cores) + GPU string (WebGL/WebGPU) + coarse CPU pressure (Chromium). No true %.
- **`agent`** — real specs + real % from the SAGI client. Windows: NVML (NVIDIA) or the Windows "GPU Engine" performance counters (what Task Manager uses; covers AMD/Intel) + PDH for CPU. macOS: `powermetrics` (needs sudo) or the undocumented **IOReport/IOKit** APIs for no-sudo Apple-Silicon monitoring. Cross-platform helpers: `systeminformation` (Node), `all-smi` (Rust).

**Recommendation:** lead with **contribution throughput** (evals/sec, offspring evaluated) — meaningful, OS-agnostic, privacy-clean, and known exactly by the client — and show CPU/GPU % as a secondary readout.

## Capability probe (paste into devtools to see what a given browser exposes)
```js
(async () => {
  const out = { ua: navigator.userAgent, cores: navigator.hardwareConcurrency ?? null,
                deviceMemoryGB: navigator.deviceMemory ?? null };
  try { const gl = document.createElement('canvas').getContext('webgl');
        const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
        out.webglVendor   = d ? gl.getParameter(d.UNMASKED_VENDOR_WEBGL)   : 'blocked';
        out.webglRenderer = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'blocked';
  } catch (e) { out.webgl = 'err:' + e.message; }
  try { if (navigator.gpu) { const a = await navigator.gpu.requestAdapter();
          out.webgpu = a ? { vendor:a.info?.vendor, architecture:a.info?.architecture,
                             device:a.info?.device, description:a.info?.description } : 'no adapter';
        } else out.webgpu = 'unavailable'; } catch (e) { out.webgpu = 'err:' + e.message; }
  out.computePressure = ('PressureObserver' in globalThis);
  out.pressureSources = (globalThis.PressureObserver && PressureObserver.knownSources) || null;
  console.log('SAGI capability probe', out); return out;
})();
```

## Widget spec (shared by all tiers)
Small Geist Mono rows in the top-right bar; % shown as a bar length + numeric label (**colourblind: never hue alone**); ~1 Hz updates; pause when the tab is hidden; `prefers-reduced-motion` fallback (static numbers). Degradation order: agent % → browser CPU-pressure → cores + GPU model → "metrics unavailable."
