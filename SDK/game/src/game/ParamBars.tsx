import { type CSSProperties } from "react";
import type { CandidateParams } from "../sdk";

const mono = '"Geist Mono Variable", ui-monospace, monospace';

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
  wrap: { padding: "12px 16px 14px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid rgba(23,196,196,0.1)" },
  head: { fontFamily: mono, fontSize: 9, letterSpacing: "0.16em", color: "#6e8585", textTransform: "uppercase", marginBottom: 2 },
  row: { display: "flex", alignItems: "center", gap: 10 },
  label: { fontFamily: mono, fontSize: 11, color: "#9fb6b6", flex: "0 0 116px", whiteSpace: "nowrap" },
  track: { flex: 1, height: 6, borderRadius: 999, background: "rgba(23,196,196,0.12)", overflow: "hidden" },
  fill: { display: "block", height: "100%", borderRadius: 999, transition: "width 0.4s ease" },
  value: { fontFamily: mono, fontSize: 12, fontWeight: 600, flex: "0 0 22px", textAlign: "right" },
};
