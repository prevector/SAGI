import { Eyebrow } from "../components/Eyebrow";
import { Reveal } from "../components/Reveal";
import { ComputeForecast } from "../visuals/ComputeForecast";
import shared from "../marketing.module.css";
import styles from "./Premise.module.css";

const FORECAST_SOURCE =
  "https://docs.google.com/spreadsheets/d/17spngWSIDffy1SucsOP8KpWZ3GQmPTnvHNFdH5t1_gw/edit";

/** S03 — the premise. Light (bg/paper), centered narrow column + compute-forecast chart. */
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
            AI has converged on a single bet: scale transformers with backpropagation on ever-larger data — and
            ever-larger compute. It works, but it treats one path as the only one, and it concentrates that path in
            whoever can afford the most hardware (below). SAGI starts from what we don’t know: the architecture of
            general intelligence is still an <span className={styles.highlight}>open question</span>. So instead of
            scaling one design, we search the space of possible learning systems — their architecture, their memory, and
            the rules by which a mind changes as it learns — on compute contributed by everyone.
          </p>
        </Reveal>

        <Reveal className={styles.chartWrap} delay={80}>
          <ComputeForecast />
          <a className={styles.source} href={FORECAST_SOURCE} target="_blank" rel="noreferrer noopener">
            View the full compute forecast — Europe 2031 team ↗
          </a>
        </Reveal>
      </div>
    </section>
  );
}
