import { CheckCircle2 } from "lucide-react";
import styles from "./BountyCard.module.css";

interface BountyCardProps {
  title: string;
  reward: string;
  tag: string;
  helper: string;
}

/** S06 sample bounty: title, hairline, pink reward + success status tag + helper. */
export function BountyCard({ title, reward, tag, helper }: BountyCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.top}>
        <span className={styles.tag}>{tag}</span>
      </div>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.divider} role="presentation" />
      <div className={styles.footer}>
        <span className={styles.reward}>{reward}</span>
        <span className={styles.helper}>
          <CheckCircle2 size={14} strokeWidth={1.5} aria-hidden />
          {helper}
        </span>
      </div>
    </article>
  );
}
