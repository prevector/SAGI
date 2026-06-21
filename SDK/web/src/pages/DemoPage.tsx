// Pitch demo — the money shot. A phone running the contribute app (an app built
// on the SDK) sits next to the live network swarm. Tap a judgement on the phone
// and, within a poll, the swarm fires an orange HUMAN SIGNAL burst and the
// counters tick. Self-contained: the iframe app and this page share the mock
// network, so the linkage is real, not faked.

import { useEffect, useState, type CSSProperties } from "react";
import { Swarm } from "../components/Swarm";
import { useNetworkStats } from "../components/useNetworkStats";

const TEAL = "#17C4C4";
const ORANGE = "#F0783D";
const PAPER = "#FAF8F0";
const MUTED = "#9FB6B6";
const FAINT = "#6E8585";
const mono = 'var(--font-mono, "Geist Mono Variable", ui-monospace, monospace)';
const sans = 'var(--font-sans, "Geist Variable", ui-sans-serif, system-ui, sans-serif)';

const CONTRIBUTE_URL = import.meta.env.VITE_CONTRIBUTE_URL ?? "http://localhost:5174";

const STEPS = [
  { n: "01", t: "A judgement", b: "Someone taps the model they think is stronger. That tap is a signal the network can’t cheaply produce." },
  { n: "02", t: "The network settles it", b: "It’s scored against ground truth; an accurate call credits tokens to the contributor." },
  { n: "03", t: "The swarm lights up", b: "Every human signal ripples through the network in real time — the orange flash." },
];

