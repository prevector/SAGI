import type { IafEvaluation, IafTask } from "@sagi/evolution";
import styles from "./GeneTrace.module.css";

interface GeneTraceProps {
  evaluation: IafEvaluation | null;
  task: IafTask;
}

const WIDTH = 760;
const HEIGHT = 260;
const PAD = 28;

function points(values: number[]): string {
  if (values.length === 0) {
    return "";
  }
  return values
    .map((value, index) => {
      const x = PAD + (index / Math.max(values.length - 1, 1)) * (WIDTH - PAD * 2);
      const y = HEIGHT - PAD - Math.max(0, Math.min(1, value)) * (HEIGHT - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function GeneTrace({ evaluation, task }: GeneTraceProps) {
  if (!evaluation) {
    return (
      <div className={styles.empty}>
        <span>Run a gene to render its target and output trace.</span>
      </div>
    );
  }

  const target = task === "iaf" ? evaluation.trace.targetSpikes : evaluation.trace.targetPotential;
  const output = evaluation.trace.outputs;
  const input = evaluation.trace.inputs;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <b>Selected genome trace</b>
        <span>
          {task === "potential"
            ? "Target is membrane potential: it ramps with input and resets after a spike."
            : "Target lines mark spike times; output is the selected genome response."}
        </span>
      </div>
      <div className={styles.legend} aria-label="Trace legend">
        <span><i className={styles.targetMark} /> Target</span>
        <span><i className={styles.outputMark} /> Output</span>
        <span><i className={styles.inputMark} /> Input</span>
      </div>
      <svg className={styles.chart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="IAF target and gene output trace">
        <line x1={PAD} y1={PAD} x2={PAD} y2={HEIGHT - PAD} className={styles.axis} />
        <line x1={PAD} y1={HEIGHT - PAD} x2={WIDTH - PAD} y2={HEIGHT - PAD} className={styles.axis} />
        {[0.25, 0.5, 0.75, 1].map((level) => {
          const y = HEIGHT - PAD - level * (HEIGHT - PAD * 2);
          return <line key={level} x1={PAD} y1={y} x2={WIDTH - PAD} y2={y} className={styles.grid} />;
        })}
        <polyline points={points(input.map((value) => Math.min(1, value * 8)))} className={styles.inputLine} />
        <polyline points={points(target)} className={styles.targetLine} />
        <polyline points={points(output)} className={styles.outputLine} />
        {task === "iaf"
          ? target.map((value, index) => {
              if (value <= 0) return null;
              const x = PAD + (index / Math.max(target.length - 1, 1)) * (WIDTH - PAD * 2);
              return <line key={index} x1={x} x2={x} y1={PAD} y2={HEIGHT - PAD} className={styles.spike} />;
            })
          : null}
      </svg>
    </div>
  );
}
