import { useState, type CSSProperties } from "react";
import { ModelCard } from "../game/ModelCard";
import { type Outcome } from "../game/Combatant";
import { useContribute } from "../game/useContribute";

// Warm editorial palette (mirrors tokens.css; inline styles need literals).
const BLUE = "#3C7FA8"; // --blue-500, signals
const PINK = "#C04B6E"; // --pink-700, tokens (the reward — loudest)
const ACCENT = "#F5C5CE"; // --pink-300, primary button fill
const INK = "#2E2118"; // --brown-900, text + button label
const BODY = "#3E2A18"; // --brown-700
const MUTED = "#5C6B7A"; // --gray-500
const BORDER = "#D6D9DC"; // --gray-200
const display = '"Cormorant", Georgia, serif';
const sans = '"Gothic A1", system-ui, sans-serif';
const ui = sans;
const mono = "ui-monospace, monospace";

const SNIPPET = `// the entire SDK integration — one file, four calls
const task = await sdk.requestTask(userId);          // two candidate models
await sdk.submitSignal(task.task_id, userId, "a");   // your judgment = a signal
const result = await sdk.getSignalResult(betId);     // settled vs. the network
// result.won → tokens credited to the contributor`;

export default function ContributePage() {
  const s = useContribute();
  const [showCode, setShowCode] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

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
          <span style={styles.wordmark}>SAGI</span>
          <button style={styles.infoBtn} onClick={() => setShowIntro(true)}>
            ⓘ what is this?
          </button>
        </div>
        <div style={styles.readout}>
          <Stat label="signals" value={s.contributed} accent={BLUE} />
          <Stat label="tokens" value={s.wallet?.tokens ?? 0} accent={PINK} />
        </div>
      </header>

      {/* ── Prompt ──────────────────────────────────────────────── */}
      <div style={styles.promptWrap}>
        <div style={styles.prompt}>Which model performs better?</div>
        <div style={styles.sub}>
          {s.phase === "loading" && "loading a pair from the network…"}
          {s.phase === "choosing" && "Read the spec — a richer update rule usually performs better. You make the call."}
          {s.phase === "evaluating" && "settling your signal against the network…"}
          {s.phase === "result" &&
            (matched
              ? `Right call — Model ${winner?.toUpperCase()} performed better · +${s.result?.tokens} tokens`
              : `The network ranked Model ${winner?.toUpperCase()} higher this time · +0`)}
        </div>
      </div>

      {/* ── The two models ──────────────────────────────────────── */}
      <main style={styles.cards}>
        {s.visuals && s.task ? (
          <>
            <ModelCard
              visual={s.visuals.a}
              params={s.task.a.params}
              label="A"
              outcome={outcomeFor("a")}
              selectable={s.phase === "choosing"}
              picked={s.picked === "a"}
              dimmed={s.phase === "result" && winner !== "a"}
              onPick={() => s.choose("a")}
            />
            <ModelCard
              visual={s.visuals.b}
              params={s.task.b.params}
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
          <button style={styles.primaryBtn} onClick={s.next}>
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

      {/* ── First-run explainer (reopen via "what is this?") ─────── */}
      {showIntro && (
        <div style={styles.introScrim} onClick={() => setShowIntro(false)}>
          <div style={styles.introCard} onClick={(e) => e.stopPropagation()}>
            <p style={styles.introEyebrow}>powered by the SAGI SDK</p>
            <h2 style={styles.introTitle}>Add value to the search for AGI</h2>
            <p style={styles.introLead}>
              SAGI is a distributed network searching for better AI — together. Here&apos;s how you
              help in three taps.
            </p>
            <ol style={styles.introList}>
              <li>
                <strong style={styles.introStrong}>Read the spec.</strong> Each model shows its architecture. A richer
                <strong style={styles.introStrong}> update rule</strong> — and more neuron types — tends to perform better.
              </li>
              <li>
                <strong style={styles.introStrong}>Make the call.</strong> Tap the model you think is stronger. It&apos;s a
                judgement, not a lookup — the specs hint, they don&apos;t guarantee.
              </li>
              <li>
                <strong style={styles.introStrong}>Earn tokens.</strong> The network evaluates both against ground truth; an
                accurate call credits tokens to you.
              </li>
            </ol>
            <button style={styles.startBtn} onClick={() => setShowIntro(false)}>
              Start contributing →
            </button>
          </div>
        </div>
      )}
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
    background: "#F5F0EA",
    color: INK,
    overflow: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "calc(env(safe-area-inset-top) + 16px) 20px 0",
  },
  brand: { display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start" },
  wordmark: { fontFamily: sans, fontSize: 18, fontWeight: 800, letterSpacing: "0.14em", color: INK },
  infoBtn: {
    background: "transparent",
    border: "none",
    padding: 0,
    fontFamily: ui,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.06em",
    color: MUTED,
    cursor: "pointer",
  },
  readout: { display: "flex", gap: 22 },
  stat: { textAlign: "right" },
  statValue: { fontFamily: sans, fontSize: 22, fontWeight: 800, lineHeight: 1 },
  statLabel: { fontFamily: ui, fontSize: 9, fontWeight: 500, letterSpacing: "0.12em", color: MUTED, textTransform: "uppercase", marginTop: 3 },
  promptWrap: { textAlign: "center", padding: "22px 24px 10px" },
  prompt: { fontFamily: sans, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: INK },
  sub: { fontFamily: display, fontSize: 16, color: MUTED, marginTop: 8, minHeight: 18, lineHeight: 1.4 },
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
  placeholder: { fontFamily: ui, fontSize: 13, color: MUTED },
  footer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: "8px 20px calc(env(safe-area-inset-bottom) + 20px)",
  },
  primaryBtn: {
    padding: "13px 40px",
    background: ACCENT,
    border: "none",
    borderRadius: 999,
    fontFamily: ui,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: INK,
    cursor: "pointer",
  },
  footerHint: {
    height: 50,
    display: "flex",
    alignItems: "center",
    fontFamily: ui,
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: "0.04em",
    color: MUTED,
    textTransform: "uppercase",
  },
  codeToggle: {
    background: "transparent",
    border: "none",
    color: MUTED,
    fontFamily: ui,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: "0.06em",
    cursor: "pointer",
    padding: 4,
  },
  code: {
    width: "100%",
    maxWidth: 620,
    margin: 0,
    padding: "14px 16px",
    background: INK,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    fontFamily: mono,
    fontSize: 11.5,
    lineHeight: 1.6,
    color: "#E4D8C8",
    overflowX: "auto",
    whiteSpace: "pre",
  },

  // First-run explainer overlay.
  introScrim: {
    position: "fixed",
    inset: 0,
    zIndex: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    background: "rgba(46,33,24,0.55)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  },
  introCard: {
    width: "100%",
    maxWidth: 400,
    background: "#FFFFFF",
    border: `1px solid ${BORDER}`,
    borderRadius: 22,
    padding: "28px 26px",
  },
  introEyebrow: {
    fontFamily: display,
    fontStyle: "normal",
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: "0.01em",
    color: PINK,
    margin: "0 0 10px",
  },
  introTitle: {
    fontFamily: sans,
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    margin: 0,
    color: INK,
  },
  introLead: {
    fontFamily: display,
    fontSize: 16,
    lineHeight: 1.5,
    color: MUTED,
    margin: "12px 0 18px",
  },
  introList: {
    margin: "0 0 22px",
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    fontFamily: display,
    fontSize: 16,
    lineHeight: 1.45,
    color: BODY,
  },
  introStrong: { color: INK, fontWeight: 600 },
  startBtn: {
    width: "100%",
    padding: "14px 0",
    background: ACCENT,
    color: INK,
    border: "none",
    borderRadius: 999,
    fontFamily: ui,
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: "0.02em",
    cursor: "pointer",
  },
};
