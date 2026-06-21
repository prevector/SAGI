import styles from "./ComputeForecast.module.css";

/**
 * Global AI compute by region, 2025–2031 (GW), default scenario.
 * Source: Europe 2031 compute forecast (europe2031.ai).
 * Lightweight inline SVG — no chart dep — so the marketing bundle stays small.
 * Europe is emphasised (pink, heavier) as the "left behind" line.
 */
interface Series {
  name: string;
  data: number[];
  color: string;
  width: number;
  emphasis?: boolean;
}

const YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031];
const MAX_GW = 400;

const SERIES: Series[] = [
  { name: "World", data: [22, 44, 80, 147, 207, 300, 372], color: "var(--brown-900)", width: 2.5 },
  { name: "United States", data: [17, 34, 60, 104, 147, 208, 255], color: "var(--brown-300)", width: 2 },
  { name: "China", data: [2, 5, 9, 18, 28, 44, 55], color: "var(--blue-500)", width: 2 },
  { name: "Europe", data: [1, 3, 5, 11, 13, 16, 21], color: "var(--pink-500)", width: 3, emphasis: true },
  { name: "Rest of world", data: [1, 3, 6, 11, 17, 28, 38], color: "var(--blue-300)", width: 2 },
];

// SVG user-space geometry (scales responsively via viewBox).
const VIEW_W = 1000;
const VIEW_H = 380;
const L = 56;
const R = 980;
const T = 12;
const B = 336;
const GRID = [0, 100, 200, 300, 400];

const xAt = (i: number) => L + (i / (YEARS.length - 1)) * (R - L);
const yAt = (v: number) => B - (v / MAX_GW) * (B - T);

export function ComputeForecast() {
  return (
    <figure className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>Global AI compute by region</h3>
        <p className={styles.caption}>Gigawatts (GW) · default scenario, 2025–2031 · source: europe2031.ai</p>
      </div>

      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="Line chart of AI compute capacity in gigawatts by region, 2025 to 2031. World and the United States rise steeply while Europe stays a thin line near the bottom, around 21 gigawatts by 2031."
      >
        {GRID.map((g) => (
          <g key={g}>
            <line
              x1={L}
              x2={R}
              y1={yAt(g)}
              y2={yAt(g)}
              stroke={g === 0 ? "var(--gray-200)" : "var(--gray-100)"}
              strokeWidth={1}
            />
            <text x={L - 10} y={yAt(g) + 4} textAnchor="end" className={styles.axis}>
              {g} GW
            </text>
          </g>
        ))}

        {YEARS.map((yr, i) => (
          <text key={yr} x={xAt(i)} y={B + 24} textAnchor="middle" className={styles.axis}>
            {yr}
          </text>
        ))}

        {SERIES.map((s) => {
          const points = s.data.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
          const last = s.data.length - 1;
          return (
            <g key={s.name}>
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx={xAt(last)} cy={yAt(s.data[last])} r={s.emphasis ? 4.5 : 3.5} fill={s.color} />
            </g>
          );
        })}
      </svg>

      <ul className={styles.legend}>
        {SERIES.map((s) => (
          <li key={s.name} className={styles.legendItem}>
            <span className={styles.swatch} style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </li>
        ))}
      </ul>
    </figure>
  );
}
