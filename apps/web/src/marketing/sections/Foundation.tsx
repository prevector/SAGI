import { Eyebrow } from "../components/Eyebrow";
import { Reveal } from "../components/Reveal";
import shared from "../marketing.module.css";
import styles from "./Foundation.module.css";

export function Foundation() {
  return (
    <section id="foundation" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <Reveal className={styles.head}>
          <Eyebrow tone="light">The Foundation</Eyebrow>
          <h2 className={`${shared.h2} ${styles.title}`}>Every discovery is owned by the network that made it.</h2>
          <p className={`${shared.bodyL} ${styles.body}`}>
            A non-profit Foundation is the legal steward of everything SAGI discovers. It coordinates the search, verifies results, and holds each breakthrough on behalf of the whole network — keeping it open and beneficial, never enclosed by a single lab or nation.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
