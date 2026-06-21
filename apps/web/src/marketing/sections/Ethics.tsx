import { ShieldCheck, Users, Flag } from "lucide-react";
import { Eyebrow } from "../components/Eyebrow";
import { Reveal } from "../components/Reveal";
import shared from "../marketing.module.css";
import styles from "./Ethics.module.css";

const cards = [
  {
    icon: ShieldCheck,
    title: "Prohibited by design",
    body: "No autonomous weapons, mass surveillance, or political disinformation.",
  },
  {
    icon: Users,
    title: "Independent oversight",
    body: "A rotating committee of researchers, civil-society voices, and legal experts with binding veto power.",
  },
  {
    icon: Flag,
    title: "Community flagging",
    body: "Anyone can pause a live bounty for review. A flag triggers a hold pending the committee's decision.",
  },
];

export function Ethics() {
  return (
    <section id="ethics" className={`${shared.section} ${styles.section}`}>
      <div className={shared.container}>
        <Reveal className={styles.head}>
          <Eyebrow tone="light">Ethics &amp; governance</Eyebrow>
          <h2 className={`${shared.h2} ${styles.title}`}>Open doesn't mean unaccountable.</h2>
          <p className={`${shared.bodyL} ${styles.intro}`}>
            Every bounty passes a two-stage review before it goes live — automated screening against a prohibited-category list, then an independent ethics committee with binding veto power.
          </p>
        </Reveal>

        <div className={styles.cards}>
          {cards.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delay={i * 80} className={styles.card}>
                <span className={styles.icon} aria-hidden>
                  <Icon size={22} strokeWidth={1.5} />
                </span>
                <h3 className={styles.cardTitle}>{c.title}</h3>
                <p className={styles.cardBody}>{c.body}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
