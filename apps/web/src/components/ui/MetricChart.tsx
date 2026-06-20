import { useId } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { Domain } from "@sagi/shared";
import styles from "./MetricChart.module.css";

export interface ChartSeries {
  key: string;
  label: string;
  points: Domain.TimeseriesPoint[];
  tone?: "teal" | "orange";
  /** Dashed line — a non-colour signal to distinguish a second series. */
  dash?: boolean;
}

interface MetricChartProps {
  series: ChartSeries[];
  height?: number;
  valueFormat?: (n: number) => string;
}

const TONE_VAR = { teal: "var(--accent)", orange: "var(--accent-2)" } as const;

/** Merge aligned series onto a shared time axis keyed by ISO timestamp. */
type Row = Record<string, number | string>;

function mergeRows(series: ChartSeries[]): Row[] {
  const byTime = new Map<string, Row>();
  for (const s of series) {
    for (const p of s.points) {
      const row: Row = byTime.get(p.t) ?? { t: p.t };
      row[s.key] = p.v;
      byTime.set(p.t, row);
    }
  }
  return [...byTime.values()].sort((a, b) => String(a.t).localeCompare(String(b.t)));
}

export function MetricChart({ series, height = 200, valueFormat }: MetricChartProps) {
  const titleId = useId();
  const data = mergeRows(series);
  const lastIndex = data.length - 1;
  const fmt = valueFormat ?? ((n: number) => n.toLocaleString());

  return (
    <figure className={styles.figure} aria-labelledby={titleId}>
      <figcaption id={titleId} className={styles.srOnly}>
        {series.map((s) => s.label).join(", ")}
      </figcaption>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 64, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="t" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--fs-mono)",
              color: "var(--text)"
            }}
            labelFormatter={(t) => new Date(String(t)).toLocaleString()}
            formatter={(value: number, name: string) => [fmt(value), name]}
          />
          {series.map((s) => {
            const color = TONE_VAR[s.tone ?? "teal"];
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color}
                strokeWidth={2}
                strokeDasharray={s.dash ? "5 4" : undefined}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
                label={({ x, y, index }: { x?: number; y?: number; index?: number }) =>
                  index === lastIndex && typeof x === "number" && typeof y === "number" ? (
                    <text x={x + 6} y={y} dy={4} fill={color} className={styles.endLabel}>
                      {s.label}
                    </text>
                  ) : (
                    <g />
                  )
                }
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}
