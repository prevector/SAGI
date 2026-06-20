import type { ReactNode } from "react";
import styles from "./Tag.module.css";

type Tone = "neutral" | "teal" | "orange";

interface TagProps {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}

/** Small mono label for categories/sponsors. Never the sole status carrier. */
export function Tag({ tone = "neutral", icon, children }: TagProps) {
  return (
    <span className={[styles.tag, styles[tone]].join(" ")}>
      {icon ? <span className={styles.icon} aria-hidden>{icon}</span> : null}
      {children}
    </span>
  );
}
