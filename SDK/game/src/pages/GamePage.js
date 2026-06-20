import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { Arena } from "../game/Arena";
import { useGameSession } from "../game/useGameSession";
import { ORANGE, TEAL } from "../game/combatantFromCandidate";
const REVEAL_HOLD_MS = 3200;
export default function GamePage() {
    const s = useGameSession();
    const winner = s.result?.winner ?? null;
    // Auto-advance to the next round a few seconds after a reveal.
    useEffect(() => {
        if (s.phase !== "reveal")
            return;
        const id = setTimeout(s.nextRound, REVEAL_HOLD_MS);
        return () => clearTimeout(id);
    }, [s.phase, s.nextRound]);
    return (_jsxs("div", { style: styles.root, children: [_jsx(Arena, { visuals: s.visuals, phase: s.phase, winner: winner }), _jsxs("header", { style: styles.top, children: [_jsxs("div", { style: styles.brand, children: [_jsx("span", { style: { color: TEAL }, children: "SAGI" }), " ARENA"] }), _jsxs("div", { style: styles.stats, children: [_jsx(Stat, { label: "tokens", value: s.wallet?.tokens ?? 0 }), _jsx(Stat, { label: "streak", value: s.streak, accent: s.streak > 0 ? TEAL : undefined }), _jsx(Stat, { label: "best", value: s.bestStreak })] })] }), _jsxs("div", { style: styles.prompt, children: [s.phase === "loading" && "connecting to SAGI…", s.phase === "betting" && "WHICH ONE WINS?", s.phase === "fighting" && "scouting the network…", s.phase === "reveal" && (s.result?.won ? "CORRECT CALL" : "WRONG CALL")] }), _jsxs("div", { style: styles.labels, children: [_jsx("span", { style: { color: TEAL }, children: "\u25CF A" }), _jsx("span", { style: { color: ORANGE }, children: "B \u25CF" })] }), _jsxs("footer", { style: styles.bottom, children: [s.phase === "betting" && (_jsxs("div", { style: styles.betRow, children: [_jsx("button", { style: { ...styles.betBtn, borderColor: TEAL, color: TEAL }, onClick: () => s.placeBet("a"), children: "BET\u00A0A" }), _jsx("button", { style: { ...styles.betBtn, borderColor: ORANGE, color: ORANGE }, onClick: () => s.placeBet("b"), children: "BET\u00A0B" })] })), s.phase === "fighting" && (_jsxs("div", { style: styles.fighting, children: ["you backed ", _jsx("b", { style: { color: s.picked === "a" ? TEAL : ORANGE }, children: s.picked?.toUpperCase() }), " \u2014 fight in progress"] })), s.phase === "reveal" && (_jsxs("div", { style: styles.reveal, children: [_jsxs("div", { style: styles.revealLine, children: ["winner: ", _jsx("b", { style: { color: winner === "a" ? TEAL : ORANGE }, children: winner?.toUpperCase() }), s.result?.won ? _jsxs("span", { style: { color: TEAL }, children: [" \u00A0+", s.result.tokens, " tokens"] }) : _jsx("span", { style: { color: "#9fb6b6" }, children: " \u00A0streak reset" })] }), _jsx("button", { style: styles.nextBtn, onClick: s.nextRound, children: "NEXT \u2192" })] }))] })] }));
}
function Stat({ label, value, accent }) {
    return (_jsxs("div", { style: styles.stat, children: [_jsx("div", { style: { ...styles.statValue, color: accent ?? "#faf8f0" }, children: value }), _jsx("div", { style: styles.statLabel, children: label })] }));
}
const mono = '"Geist Mono Variable", ui-monospace, monospace';
const styles = {
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
