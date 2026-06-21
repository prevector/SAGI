import { type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Combatant, type Outcome } from "./Combatant";
import type { CombatantVisual } from "./combatantFromCandidate";
import { ParamBars } from "./ParamBars";
import type { CandidateParams } from "../sdk";

const ui = '"Gothic A1", system-ui, sans-serif';

interface ModelCardProps {
  visual: CombatantVisual;
  params: CandidateParams;
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

export function ModelCard({ visual, params, label, outcome, selectable, picked, dimmed, onPick }: ModelCardProps) {
  const accent = visual.color;

  return (
    <button
      type="button"
      onClick={selectable ? onPick : undefined}
      aria-label={`Model ${label}`}
      style={{
        ...styles.card,
        borderColor: picked ? accent : "var(--border)",
        // Ring on the picked card via outline (no drop shadow — DESIGN §4).
        outline: picked ? `2px solid ${accent}` : "none",
        outlineOffset: -2,
        opacity: dimmed ? 0.45 : 1,
        cursor: selectable ? "pointer" : "default",
      }}
    >
      <div
        style={{
          ...styles.canvasWrap,
          // Soft per-side tint behind the flat creature (accent at ~10% alpha).
          background: `radial-gradient(circle at 50% 45%, ${accent}1f, transparent 70%)`,
        }}
      >
        <Canvas
          dpr={[1, 1.5]}
          gl={{ antialias: true }}
          camera={{ position: [0, 0.2, 4.2], fov: 40 }}
          onCreated={({ gl }) => gl.setClearColor(new THREE.Color("#ffffff"), 0)}
        >
          <Combatant visual={visual} outcome={outcome} />
        </Canvas>
      </div>

      <div style={styles.footer}>
        <span style={{ ...styles.label, color: accent }}>● MODEL {label}</span>
        {selectable && <span style={styles.hint}>tap to pick</span>}
        {picked && !selectable && <span style={{ ...styles.hint, color: accent }}>your pick</span>}
      </div>

      <ParamBars params={params} accent={accent} />
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    padding: 0,
    overflow: "hidden",
    transition: "opacity 0.4s ease, outline-color 0.3s ease, border-color 0.3s ease",
    WebkitTapHighlightColor: "transparent",
  },
  canvasWrap: { width: "100%", aspectRatio: "4 / 3", minHeight: 0 },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderTop: "1px solid var(--border)",
  },
  label: { fontFamily: ui, fontSize: 13, fontWeight: 600, letterSpacing: "0.06em" },
  hint: { fontFamily: ui, fontSize: 10, fontWeight: 500, letterSpacing: "0.1em", color: "var(--text-muted)", textTransform: "uppercase" },
};
