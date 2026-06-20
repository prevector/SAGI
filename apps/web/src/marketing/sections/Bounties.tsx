import { Eyebrow } from "../components/Eyebrow";
import { Reveal } from "../components/Reveal";
import { Leaderboard } from "../components/Leaderboard";
import { leaderboard, openBounties } from "../lib/content";
import shared from "../marketing.module.css";
import styles from "./Bounties.module.css";

/** S07 — bounties + leaderboard. Light-muted data section. */
export function Bounties() {
  return (
    <section id="bounties" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <Reveal className={styles.head}>
          <Eyebrow tone="light">Open problems</Eyebrow>
          <h2 className={`${shared.h2} ${styles.title}`}>Open bounties and live leaderboards.</h2>
          <p className={`${shared.bodyL} ${styles.intro}`}>
            Intelligence isn’t one score. SAGI measures transfer to unseen tasks, adaptation speed, memory efficiency, and
            compute cost, each with its own leaderboard. Anyone can post a bounty to point the network at an unsolved
            problem.
          </p>
        </Reveal>

        <Reveal>
          <Leaderboard entries={leaderboard} />
        </Reveal>

        <ul className={styles.bounties}>
          {openBounties.map((b, i) => (
            <Reveal as="li" key={b.title} delay={i * 80} className={styles.bountyRow}>
              <span className={styles.bountyTitle}>{b.title}</span>
              <span className={styles.bountyReward}>{b.reward}</span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
