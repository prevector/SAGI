// SAGI website — single scroll. The swarm is a live dashboard; the SDK is the pitch.

import { type CSSProperties } from "react";
import { Swarm } from "../components/Swarm";
import { useNetworkStats } from "../components/useNetworkStats";

const TEAL = "#17C4C4";
const ORANGE = "#F0783D";
const PAPER = "#FAF8F0";
const MUTED = "#9FB6B6";
const FAINT = "#6E8585";
const BG = "#041414";
const mono = "var(--font-mono, ui-monospace, monospace)";
const sans = "var(--font-sans, ui-sans-serif, system-ui, sans-serif)";

const CONTRIBUTE_URL = import.meta.env.VITE_CONTRIBUTE_URL ?? "http://localhost:5174";

const SEAM = `import * as sagi from "@sagi/sdk";

// 1 · ask the network for work
const task = await sagi.requestTask(userId);

// 2 · send your app's human signal
await sagi.submitSignal(task.task_id, userId, choice);

// 3 · the network settles it & credits tokens
const { won, tokens } = await sagi.getSignalResult(betId);`;

export default function WebsitePage() {
  const { nodes, stats, pulsingIds } = useNetworkStats();
  const deviceCount = nodes.filter((n) => n.id !== "core").length;

  return (
    <div style={styles.page}>
      {/* ── Hero: the network, alive ───────────────────────────── */}
      <section style={styles.hero}>
        <div style={styles.canvasLayer}>
          <Swarm nodes={nodes} pulsingIds={pulsingIds} style={{ width: "100%", height: "100%" }} />
        </div>

        <div style={styles.heroTopBar}>
          <span style={styles.wordmark}>SAGI</span>
          <span style={styles.liveChip}>
            <span style={styles.liveDot} /> LIVE NETWORK
          </span>
        </div>

        <div style={styles.heroCenter}>
          <h1 style={styles.tagline}>Search for AGI, together.</h1>
          <p style={styles.subtagline}>
            A distributed network of devices and apps contributing compute and human judgment —
            and earning tokens for it.
          </p>
        </div>

        <div style={styles.dashboard}>
          <DashCard label="devices in swarm" value={deviceCount} accent={TEAL} />
          <DashCard label="signals contributed" value={stats.votes} accent={TEAL} />
          <DashCard label="tokens awarded" value={stats.tokens_awarded} accent={ORANGE} />
        </div>

        <div style={styles.scrollHint}>↓ how it plugs in</div>
      </section>

      {/* ── SDK pitch ──────────────────────────────────────────── */}
      <section style={styles.pitch}>
        <div style={styles.pitchInner}>
          <div style={styles.kicker}>THE SDK</div>
          <h2 style={styles.h2}>Any app can feed the network.</h2>
          <p style={styles.lead}>
            Passive compute attracts a small crowd. But some of the most valuable training signal
            isn't compute — it's <em>human judgment</em>. The SAGI SDK lets developers plug any app
            into the network: your users contribute their input, the network rewards it in tokens,
            and the better your app's signal, the more tokens it earns.
          </p>

          <div style={styles.flywheel}>
            <FlyStep n="01" title="Plug in" body="Drop the SDK into your app — one file, four calls." />
            <FlyStep n="02" title="Contribute" body="Your users' input becomes signal the network can't cheaply produce." />
            <FlyStep n="03" title="Earn" body="The network settles each signal and credits tokens to your app." />
          </div>

          <div style={styles.codeBlock}>
            <div style={styles.codeHeader}>the entire integration</div>
            <pre style={styles.code}>{SEAM}</pre>
          </div>

          <div style={styles.ctaRow}>
            <a href={CONTRIBUTE_URL} style={styles.ctaPrimary}>
              See an app built on the SDK →
            </a>
            <span style={styles.ctaNote}>a live example contributing to the swarm above</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function DashCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={styles.dashCard}>
      <div style={{ ...styles.dashValue, color: accent }}>{value.toLocaleString()}</div>
      <div style={styles.dashLabel}>{label}</div>
    </div>
  );
}

function FlyStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={styles.flyStep}>
      <div style={styles.flyNum}>{n}</div>
      <div style={styles.flyTitle}>{title}</div>
      <div style={styles.flyBody}>{body}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { background: BG, color: PAPER, minHeight: "100vh", width: "100%" },

  // hero
  hero: { position: "relative", height: "100vh", minHeight: 560, overflow: "hidden" },
  canvasLayer: { position: "absolute", inset: 0 },
  heroTopBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 2,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "22px 32px",
    background: "linear-gradient(180deg, rgba(4,20,20,0.85) 0%, transparent 100%)",
    pointerEvents: "none",
  },
  wordmark: { fontFamily: sans, fontSize: 22, fontWeight: 700, letterSpacing: "0.14em" },
  liveChip: {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontFamily: mono, fontSize: 10, letterSpacing: "0.18em", color: MUTED,
    border: "1px solid rgba(23,196,196,0.25)", borderRadius: 999, padding: "5px 11px",
  },
  liveDot: {
    width: 6, height: 6, borderRadius: "50%", background: TEAL,
    boxShadow: `0 0 6px ${TEAL}`, animation: "sagi-pulse 2s ease-out infinite",
  },
  heroCenter: {
    position: "absolute", top: "50%", left: 0, right: 0, transform: "translateY(-50%)",
    zIndex: 2, textAlign: "center", padding: "0 24px", pointerEvents: "none",
  },
  tagline: { fontFamily: sans, fontSize: "clamp(32px, 6vw, 60px)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0, textShadow: "0 2px 40px rgba(4,20,20,0.9)" },
  subtagline: { fontFamily: sans, fontSize: "clamp(14px, 2vw, 18px)", color: MUTED, maxWidth: 540, margin: "16px auto 0", lineHeight: 1.5, textShadow: "0 1px 20px rgba(4,20,20,0.9)" },
  dashboard: {
    position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
    display: "flex", gap: "clamp(16px, 5vw, 56px)", justifyContent: "center",
    padding: "32px 24px 40px",
    background: "linear-gradient(0deg, rgba(4,20,20,0.94) 0%, transparent 100%)",
    pointerEvents: "none",
  },
  dashCard: { textAlign: "center" },
  dashValue: { fontFamily: mono, fontSize: "clamp(24px, 5vw, 34px)", fontWeight: 700, lineHeight: 1 },
  dashLabel: { fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", color: FAINT, textTransform: "uppercase", marginTop: 7 },
  scrollHint: {
    position: "absolute", bottom: 12, left: 0, right: 0, zIndex: 3, textAlign: "center",
    fontFamily: mono, fontSize: 10, letterSpacing: "0.18em", color: FAINT, textTransform: "uppercase",
  },

  // pitch
  pitch: { padding: "clamp(64px, 12vw, 140px) 24px", borderTop: "1px solid rgba(23,196,196,0.1)" },
  pitchInner: { maxWidth: 760, margin: "0 auto" },
  kicker: { fontFamily: mono, fontSize: 11, letterSpacing: "0.22em", color: TEAL, marginBottom: 16 },
  h2: { fontFamily: sans, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 },
  lead: { fontFamily: sans, fontSize: "clamp(15px, 2vw, 18px)", color: MUTED, lineHeight: 1.65, margin: "20px 0 0" },

  flywheel: { display: "flex", flexWrap: "wrap", gap: 20, margin: "44px 0" },
  flyStep: { flex: "1 1 180px", borderTop: `2px solid ${TEAL}`, paddingTop: 16 },
  flyNum: { fontFamily: mono, fontSize: 12, color: FAINT, letterSpacing: "0.1em" },
  flyTitle: { fontFamily: sans, fontSize: 18, fontWeight: 600, margin: "8px 0 6px" },
  flyBody: { fontFamily: sans, fontSize: 14, color: MUTED, lineHeight: 1.5 },

  codeBlock: { border: "1px solid rgba(23,196,196,0.18)", borderRadius: 14, overflow: "hidden", background: "rgba(0,0,0,0.35)" },
  codeHeader: { fontFamily: mono, fontSize: 10, letterSpacing: "0.16em", color: FAINT, textTransform: "uppercase", padding: "12px 18px", borderBottom: "1px solid rgba(23,196,196,0.12)" },
  code: { margin: 0, padding: "18px 20px", fontFamily: mono, fontSize: "clamp(11px, 1.6vw, 13px)", lineHeight: 1.7, color: "#cfe0e0", overflowX: "auto", whiteSpace: "pre" },

  ctaRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginTop: 40 },
  ctaPrimary: {
    display: "inline-block", fontFamily: mono, fontSize: 15, letterSpacing: "0.04em",
    color: BG, background: TEAL, textDecoration: "none", fontWeight: 600,
    padding: "14px 26px", borderRadius: 14,
  },
  ctaNote: { fontFamily: mono, fontSize: 12, color: FAINT, letterSpacing: "0.04em" },
};