export default function DemoPage() {
  const { nodes, stats, pulsingIds, humanPulseIds, humanBurst } = useNetworkStats();
  const deviceCount = nodes.filter((n) => n.id !== "core").length;
  const humanSignals = stats.human_signals ?? 0;

  const [pop, setPop] = useState(false);
  const [toast, setToast] = useState<{ tokens: number } | null>(null);
  useEffect(() => {
    if (!humanBurst) return;
    setPop(true);
    setToast({ tokens: humanBurst.tokens });
    const p = setTimeout(() => setPop(false), 220);
    const t = setTimeout(() => setToast(null), 3200);
    return () => {
      clearTimeout(p);
      clearTimeout(t);
    };
  }, [humanBurst?.id]);

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <span style={styles.wordmark}>SAGI</span>
        <span style={styles.liveChip}>
          <span style={styles.liveDot} /> LIVE DEMO
        </span>
      </div>

      <div style={styles.stage}>
        {/* ── Left: the phone ─────────────────────────────────── */}
        <div style={styles.phoneCol}>
          <div style={styles.phone}>
            <div style={styles.notch} />
            <iframe
              title="An app built on the SAGI SDK"
              src={CONTRIBUTE_URL}
              style={styles.screen}
              allow="autoplay"
            />
          </div>
          <p style={styles.phoneCaption}>An app built on the SAGI SDK</p>
        </div>

        {/* ── Middle: the hand-off ────────────────────────────── */}
        <div style={styles.handoff}>
          <span style={styles.handoffLabel}>every signal</span>
          <span style={styles.handoffArrow}>→</span>
        </div>

        {/* ── Right: the live network ─────────────────────────── */}
        <div style={styles.swarmCol}>
          <Swarm
            nodes={nodes}
            pulsingIds={pulsingIds}
            humanPulseIds={humanPulseIds}
            style={{ position: "absolute", inset: 0 }}
          />

          <div style={styles.swarmHeader}>
            <p style={styles.eyebrow}>How value enters the network</p>
            <div style={styles.steps}>
              {STEPS.map((s) => (
                <div key={s.n} style={styles.step}>
                  <span style={styles.stepNum}>{s.n}</span>
                  <span style={styles.stepText}>
                    <strong style={styles.stepTitle}>{s.t}</strong>
                    {s.b}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {toast && (
            <div style={styles.toast}>
              ⚡ Human signal
              {toast.tokens > 0 && <strong style={{ color: ORANGE }}>{` · +${toast.tokens} tokens`}</strong>}
            </div>
          )}

          <div style={styles.dashboard}>
            <Stat label="devices" value={deviceCount} accent={TEAL} />
            <Stat label="signals" value={stats.votes} accent={TEAL} />
            <Stat label="human signals" value={humanSignals} accent={ORANGE} big pop={pop} />
            <Stat label="tokens" value={stats.tokens_awarded} accent={ORANGE} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  big,
  pop,
}: {
  label: string;
  value: number;
  accent: string;
  big?: boolean;
  pop?: boolean;
}) {
  return (
    <div style={styles.stat}>
      <div
        style={{
          ...styles.statValue,
          color: accent,
          fontSize: big ? 38 : 26,
          fontWeight: big ? 800 : 700,
          textShadow: big ? `0 0 22px ${ORANGE}66` : "none",
          transform: pop ? "scale(1.22)" : "scale(1)",
          transition: "transform 160ms ease",
        }}
      >
        {value.toLocaleString()}
      </div>
      <div style={{ ...styles.statLabel, color: big ? ORANGE : FAINT }}>{label}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    position: "fixed",
    inset: 0,
    background: "radial-gradient(circle at 70% 40%, #06201f, #041414 70%)",
    color: PAPER,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 32px",
    flex: "0 0 auto",
  },
  wordmark: { fontFamily: sans, fontSize: 22, fontWeight: 700, letterSpacing: "0.14em" },
  liveChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontFamily: mono,
    fontSize: 10,
    letterSpacing: "0.18em",
    color: MUTED,
    border: "1px solid rgba(23,196,196,0.25)",
    borderRadius: 999,
    padding: "5px 11px",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: TEAL,
    boxShadow: `0 0 6px ${TEAL}`,
    animation: "sagi-pulse 2s ease-out infinite",
  },

  stage: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(16px, 3vw, 44px)",
    padding: "0 clamp(16px, 3vw, 40px) 32px",
  },

  // phone
  phoneCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, flex: "0 0 auto" },
  phone: {
    position: "relative",
    width: 348,
    height: "min(740px, 78vh)",
    background: "#0a0f0f",
    borderRadius: 46,
    padding: 12,
    border: "1px solid rgba(23,196,196,0.18)",
    boxShadow: "0 40px 120px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(0,0,0,0.6)",
  },
  notch: {
    position: "absolute",
    top: 18,
    left: "50%",
    transform: "translateX(-50%)",
    width: 120,
    height: 26,
    background: "#0a0f0f",
    borderRadius: 16,
    zIndex: 2,
  },
  screen: {
    width: "100%",
    height: "100%",
    border: "none",
    borderRadius: 34,
    background: "#041414",
    display: "block",
  },
  phoneCaption: {
    fontFamily: mono,
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: FAINT,
    margin: 0,
  },

  // hand-off
  handoff: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto" },
  handoffLabel: { fontFamily: mono, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: FAINT },
  handoffArrow: { fontSize: 26, color: TEAL },

  // swarm panel
  swarmCol: {
    position: "relative",
    flex: 1,
    alignSelf: "stretch",
    borderRadius: 24,
    overflow: "hidden",
    border: "1px solid rgba(23,196,196,0.12)",
    minWidth: 0,
  },
  swarmHeader: { position: "absolute", top: 0, left: 0, right: 0, padding: "26px 28px 0", zIndex: 2, pointerEvents: "none" },
  eyebrow: {
    fontFamily: mono,
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: TEAL,
    margin: "0 0 16px",
  },
  steps: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 },
  step: { display: "flex", gap: 12, alignItems: "flex-start" },
  stepNum: { fontFamily: mono, fontSize: 12, color: FAINT, paddingTop: 2, flex: "0 0 auto" },
  stepText: { fontFamily: sans, fontSize: 13.5, lineHeight: 1.5, color: MUTED, textShadow: "0 1px 16px rgba(4,20,20,0.9)" },
  stepTitle: { display: "block", color: PAPER, fontWeight: 600, fontSize: 14 },

  toast: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 3,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 22px",
    borderRadius: 999,
    background: "rgba(240,120,61,0.16)",
    border: "1px solid rgba(240,120,61,0.6)",
    boxShadow: "0 0 50px rgba(240,120,61,0.45)",
    fontFamily: mono,
    fontSize: 14,
    letterSpacing: "0.04em",
    color: PAPER,
    whiteSpace: "nowrap",
  },

  dashboard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    display: "flex",
    gap: "clamp(16px, 4vw, 48px)",
    justifyContent: "center",
    alignItems: "flex-end",
    padding: "28px 24px 30px",
    background: "linear-gradient(0deg, rgba(4,20,20,0.94) 0%, transparent 100%)",
    pointerEvents: "none",
  },
  stat: { textAlign: "center" },
  statValue: { fontFamily: mono, lineHeight: 1 },
  statLabel: { fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 7 },
};
