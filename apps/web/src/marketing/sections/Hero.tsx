import EmergenceField from "../visuals/EmergenceField";
import { CtaLink } from "../components/CtaLink";
import { APP_LOGIN } from "../lib/content";
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
          <p className={styles.eyebrow}>A distributed R&amp;D company, owned by its contributors</p>
          <h1 className={styles.title}>
            We don't know what AGI looks like. So let's search for it — together, and own what we find.
          </h1>
          <p className={`${shared.bodyL} ${styles.subhead}`}>
            SAGI is a distributed compute laboratory that searches for the next generation of artificial intelligence
            Everyone can contribute compute, build application that connect to the network, and become a co-owner of every discovery the network makes.
          </p>
          <div className={styles.ctas}>
            <CtaLink to={APP_LOGIN} variant="primary">
              Join the network
            </CtaLink>
            <CtaLink to="/thesis" variant="ghost">
              Read the thesis
            </CtaLink>
          </div>
        </div>
      </div>
    </section>
  );
}
