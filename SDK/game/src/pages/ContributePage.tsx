import { useState, type CSSProperties } from "react";
import { ModelCard } from "../game/ModelCard";
import { type Outcome } from "../game/Combatant";
import { useContribute } from "../game/useContribute";

const TEAL = "#17c4c4";
const ORANGE = "#f0783d";
const PAPER = "#faf8f0";
const mono = '"Geist Mono Variable", ui-monospace, monospace';
const sans = '"Geist Variable", ui-sans-serif, system-ui, sans-serif';

const SNIPPET = `// the entire SDK integration — one file, four calls
const task = await sdk.requestTask(userId);          // two candidate models
await sdk.submitSignal(task.task_id, userId, "a");   // your judgment = a signal
const result = await sdk.getSignalResult(betId);     // settled vs. the network
// result.won → tokens credited to the contributor`;

export default function ContributePage() {
  const s = useContribute();
  const [showCode, setShowCode] = useState(false);

  // Per-card outcome: idle while choosing, gentle pulse while settling,
  // brighten the network's pick / dim the other on the result.
  const outcomeFor = (side: "a" | "b"): Outcome => {
    if (s.phase === "evaluating") return "fighting";
    if (s.phase === "result" && s.result?.winner) return s.result.winner === side ? "win" : "lose";
    return "idle";
  };

  const winner = s.result?.winner ?? null;
  const matched = s.result?.won === true;

  return (
    <div style={styles.root}>
      {/* ── Header: the SDK is the headline ─────────────────────── */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={{ color: TEAL }}>SAGI</span>
          <span style={styles.poweredBy}>powered by the SAGI SDK</span>
        </div>
        <div style={styles.readout}>
          <Stat label="signals" value={s.contributed} accent={TEAL} />
          <Stat label="tokens" value={s.wallet?.tokens ?? 0} accent={ORANGE} />
        </div>
      </header>

      {/* ── Prompt ──────────────────────────────────────────────── */}
      <div style={styles.promptWrap}>
        <div style={styles.prompt}>Which model performs better?</div>
        <div style={styles.sub}>
          {s.phase === "loading" && "loading a pair from the network…"}
          {s.phase === "choosing" && "Your judgment becomes a signal the network can't cheaply produce."}
          {s.phase === "evaluating" && "settling your signal against the network…"}
          {s.phase === "result" &&
            (matched
              ? `Your call matched the network · +${s.result?.tokens} tokens`
              : "The network ranked the other model higher · +0")}
        </div>
      </div>

      {/* ── The two models ──────────────────────────────────────── */}
      <main style={styles.cards}>
        {s.visuals ? (
          <>
            <ModelCard
              visual={s.visuals.a}
              label="A"
              outcome={outcomeFor("a")}
              selectable={s.phase === "choosing"}
              picked={s.picked === "a"}
              dimmed={s.phase === "result" && winner !== "a"}
              onPick={() => s.choose("a")}
            />
            <ModelCard
              visual={s.visuals.b}
              label="B"
              outcome={outcomeFor("b")}
              selectable={s.phase === "choosing"}
              picked={s.picked === "b"}
              dimmed={s.phase === "result" && winner !== "b"}
              onPick={() => s.choose("b")}
            />
          </>
        ) : (
          <div style={styles.placeholder}>connecting to SAGI…</div>
        )}
      </main>

      {/* ── Footer control ──────────────────────────────────────── */}
      <footer style={styles.footer}>
        {s.phase === "result" ? (
          <button style={{ ...styles.primaryBtn, borderColor: TEAL, color: TEAL }} onClick={s.next}>
            NEXT PAIR →
          </button>
        ) : (
          <div style={styles.footerHint}>
            {s.phase === "evaluating" ? "settling…" : "tap the model you think is stronger"}
          </div>
        )}

        <button style={styles.codeToggle} onClick={() => setShowCode((v) => !v)}>
          {showCode ? "▾ hide the integration" : "▸ see the integration"}
        </button>
        {showCode && <pre style={styles.code}>{SNIPPET}</pre>}
      </footer>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={styles.stat}>
      <div style={{ ...styles.statValue, color: accent }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    background: "#041414",
    color: PAPER,
    overflow: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "calc(env(safe-area-inset-top) + 16px) 20px 0",
  },
  brand: { display: "flex", flexDirection: "column", gap: 3 },
  poweredBy: { fontFamily: mono, fontSize: 10, letterSpacing: "0.16em", color: "#6e8585", textTransform: "uppercase" },
  readout: { display: "flex", gap: 22 },
  stat: { textAlign: "right" },
  statValue: { fontFamily: mono, fontSize: 20, fontWeight: 600, lineHeight: 1 },
  statLabel: { fontFamily: mono, fontSize: 9, letterSpacing: "0.14em", color: "#6e8585", textTransform: "uppercase", marginTop: 3 },
  promptWrap: { textAlign: "center", padding: "22px 24px 10px" },
  prompt: { fontFamily: sans, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" },
  sub: { fontFamily: mono, fontSize: 12, letterSpacing: "0.04em", color: "#9fb6b6", marginTop: 8, minHeight: 16 },
  cards: {
    flex: 1,
    display: "flex",
    gap: 16,
    padding: "8px 20px",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 760,
    margin: "0 auto",
    minHeight: 0,
  },
  placeholder: { fontFamily: mono, fontSize: 13, color: "#6e8585" },
  footer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "8px 20px calc(env(safe-area-inset-bottom) + 20px)",
  },
  primaryBtn: {
    padding: "14px 44px",
    background: "rgba(4,20,20,0.6)",
    border: "2px solid",
    borderRadius: 16,
    fontFamily: mono,
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: "0.1em",
    cursor: "pointer",
  },
  footerHint: {
    height: 50,
    display: "flex",
    alignItems: "center",
    fontFamily: mono,
    fontSize: 12,
    letterSpacing: "0.06em",
    color: "#6e8585",
    textTransform: "uppercase",
  },
  codeToggle: {
    background: "transparent",
    border: "none",
    color: "#6e8585",
    fontFamily: mono,
    fontSize: 11,
    letterSpacing: "0.1em",
    cursor: "pointer",
    padding: 4,
  },
  code: {
    width: "100%",
    maxWidth: 620,
    margin: 0,
    padding: "14px 16px",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(23,196,196,0.15)",
    borderRadius: 12,
    fontFamily: mono,
    fontSize: 11.5,
    lineHeight: 1.6,
    color: "#cfe0e0",
    overflowX: "auto",
    whiteSpace: "pre",
  },
};
