import { useId } from "react";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  tone?: "teal" | "orange";
  /** Mark the last point so the trend end is readable without colour. */
  showEndDot?: boolean;
}

const TONES = {
  teal: "var(--accent)",
  orange: "var(--accent-2)"
} as const;

/** Zero-dependency sparkline (hand-rolled SVG) for full colorblind control. */
export function Sparkline({
  values,
  width = 120,
  height = 36,
  tone = "teal",
  showEndDot = true
}: SparklineProps) {
  const gradId = useId();
  if (values.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const stepX = (width - pad * 2) / (values.length - 1);
  const toY = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / span);

  const points = values.map((v, i) => [pad + i * stepX, toY(v)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height - pad} L${pad},${height - pad} Z`;
  const [endX, endY] = points[points.length - 1];
  const color = TONES[tone];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showEndDot ? <circle cx={endX} cy={endY} r={2.4} fill={color} /> : null}
    </svg>
  );
}
