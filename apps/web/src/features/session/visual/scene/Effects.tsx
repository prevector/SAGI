// Post-processing: selective Bloom for the neon glow + a Vignette + faint film
// grain, per DESIGN.md §5 ("selective bloom in teal/orange; one signature
// moment; everything else quiet"). Bloom is selective by luminance: only
// materials whose emissive color exceeds the threshold glow, so the matte
// near-black stage stays dark while the creature / path / exit shine.

import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { VISUAL_CONFIG } from "../config";

interface EffectsProps {
  /** Disable heavy passes (reduced-motion / low-power path). */
  enabled?: boolean;
}

export function Effects({ enabled = true }: EffectsProps) {
  if (!enabled) return null;
  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom
        intensity={0.9}
        luminanceThreshold={1.0} // only emissive-boosted (glow()) materials bloom
        luminanceSmoothing={0.2}
        mipmapBlur={VISUAL_CONFIG.perf.bloomMipmapBlur}
      />
      <Vignette eskil={false} offset={0.25} darkness={0.85} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={0.025} />
    </EffectComposer>
  );
}
