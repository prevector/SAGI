import type { ReactNode } from "react";
import styles from "./Stat.module.css";

interface StatProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  delta?: ReactNode;
  hint?: string;
  /** Big variant for hero stats. */
  size?: "md" | "lg";
}

export function Stat({ label, value, icon, delta, hint, size = "md" }: StatProps) {
  return (
    <div className={styles.stat}>
      <div className={styles.head}>
        {icon ? <span className={styles.icon} aria-hidden>{icon}</span> : null}
        <span className={styles.label}>{label}</span>
      </div>
      <div className={[styles.value, size === "lg" ? styles.lg : ""].join(" ")}>{value}</div>
      {delta || hint ? (
        <div className={styles.foot}>
          {delta}
          {hint ? <span className={styles.hint}>{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
