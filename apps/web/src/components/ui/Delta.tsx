import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import styles from "./Delta.module.css";

interface DeltaProps {
  value: number;
  /** Optional formatter for the magnitude (defaults to localized integer). */
  format?: (abs: number) => string;
  suffix?: string;
}

/** Change indicator: colour + arrow + sign together (never colour alone). */
export function Delta({ value, format, suffix }: DeltaProps) {
  const abs = Math.abs(value);
  const magnitude = format ? format(abs) : abs.toLocaleString();
  const tone = value > 0 ? styles.up : value < 0 ? styles.down : styles.flat;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const Icon = value > 0 ? ArrowUp : value < 0 ? ArrowDown : Minus;
  const aria = value > 0 ? "up" : value < 0 ? "down" : "no change";

  return (
    <span className={[styles.delta, tone].join(" ")}>
      <Icon size={14} aria-label={aria} />
      <span className={styles.value}>
        {sign}
        {magnitude}
        {suffix ?? ""}
      </span>
    </span>
  );
}
