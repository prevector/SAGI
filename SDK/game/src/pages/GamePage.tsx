import { useEffect, type CSSProperties } from "react";
import { Arena } from "../game/Arena";
import { useGameSession } from "../game/useGameSession";
import { ORANGE, TEAL } from "../game/combatantFromCandidate";

const REVEAL_HOLD_MS = 3200;

export default function GamePage() {
  const s = useGameSession();
  const winner = s.result?.winner ?? null;

  // Auto-advance to the next round a few seconds after a reveal.
  useEffect(() => {
    if (s.phase !== "reveal") return;
    const id = setTimeout(s.nextRound, REVEAL_HOLD_MS);
    return () => clearTimeout(id);
  }, [s.phase, s.nextRound]);

  return (
    <div style={styles.root}>
      <Arena visuals={s.visuals} phase={s.phase} winner={winner} />

      {/* ── Top HUD ───────────────────────────────────────────── */}
      <header style={styles.top}>
        <div style={styles.brand}>
          <span style={{ color: TEAL }}>SAGI</span> ARENA
        </div>
        <div style={styles.stats}>
          <Stat label="tokens" value={s.wallet?.tokens ?? 0} />
          <Stat label="streak" value={s.streak} accent={s.streak > 0 ? TEAL : undefined} />
          <Stat label="best" value={s.bestStreak} />
        </div>
      </header>

      {/* ── Prompt / status (center-top of the arena) ─────────── */}
      <div style={styles.prompt}>
        {s.phase === "loading" && "connecting to SAGI…"}
        {s.phase === "betting" && "WHICH ONE WINS?"}
        {s.phase === "fighting" && "scouting the network…"}
        {s.phase === "reveal" && (s.result?.won ? "CORRECT CALL" : "WRONG CALL")}
      </div>

      {/* ── Combatant labels ──────────────────────────────────── */}
      <div style={styles.labels}>
        <span style={{ color: TEAL }}>● A</span>
        <span style={{ color: ORANGE }}>B ●</span>
      </div>

      {/* ── Bottom control area ───────────────────────────────── */}
      <footer style={styles.bottom}>
        {s.phase === "betting" && (
          <div style={styles.betRow}>
            <button style={{ ...styles.betBtn, borderColor: TEAL, color: TEAL }} onClick={() => s.placeBet("a")}>
              BET&nbsp;A
            </button>
            <button style={{ ...styles.betBtn, borderColor: ORANGE, color: ORANGE }} onClick={() => s.placeBet("b")}>
              BET&nbsp;B
            </button>
          </div>
        )}

        {s.phase === "fighting" && (
          <div style={styles.fighting}>
            you backed <b style={{ color: s.picked === "a" ? TEAL : ORANGE }}>{s.picked?.toUpperCase()}</b> — fight in progress
          </div>
        )}

        {s.phase === "reveal" && (
          <div style={styles.reveal}>
            <div style={styles.revealLine}>
              winner: <b style={{ color: winner === "a" ? TEAL : ORANGE }}>{winner?.toUpperCase()}</b>
              {s.result?.won ? <span style={{ color: TEAL }}> &nbsp;+{s.result.tokens} tokens</span> : <span style={{ color: "#9fb6b6" }}> &nbsp;streak reset</span>}
            </div>
            <button style={styles.nextBtn} onClick={s.nextRound}>NEXT →</button>
          </div>
        )}
      </footer>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={styles.stat}>
      <div style={{ ...styles.statValue, color: accent ?? "#faf8f0" }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const mono = '"Geist Mono Variable", ui-monospace, monospace';

const styles: Record<string, CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    background: "#041414",
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "calc(env(safe-area-inset-top) + 14px) 18px 0",
    pointerEvents: "none",
  },
  brand: {
    fontFamily: mono,
    fontWeight: 600,
    letterSpacing: "0.12em",
    fontSize: 15,
  },
  stats: { display: "flex", gap: 18 },
  stat: { textAlign: "right" },
  statValue: { fontFamily: mono, fontSize: 18, fontWeight: 600, lineHeight: 1 },
  statLabel: { fontFamily: mono, fontSize: 9, letterSpacing: "0.14em", color: "#6e8585", textTransform: "uppercase", marginTop: 3 },
  prompt: {
    position: "absolute",
    top: "calc(env(safe-area-inset-top) + 78px)",
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: mono,
    fontSize: 13,
    letterSpacing: "0.18em",
    color: "#9fb6b6",
    textTransform: "uppercase",
    pointerEvents: "none",
  },
  labels: {
    position: "absolute",
    bottom: "calc(env(safe-area-inset-bottom) + 150px)",
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "space-between",
    padding: "0 34px",
    fontFamily: mono,
    fontSize: 13,
    letterSpacing: "0.1em",
    pointerEvents: "none",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "0 18px calc(env(safe-area-inset-bottom) + 22px)",
  },
  betRow: { display: "flex", gap: 14 },
  betBtn: {
    flex: 1,
    height: 92,
    background: "rgba(4, 20, 20, 0.6)",
    border: "2px solid",
    borderRadius: 18,
    fontFamily: mono,
    fontSize: 24,
    fontWeight: 600,
    letterSpacing: "0.08em",
    backdropFilter: "blur(6px)",
    cursor: "pointer",
  },
  fighting: {
    height: 92,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: mono,
    fontSize: 14,
    color: "#9fb6b6",
    letterSpacing: "0.06em",
  },
  reveal: {
    height: 92,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  revealLine: { fontFamily: mono, fontSize: 16, letterSpacing: "0.04em" },
  nextBtn: {
    padding: "12px 38px",
    background: "transparent",
    border: "1px solid #6e8585",
    borderRadius: 14,
    color: "#faf8f0",
    fontFamily: mono,
    fontSize: 15,
    letterSpacing: "0.12em",
    cursor: "pointer",
  },
};
