import type { EvolutionGene } from "@sagi/evolution";
import type { MockPoint, TrainingStatus } from "./state";
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
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(numberInput(Number(event.target.value), value))}
      />
    </label>
  );
}

export function CreatureGlyph({
  gene,
  status,
  generation
}: {
  gene: EvolutionGene;
  status: TrainingStatus;
  generation: number;
}) {
  const nodes = Array.from({ length: 18 }, (_, index) => {
    const weight = gene.weights[index % gene.weights.length] ?? 0;
    const angle = index * 0.92 + generation * 0.015;
    const radius = 38 + Math.abs(weight) * 40 + (index % 4) * 9;
    return {
      x: 160 + Math.cos(angle) * radius,
      y: 125 + Math.sin(angle * 1.17) * radius * 0.62,
      pulse: Math.abs(Math.sin(angle))
    };
  });

  return (
    <svg className={styles.creature} viewBox="0 0 320 250" role="img" aria-label="Mock creature visualization">
      <rect x="1" y="1" width="318" height="248" />
      {nodes.map((node, index) => (
        <line
          key={`link-${index}`}
          x1="160"
          y1="125"
          x2={node.x}
          y2={node.y}
          className={styles.creatureLink}
        />
      ))}
      {nodes.map((node, index) => (
        <circle
          key={index}
          cx={node.x}
          cy={node.y}
          r={3 + node.pulse * 4}
          className={status === "running" ? styles.creatureNodeActive : styles.creatureNode}
        />
      ))}
      <circle cx="160" cy="125" r="13" className={styles.creatureCore} />
    </svg>
  );
}

export function MockChart({ history }: { history: MockPoint[] }) {
  const width = 620;
  const height = 220;
  const pad = 20;
  const values = history.flatMap((item) => [item.selectedLoss, item.sampledLoss]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-6);

  function line(key: "selectedLoss" | "sampledLoss") {
    return history
      .map((item, index) => {
        const x = pad + (index / Math.max(history.length - 1, 1)) * (width - pad * 2);
        const y = height - pad - ((item[key] - min) / span) * (height - pad * 2);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <svg className={styles.mockChart} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Mock training chart">
      {[0.25, 0.5, 0.75, 1].map((level) => {
        const y = height - pad - level * (height - pad * 2);
        return <line key={level} x1={pad} x2={width - pad} y1={y} y2={y} className={styles.gridLine} />;
      })}
      <path d={line("sampledLoss")} className={styles.sampledLine} />
      <path d={line("selectedLoss")} className={styles.selectedLine} />
    </svg>
  );
}
