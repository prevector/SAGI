import { type CSSProperties } from "react";
import type { CandidateParams } from "../sdk";

const ui = '"Gothic A1", system-ui, sans-serif';

// The visible genome we're checking — explicitly NOT how well it performs.
const ROWS: { key: "neuronParams" | "synapseStateParams" | "layers" | "neuronTypes" | "updateComplexity"; label: string }[] = [
  { key: "neuronParams", label: "Params / neuron" },
  { key: "synapseStateParams", label: "Synapse state" },
  { key: "layers", label: "Layers" },
  { key: "neuronTypes", label: "Neuron types" },
  { key: "updateComplexity", label: "Update rule" },
];

export function ParamBars({ params, accent }: { params: CandidateParams; accent: string }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.head}>parameters · 1–50</div>
      {ROWS.map((r) => {
        const v = params[r.key];
        return (
          <div key={r.key} style={styles.row}>
            <span style={styles.label}>{r.label}</span>
            <span style={styles.track}>
              <span style={{ ...styles.fill, width: `${(v / 50) * 100}%`, background: accent }} />
            </span>
            <span style={{ ...styles.value, color: accent }}>{v}</span>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: { padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid var(--border)" },
  head: { fontFamily: ui, fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 },
  row: { display: "flex", alignItems: "center", gap: 10 },
  label: { fontFamily: ui, fontSize: 11, fontWeight: 500, color: "var(--text-muted)", flex: "0 0 116px", whiteSpace: "nowrap" },
  track: { flex: 1, height: 6, borderRadius: 999, background: "var(--brown-100)", overflow: "hidden" },
  fill: { display: "block", height: "100%", borderRadius: 999, transition: "width 0.4s ease" },
  value: { fontFamily: ui, fontSize: 12, fontWeight: 700, flex: "0 0 22px", textAlign: "right" },
};
