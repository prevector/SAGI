import { CheckCircle2, Clock } from "lucide-react";
import type { LeaderboardEntry } from "../lib/content";
import styles from "./Leaderboard.module.css";

/** S07 leaderboard table. Status colour is always paired with an icon + label. */
export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className={styles.scroll}>
      <div className={styles.table} role="table" aria-label="Top organisms by transfer score">
        <div className={`${styles.row} ${styles.head}`} role="row">
          <span role="columnheader">Rank</span>
          <span role="columnheader">Organism</span>
          <span role="columnheader">Transfer score</span>
          <span role="columnheader">Status</span>
          <span role="columnheader" className={styles.right}>
            Reward
          </span>
        </div>
        {entries.map((e) => {
          const verified = e.status === "Verified";
          return (
            <div className={styles.row} role="row" key={e.rank}>
              <span className={styles.rank} role="cell">
                {e.rank}
              </span>
              <span className={styles.organism} role="cell">
                {e.organism}
              </span>
              <span className={styles.score} role="cell">
                {e.score}
              </span>
              <span role="cell">
                <span className={`${styles.status} ${verified ? styles.verified : styles.pending}`}>
                  {verified ? <CheckCircle2 size={13} strokeWidth={1.75} /> : <Clock size={13} strokeWidth={1.75} />}
                  {e.status}
                </span>
              </span>
              <span className={`${styles.reward} ${styles.right}`} role="cell">
                {e.reward}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
