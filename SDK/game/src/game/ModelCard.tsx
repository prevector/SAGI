import { type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { Combatant, type Outcome } from "./Combatant";
import type { CombatantVisual } from "./combatantFromCandidate";

const BG = "#041414";
const mono = '"Geist Mono Variable", ui-monospace, monospace';

interface ModelCardProps {
  visual: CombatantVisual;
  label: "A" | "B";
  outcome: Outcome;
  /** clickable (only during the choosing phase) */
  selectable: boolean;
  /** this card is the one the user picked */
  picked: boolean;
  /** dim this card (the other model after a result) */
  dimmed: boolean;
  onPick: () => void;
}

export function ModelCard({ visual, label, outcome, selectable, picked, dimmed, onPick }: ModelCardProps) {
  const accent = visual.color;
  const border = picked ? accent : "rgba(23,196,196,0.14)";

  return (
    <button
      type="button"
      onClick={selectable ? onPick : undefined}
      aria-label={`Model ${label}`}
      style={{
        ...styles.card,
        borderColor: border,
        boxShadow: picked ? `0 0 0 1px ${accent}, 0 0 32px -8px ${accent}` : "none",
        opacity: dimmed ? 0.42 : 1,
        cursor: selectable ? "pointer" : "default",
      }}
    >
      <div style={styles.canvasWrap}>
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
          camera={{ position: [0, 0.2, 4.2], fov: 40 }}
          onCreated={({ gl }) => gl.setClearColor(new THREE.Color(BG), 0)}
        >
          <ambientLight intensity={0.2} color={accent} />
          <pointLight position={[2, 3, 4]} intensity={3} color="#faf8f0" distance={20} decay={2} />
          <Combatant visual={visual} outcome={outcome} />
          <EffectComposer enableNormalPass={false}>
            <Bloom intensity={1.1} luminanceThreshold={1.0} luminanceSmoothing={0.25} mipmapBlur />
            <Vignette eskil={false} offset={0.35} darkness={0.7} />
          </EffectComposer>
        </Canvas>
      </div>

      <div style={styles.footer}>
        <span style={{ ...styles.label, color: accent }}>● MODEL {label}</span>
        {selectable && <span style={styles.hint}>tap to pick</span>}
        {picked && !selectable && <span style={{ ...styles.hint, color: accent }}>your pick</span>}
      </div>
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    background: "rgba(4, 20, 20, 0.5)",
    border: "1px solid",
    borderRadius: 18,
    padding: 0,
    overflow: "hidden",
    transition: "opacity 0.4s ease, box-shadow 0.3s ease, border-color 0.3s ease",
    WebkitTapHighlightColor: "transparent",
  },
  canvasWrap: { width: "100%", aspectRatio: "1 / 1", minHeight: 0 },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderTop: "1px solid rgba(23,196,196,0.1)",
  },
  label: { fontFamily: mono, fontSize: 13, fontWeight: 600, letterSpacing: "0.1em" },
  hint: { fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color: "#6e8585", textTransform: "uppercase" },
};
