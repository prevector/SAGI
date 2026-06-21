import { useEffect, useMemo, useState } from "react";
import type { MockPoint, TrainingMode, TrainingStatus } from "./state";
import styles from "./GeneTerminal.module.css";

export function shortId(id: string): string {
  return id.slice(0, 10);
}

export function numberInput(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

export function Readout({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}) {
  return (
    <div className={styles.readoutCell}>
      <b className={tone ? styles[tone] : ""}>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(nextDraft: string) {
    const parsed = Number(nextDraft);
    const safeValue = numberInput(parsed, value);
    const clamped = Math.max(min, Math.min(max, safeValue));
    const rounded = step >= 1 ? Math.round(clamped) : clamped;
    setDraft(String(rounded));
    onChange(rounded);
  }

  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function MockChart({
  history,
  mode
}: {
  history: MockPoint[];
  mode: TrainingMode;
}) {
  const width = 620;
  const height = 220;
  const padLeft = 46;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 24;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const bounds = useMemo(() => {
    if (mode === "language") {
      return {
        yMin: -0.05,
        yMax: 1.05,
        levels: [0, 0.25, 0.5, 0.75, 1],
        formatter: (value: number) => `${Math.round(value * 100)}%`,
        field: "accuracy" as const,
        bestField: "bestAccuracy" as const
      };
    }
    const values = history.flatMap((point) => [point.score, point.bestScore]);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const padding = Math.max(0.4, (max - min) * 0.12);
    const yMin = min - padding;
    const yMax = max + padding;
    const levels = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4);
    return {
      yMin,
      yMax,
      levels,
      formatter: (value: number) => value.toFixed(1),
      field: "score" as const,
      bestField: "bestScore" as const
    };
  }, [history, mode]);

  function projectAccuracy(value: number): number {
    const normalized = (value - bounds.yMin) / Math.max(bounds.yMax - bounds.yMin, 1e-6);
    return height - padBottom - normalized * chartHeight;
  }

  function projectX(index: number): number {
    return padLeft + (index / Math.max(history.length - 1, 1)) * chartWidth;
  }

  function accuracyLine(key: "accuracy" | "bestAccuracy" | "score" | "bestScore") {
    return history
      .map((item, index) => {
        const x = projectX(index);
        const y = projectAccuracy(item[key]);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <svg className={styles.mockChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={mode === "language" ? "Accuracy over training iterations" : "Score over training iterations"}>
      {bounds.levels.map((level) => {
        const y = projectAccuracy(level);
        return (
          <g key={level}>
            <line x1={padLeft} x2={width - padRight} y1={y} y2={y} className={styles.gridLine} />
            <text x={padLeft - 8} y={y + 4} textAnchor="end" className={styles.chartAxisLabel}>
              {bounds.formatter(level)}
            </text>
          </g>
        );
      })}
      <line x1={padLeft} x2={padLeft} y1={padTop} y2={height - padBottom} className={styles.chartAxisLine} />
      <path d={accuracyLine(bounds.bestField)} className={styles.sampledLine} />
      <path d={accuracyLine(bounds.field)} className={styles.accuracyLine} />
    </svg>
  );
}
