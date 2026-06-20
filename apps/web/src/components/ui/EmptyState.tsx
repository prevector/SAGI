import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  /** An action that invites the next step (interface voice). */
  action?: ReactNode;
  tone?: "default" | "error";
}

export function EmptyState({ icon, title, message, action, tone = "default" }: EmptyStateProps) {
  return (
    <div className={[styles.empty, tone === "error" ? styles.error : ""].join(" ")} role="status">
      {icon ? <span className={styles.icon} aria-hidden>{icon}</span> : null}
      <h3 className={styles.title}>{title}</h3>
      {message ? <p className={styles.message}>{message}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
