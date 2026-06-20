// HUD — a DOM overlay (not canvas) so text stays crisp and selectable. Geist
// Mono throughout; every status carries an icon + label, never colour alone
// (PLAN-TRAIN-ANIM §6). Colours come from tokens.css via CSS variables.

import type { CSSProperties } from "react";
import type { PopulationStats } from "../sim/types";
import type { SessionStatus } from "../config";

interface HudProps {
  stats: PopulationStats;
  status: SessionStatus;
  fps: number;
  showFps?: boolean;
  /** 0..1 — when > 0, show the breakthrough badge (C4). */
  breakthrough?: number;
}

const STATUS_META: Record<SessionStatus, { marker: string; label: string; color: string }> = {
  queued: { marker: "●", label: "queued", color: "var(--text-muted)" },
  running: { marker: "▶", label: "evolving", color: "var(--accent)" },
  completed: { marker: "✓", label: "completed", color: "var(--accent)" },
  failed: { marker: "✕", label: "failed", color: "var(--negative)" },
};

const wrap: CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "var(--s4, 16px)",
  fontFamily: "var(--font-mono)",
  fontSize: "var(--fs-sm, 0.8125rem)",
  color: "var(--text-muted)",
  fontVariantNumeric: "tabular-nums",
};

const stat: CSSProperties = { display: "flex", gap: 6, whiteSpace: "nowrap" };
const value: CSSProperties = { color: "var(--text)" };

export function Hud({ stats, status, fps, showFps = false, breakthrough = 0 }: HudProps) {
  const meta = STATUS_META[status];
  return (
    <div style={wrap} aria-hidden="true">
      {/* top row: status chip + breakthrough badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ ...stat, color: meta.color }}>
          <span aria-hidden>{meta.marker}</span>
          <span>{meta.label}</span>
        </span>
        {breakthrough > 0.01 ? (
          <span style={{ ...stat, color: "var(--accent-2)" }}>
            <span aria-hidden>▲</span>
            <span>breakthrough</span>
          </span>
        ) : null}
      </div>

      {/* bottom row: the live readouts */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end" }}>
        <span style={stat}>
          gen <b style={value}>{stats.generation}</b>
        </span>
        <span style={stat}>
          best <b style={value}>{stats.bestFitness.toFixed(3)}</b>
        </span>
        <span style={stat}>
          pop <b style={value}>{stats.populationSize}</b>
        </span>
        <span style={stat}>
          <b style={value}>{Math.round(stats.evaluationsPerSec)}</b> eval/s
        </span>
        {showFps ? (
          <span style={{ ...stat, marginLeft: "auto", color: "var(--text-faint)" }}>{fps} fps</span>
        ) : null}
      </div>
    </div>
  );
}
