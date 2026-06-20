import type { ReactNode } from "react";
import styles from "./StatusChip.module.css";

export type Tone = "teal" | "orange" | "neutral" | "positive" | "negative";

interface StatusChipProps {
  tone: Tone;
  /** Required: colour is never the only signal (DESIGN.md §2). */
  icon: ReactNode;
  label: string;
}

/**
 * Colorblind-safe status pill: always colour + icon + text together.
 * Domain enums are mapped to props by small helpers near each feature.
 */
export function StatusChip({ tone, icon, label }: StatusChipProps) {
  return (
    <span className={[styles.chip, styles[tone]].join(" ")}>
      <span className={styles.icon} aria-hidden>{icon}</span>
      {label}
    </span>
  );
}
