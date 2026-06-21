import { Reveal } from "../components/Reveal";
import { CtaLink } from "../components/CtaLink";
import { APP_LOGIN } from "../lib/content";
import shared from "../marketing.module.css";
import styles from "./FinalCta.module.css";

/** S09 — final CTA. Dark, teal-forward panel. */
export function FinalCta() {
  return (
    <section className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <Reveal className={styles.panel}>
          <h2 className={`${shared.h2} ${styles.title}`}>Join the search for AGI.</h2>
          <p className={`${shared.bodyL} ${styles.body}`}>
            Contribute compute. <span className={styles.earn}>Earn tokens.</span> Help discover the algorithms behind
            general intelligence.
          </p>
          <div className={styles.ctas}>
            <CtaLink to={APP_LOGIN} variant="primary">
              Join the network
            </CtaLink>
            <CtaLink to="/thesis" variant="ghost">
              Read the thesis
            </CtaLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
