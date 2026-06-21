import { Eyebrow } from "../components/Eyebrow";
import { Reveal } from "../components/Reveal";
import { RewardRail } from "../components/RewardRail";
import { BountyCard } from "../components/BountyCard";
import Counter from "../visuals/Counter";
import { counters, rewardRails, sampleBounty } from "../lib/content";
import shared from "../marketing.module.css";
import styles from "./TokenEconomy.module.css";

/** S06 — token economy. Hero gradient bg; pink accent lead. */
export function TokenEconomy() {
  return (
    <section id="tokens" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <Reveal className={styles.head}>
          <Eyebrow>Why contribute</Eyebrow>
          <h2 className={`${shared.h2} ${styles.title}`}>Two ways to earn from the search.</h2>
        </Reveal>

        <div className={styles.rails}>
          {rewardRails.map((r, i) => (
            <Reveal key={r.title} delay={i * 80}>
              <RewardRail {...r} />
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className={`${shared.bodyL} ${styles.utility}`}>
            <span className={styles.tokens}>Tokens</span> fund more search capacity, govern the network, and reward the
            work that moves it forward.
          </p>
        </Reveal>

        <Reveal className={styles.stats}>
          {counters.map((c) => (
            <div className={styles.stat} key={c.caption}>
              <Counter to={c.to} suffix={c.suffix ?? ""} fontSize={36} />
              <span className={styles.statCaption}>{c.caption}</span>
            </div>
          ))}
        </Reveal>

        <Reveal className={styles.bounty}>
          <BountyCard {...sampleBounty} />
        </Reveal>
      </div>
    </section>
  );
}
