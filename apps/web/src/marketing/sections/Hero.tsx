import EmergenceField from "../visuals/EmergenceField";
import { CtaLink } from "../components/CtaLink";
import { APP_LOGIN, PLACEHOLDER } from "../lib/content";
import shared from "../marketing.module.css";
import styles from "./Hero.module.css";

/** S02 — hero. Gradient bg (pink→blue). EmergenceField animates over it. */
export function Hero() {
  return (
    <section id="top" className={styles.hero}>
      <div className={styles.field}>
        <EmergenceField
          noiseColor="rgba(46,33,24,0.18)"
          organismColor="rgba(255,255,255,0.95)"
          glowColor="rgba(255,255,255,0.4)"
          focusX={0.72}
          transparentBg={true}
        />
      </div>
      <div className={`${shared.container} ${styles.inner}`}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>a distributed search for general intelligence</p>
          <h1 className={styles.title}>
            We don't know what AGI looks like. So let's search and own it, together.
          </h1>
          <p className={`${shared.bodyL} ${styles.subhead}`}>
            SAGI is a distributed worldwide frontier laboratory searching for the next generation of AI algorithms where everyone can contribute with idle compute. 
            Candidate AI minds are grown as living organisms, evolved on your hardware, and selected for one thing: the ability to learn.
          </p>
          <div className={styles.ctas}>
            <CtaLink to={APP_LOGIN} variant="primary">
              Join the network
            </CtaLink>
            <CtaLink href={PLACEHOLDER} variant="ghost">
              Read the thesis
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
