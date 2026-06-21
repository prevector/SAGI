import { type CSSProperties } from "react";
import type { CandidateParams } from "../sdk";

const ui = '"Gothic A1", system-ui, sans-serif';
const MUTED = "#5C6B7A";
const INK = "#2E2118";
const TRACK = "rgba(46,33,24,0.10)";
const BORDER = "rgba(46,33,24,0.10)";

// The architecture spec the contributor reads to judge. `cue: true` marks the row
// that drives performance most (the update rule) — the teachable signal.
const ROWS: { key: "neuronParams" | "synapseStateParams" | "layers" | "neuronTypes" | "updateComplexity"; label: string; cue?: boolean }[] = [
  { key: "updateComplexity", label: "Update rule", cue: true },
  { key: "neuronTypes", label: "Neuron types" },
  { key: "neuronParams", label: "Params / neuron" },
  { key: "synapseStateParams", label: "Synapse state" },
  { key: "layers", label: "Layers" },
];

// Each row stacks label + value over a full-width bar, so it stays legible inside a
// narrow phone-width card (a single inline row of label + bar + value gets crushed).
export function ParamBars({ params, accent }: { params: CandidateParams; accent: string }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.head}>architecture spec · 1–50</div>
      {ROWS.map((r) => {
        const v = params[r.key];
        return (
          <div key={r.key} style={styles.row}>
            <div style={styles.rowTop}>
              <span style={{ ...styles.label, ...(r.cue ? styles.cueLabel : null) }}>
                {r.cue ? "★ " : ""}{r.label}
              </span>
              <span style={{ ...styles.value, color: accent }}>{v}</span>
            </div>
            <span style={styles.track}>
              <span style={{ ...styles.fill, width: `${(v / 50) * 100}%`, background: accent }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9, borderTop: `1px solid ${BORDER}` },
  head: { fontFamily: ui, fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", color: MUTED, textTransform: "uppercase", marginBottom: 2 },
  row: { display: "flex", flexDirection: "column", gap: 4 },
  rowTop: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  label: { fontFamily: ui, fontSize: 11, fontWeight: 500, color: MUTED, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cueLabel: { color: INK, fontWeight: 700 },
  value: { fontFamily: ui, fontSize: 12.5, fontWeight: 800, flex: "0 0 auto" },
  track: { display: "block", width: "100%", height: 5, borderRadius: 999, background: TRACK, overflow: "hidden" },
  fill: { display: "block", height: "100%", borderRadius: 999, transition: "width 0.4s ease" },
};
