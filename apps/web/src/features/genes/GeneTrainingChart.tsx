import type { TrainingGeneration } from "@sagi/evolution";
import styles from "./GeneTrainingChart.module.css";

interface GeneTrainingChartProps {
  history: TrainingGeneration[];
}

const WIDTH = 760;
const HEIGHT = 190;
const PAD = 28;

function pathFor(values: number[], min: number, max: number): string {
  const span = Math.max(max - min, 1e-9);
  return values
    .map((value, index) => {
      const x = PAD + (index / Math.max(values.length - 1, 1)) * (WIDTH - PAD * 2);
      const y = HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function GeneTrainingChart({ history }: GeneTrainingChartProps) {
  if (history.length < 2) {
    return (
      <div className={styles.empty}>
        <span>Start training to see loss over generations.</span>
      </div>
    );
  }

  const losses = history.map((item) => item.loss);
  const bestLosses: number[] = [];
  let best = Number.POSITIVE_INFINITY;
  for (const loss of losses) {
    best = Math.min(best, loss);
    bestLosses.push(best);
  }

  const min = Math.min(...losses, ...bestLosses);
  const max = Math.max(...losses, ...bestLosses);
  const latest = history[history.length - 1];
  const bestNow = bestLosses[bestLosses.length - 1];

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <b>Training loss</b>
          <span>{history.length - 1} generations</span>
        </div>
        <div className={styles.legend}>
          <span><i className={styles.lossMark} /> current {latest.loss.toFixed(4)}</span>
          <span><i className={styles.bestMark} /> best {bestNow.toFixed(4)}</span>
        </div>
      </div>
      <svg className={styles.chart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Training loss by generation">
        <line x1={PAD} y1={PAD} x2={PAD} y2={HEIGHT - PAD} className={styles.axis} />
        <line x1={PAD} y1={HEIGHT - PAD} x2={WIDTH - PAD} y2={HEIGHT - PAD} className={styles.axis} />
        {[0.25, 0.5, 0.75, 1].map((level) => {
          const y = HEIGHT - PAD - level * (HEIGHT - PAD * 2);
          return <line key={level} x1={PAD} y1={y} x2={WIDTH - PAD} y2={y} className={styles.grid} />;
        })}
        <path d={pathFor(losses, min, max)} className={styles.lossLine} />
        <path d={pathFor(bestLosses, min, max)} className={styles.bestLine} />
      </svg>
    </div>
  );
}
