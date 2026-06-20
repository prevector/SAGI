import { Cpu, Trophy, type LucideIcon } from "lucide-react";
import type { RewardRailSpec } from "../lib/content";
import styles from "./RewardRail.module.css";

const ICONS: Record<RewardRailSpec["icon"], LucideIcon> = { Cpu, Trophy };

/** S06 reward rail: icon + title + body on a dark surface. */
export function RewardRail({ icon, title, body }: RewardRailSpec) {
  const Icon = ICONS[icon];
  return (
    <article className={styles.rail}>
      <span className={styles.icon} aria-hidden>
        <Icon size={22} strokeWidth={1.5} />
      </span>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{body}</p>
    </article>
  );
}
