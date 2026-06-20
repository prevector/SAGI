import { Eyebrow } from "../components/Eyebrow";
import { Reveal } from "../components/Reveal";
import shared from "../marketing.module.css";
import styles from "./Premise.module.css";

/** S03 — the premise. Light (bg/paper), centered narrow column. */
export function Premise() {
  return (
    <section className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <Reveal className={styles.col}>
          <Eyebrow tone="light">The premise</Eyebrow>
          <h2 className={`${shared.h2} ${styles.title}`}>
            Intelligence has more than one path. We’re searching all of them.
          </h2>
          <p className={`${shared.bodyL} ${styles.body}`}>
            AI has converged on a single bet, scale transformers with backpropagation on ever-larger data. It works, but
            it treats one path as the only one. SAGI starts from what we don’t know: the architecture of general
            intelligence is still an <span className={styles.highlight}>open question</span>. So instead of scaling one
            design, we search the space of possible learning systems, their architecture, their memory, and the rules by
            which a mind changes as it learns.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
