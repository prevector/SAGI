import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  label?: string;
  /** Show the percentage text on the right of the label row. */
  showValue?: boolean;
  tone?: "teal" | "orange";
}

export function ProgressBar({ value, label, showValue = true, tone = "teal" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value));
  const display = `${Math.round(pct * 100)}%`;

  return (
    <div className={styles.wrap}>
      {label || showValue ? (
        <div className={styles.row}>
          {label ? <span className={styles.label}>{label}</span> : <span />}
          {showValue ? <span className={styles.value}>{display}</span> : null}
        </div>
      ) : null}
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={[styles.fill, styles[tone]].join(" ")} style={{ transform: `scaleX(${pct})` }} />
      </div>
    </div>
  );
}
