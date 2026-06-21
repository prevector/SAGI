import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CtaLink } from "./components/CtaLink";
import { APP_LOGIN } from "./lib/content";
import styles from "./ThesisPage.module.css";

/**
 * The SAGI thesis — the long-form argument behind the project. Reached from every
 * "Read the thesis" CTA on the homepage (/thesis). Self-contained chrome mirrors
 * the docs page so it reads as its own document.
 */
export default function ThesisPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = "The SAGI Thesis — Search for Artificial General Intelligence";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.wordmark}>
            SAGI
          </Link>
          <nav className={styles.headerNav}>
            <Link to="/" className={styles.headerLink}>
              ← Back to site
            </Link>
            <Link to={APP_LOGIN} className={styles.headerLink}>
              Join the network →
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.eyebrow}>The thesis</p>
        <h1 className={styles.h1}>Search for Artificial General Intelligence</h1>
        <p className={styles.lead}>
          Artificial intelligence research has converged on a narrow strategy: train increasingly large transformer
          models through backpropagation on increasingly large datasets and compute clusters. This approach has
          produced remarkable systems, but its success has encouraged us to treat one effective path as though it
          were the only possible path.
        </p>

        <section className={styles.section}>
          <p className={styles.p}>
            SAGI starts from the fact that we do not know the architecture of general intelligence. We do not know
            whether it will be based on transformers, backpropagation, offline training, or internet-scale datasets.
            Instead of continuing to scale one known paradigm, SAGI proposes a worldwide search through the space of
            possible learning systems.
          </p>
          <p className={styles.p}>
            The project is inspired by SETI@home, artificial life, evolutionary computation, and Stephen
            Wolfram&apos;s search through large spaces of simple computational rules for structures that might
            underlie the laws of physics. SAGI applies the same philosophy to intelligence: construct broad but
            computable spaces of architectures and learning rules, then search them experimentally.
          </p>
          <p className={styles.goal}>The goal is to discover the algorithms that could lead to AGI.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>A distributed living laboratory</h2>
          <p className={styles.p}>
            SAGI is a distributed evolutionary laboratory in which every candidate learning system is represented by
            a genome. The genome describes its architecture, memory, internal state, plasticity, and the rules by
            which it changes while interacting with an environment.
          </p>
          <p className={styles.p}>
            Each genome is expressed as a small Tamagotchi-like organism. The organism is the phenotype of the
            underlying learning system. Its behaviour reveals whether it can remember, adapt, transfer knowledge,
            recover from mistakes, and respond when the rules of its environment change. This turns an abstract
            learning algorithm into something observable and gives users a direct relationship with the artificial
            minds they are cultivating.
          </p>
          <p className={styles.p}>
            The laboratory should contain many populations and many kinds of environments. Some searches will be
            highly specialized, targeting properties such as rapid adaptation, efficient memory, or performance under
            strict compute constraints. Others will be intentionally broad, exposing organisms to changing rules,
            unfamiliar combinations, new sensory representations, multiple tasks, and open-ended ecologies.
          </p>
          <p className={styles.p}>
            The purpose is not to find the organism that exploits one benchmark most effectively. It is to find
            learning systems whose abilities transfer across environments and whose internal rules remain useful when
            the surface form of a problem changes.
          </p>
          <p className={styles.p}>
            The exact network architecture of SAGI remains open. One possibility is a centralized system in which
            users perform searches locally and a trusted server verifies promising organisms on hidden tasks and
            seeds. Another is a more decentralized system in which results are reproduced and validated through peer
            review by multiple independent nodes. A hybrid system could combine central coordination with distributed
            replication and verification.
          </p>
          <p className={styles.p}>
            This decision also affects the economic model. A centralized version could sell subscriptions containing
            compute budgets. SAGI would rent or operate hardware, add a margin, and run additional populations for
            users. Since strong results can win real bounty money, users have a concrete reason to purchase more
            search capacity.
          </p>
          <p className={styles.p}>
            A decentralized version could instead reward compute, verification, benchmark design, and successful
            discoveries through some form of token or shared incentive system. The incentive structure should follow
            the technical architecture rather than being added merely for speculation.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Searching architectures and learning rules</h2>
          <p className={styles.p}>
            The genome must describe more than a conventional network with mutable weights. SAGI should search the
            architecture and the learning process together.
          </p>
          <p className={styles.p}>
            A candidate organism may contain recurrent structures, persistent memory, plastic connections, local
            update rules, modulatory signals, symbolic operations, or components that do not resemble present neural
            networks at all. It receives observations, produces predictions or actions, and modifies itself
            continuously as a result of its experience.
          </p>
          <p className={styles.p}>
            Training and inference do not need to remain separate phases. The most interesting organisms may keep
            learning throughout their lives.
          </p>
          <p className={styles.p}>
            Initially, SAGI will need carefully designed genome languages: constrained spaces that are broad enough
            to produce genuinely different systems but structured enough to search. Later, researchers and users
            should be able to add new primitives, architecture families, mutation operators, environments, and entire
            search substrates.
          </p>
          <p className={styles.p}>
            Evolution supplies broad exploration, but it is not the only intelligence guiding the process. Humans can
            inspect lineages, edit genomes, create bounties, and direct searches toward promising regions. AI research
            agents can run experiments, modify code, compare results, preserve useful failures, and propose the next
            experiment, in the spirit of Andrej Karpathy&apos;s autoresearch loop.
          </p>
          <p className={styles.p}>
            This creates a combination of evolutionary search, human intuition, and automated research. Instead of one
            research team following one promising direction, the system can maintain many competing lineages and
            hypotheses simultaneously.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>The generalization hypothesis</h2>
          <p className={styles.p}>
            The deeper motivation behind SAGI is a hypothesis about transformer generalization.
          </p>
          <p className={styles.p}>
            Transformers clearly do more than literal memorization. They can combine concepts, transfer patterns, and
            produce responses that did not occur verbatim in their training data. Yet their scaling laws suggest that
            much of this capability may still depend on broad statistical coverage of an enormous, long-tailed
            distribution of examples.
          </p>
          <p className={styles.p}>A simplified empirical scaling relation is:</p>
          <div className={styles.formula}>
            <span className={styles.formulaMain} aria-label="L of N and D equals L-infinity plus A times N to the minus alpha plus B times D to the minus beta">
              L(N, D) = L<sub>∞</sub> + A N<sup>−α</sup> + B D<sup>−β</sup>
            </span>
          </div>
          <p className={styles.p}>
            where <em>N</em> is parameter count, <em>D</em> is the amount of training data, and{" "}
            <em>
              L<sub>∞</sub>
            </em>{" "}
            is the irreducible loss. Compute-optimal results indicate that model size and training data should
            increase together.
          </p>
          <p className={styles.p}>
            This is useful engineering guidance, but it may also tell us something about the learning process. If
            improvement largely comes from representing more local structures and seeing more of the long tail, then
            additional parameters are required to represent those structures while additional data is required to
            reveal them.
          </p>
          <p className={styles.p}>
            Knowledge can instead be imagined as a generative grammar. A compact grammar stores reusable concepts and
            rules whose combinations explain a much larger number of concrete situations. Its stored structure grows
            approximately with the number of reusable elements, while its possible interpretations grow through their
            combinations.
          </p>
          <p className={styles.p}>
            A shallower learner may discover many useful local templates without fully discovering the deeper grammar
            that connects them. Each template generalizes within a limited region, and an enormous collection of such
            templates can appear broadly intelligent. However, expanding that coverage requires continuing growth in
            both examples and representation.
          </p>
          <p className={styles.p}>
            The SAGI hypothesis is that current transformers may derive much of their power from this broad, shallow
            form of generalization, while an alternative learner could discover deeper reusable structure and
            therefore generalize from far fewer examples.
          </p>
          <p className={styles.p}>
            Such a system might still require enormous compute. It may need to search over hypotheses, actively
            conduct experiments, reorganize its memory, construct internal programs, or test causal explanations. The
            important distinction is that computation and data are different resources. A system may spend substantial
            computation extracting a powerful rule from a small number of observations.
          </p>
          <p className={styles.p}>
            Its scaling law could therefore look very different: less dependence on ever-larger datasets, with more
            computation devoted to finding compact structures that transfer broadly.
          </p>
          <p className={styles.p}>
            One way to picture the distinction: in a deeper learner, a small subtree can be attached to an existing
            conceptual structure. In a shallower learner, the same subtree remains another separate local tree.
          </p>

          <figure className={styles.diagram}>
            <div className={styles.diagPanel}>
              <p className={styles.diagTitle}>Deep learner</p>
              <svg
                className={styles.diagSvg}
                viewBox="0 0 220 150"
                role="img"
                aria-label="A deep learner: one connected tree where a new subtree integrates into the existing structure."
              >
                <g stroke="var(--brown-300)" strokeWidth="2" fill="none" strokeLinecap="round">
                  <line x1="110" y1="26" x2="74" y2="70" />
                  <line x1="110" y1="26" x2="146" y2="70" />
                  <line x1="74" y1="70" x2="52" y2="114" />
                  <line x1="74" y1="70" x2="92" y2="114" />
                  <line x1="146" y1="70" x2="132" y2="114" />
                </g>
                <line x1="146" y1="70" x2="178" y2="114" stroke="var(--pink-500)" strokeWidth="2.5" strokeLinecap="round" />
                <g fill="var(--brown-500)">
                  <circle cx="110" cy="26" r="6" />
                  <circle cx="74" cy="70" r="5.5" />
                  <circle cx="146" cy="70" r="5.5" />
                  <circle cx="52" cy="114" r="5" />
                  <circle cx="92" cy="114" r="5" />
                  <circle cx="132" cy="114" r="5" />
                </g>
                <circle cx="178" cy="114" r="6.5" fill="var(--pink-500)" />
              </svg>
              <figcaption className={styles.diagCap}>
                One deeper shared tree — a <em>new subtree integrates</em> into what is already there.
              </figcaption>
            </div>

            <div className={styles.diagPanel}>
              <p className={styles.diagTitle}>Shallow template learner</p>
              <svg
                className={styles.diagSvg}
                viewBox="0 0 220 150"
                role="img"
                aria-label="A shallow template learner: several separate local trees, and a new subtree that stays separate."
              >
                <g stroke="var(--brown-300)" strokeWidth="2" fill="none" strokeLinecap="round">
                  <line x1="38" y1="34" x2="26" y2="68" />
                  <line x1="38" y1="34" x2="50" y2="68" />
                  <line x1="110" y1="34" x2="98" y2="68" />
                  <line x1="110" y1="34" x2="122" y2="68" />
                  <line x1="182" y1="34" x2="170" y2="68" />
                  <line x1="182" y1="34" x2="194" y2="68" />
                </g>
                <g fill="var(--brown-500)">
                  <circle cx="38" cy="34" r="5.5" />
                  <circle cx="26" cy="68" r="5" />
                  <circle cx="50" cy="68" r="5" />
                  <circle cx="110" cy="34" r="5.5" />
                  <circle cx="98" cy="68" r="5" />
                  <circle cx="122" cy="68" r="5" />
                  <circle cx="182" cy="34" r="5.5" />
                  <circle cx="170" cy="68" r="5" />
                  <circle cx="194" cy="68" r="5" />
                </g>
                <g stroke="var(--pink-500)" strokeWidth="2.5" fill="none" strokeLinecap="round">
                  <line x1="110" y1="106" x2="98" y2="132" />
                  <line x1="110" y1="106" x2="122" y2="132" />
                </g>
                <g fill="var(--pink-500)">
                  <circle cx="110" cy="106" r="6.5" />
                  <circle cx="98" cy="132" r="5" />
                  <circle cx="122" cy="132" r="5" />
                </g>
              </svg>
              <figcaption className={styles.diagCap}>
                Many separate local trees — the <em>new subtree stays separate</em>.
              </figcaption>
            </div>
          </figure>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Why less data matters</h2>
          <p className={styles.p}>
            Better sample efficiency would matter scientifically, economically, and legally.
          </p>
          <p className={styles.p}>
            Frontier models currently depend on enormous collections of books, websites, software, journalism,
            images, audio, and other human-created material. This produces continuing disputes over permission,
            compensation, provenance, and copyright. The pressure to absorb nearly all available cultural material is
            partly a consequence of a learning paradigm that gains capability through ever-larger datasets.
          </p>
          <p className={styles.p}>
            A system that learns stronger abstractions from smaller, carefully licensed, synthetic, or interactive
            datasets would not automatically resolve every copyright question, but it would change the economics.
            Curated and compensated datasets would become more practical, and advanced models would be less dependent
            on indiscriminate scraping.
          </p>
          <p className={styles.p}>
            Sample efficiency is therefore not merely another benchmark. It may be necessary for a more sustainable
            form of artificial intelligence.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Benchmarks, bounties, and incentives</h2>
          <p className={styles.p}>
            SAGI should measure intelligence across many dimensions rather than reducing it immediately to one score.
            Benchmarks may test transfer to unseen task families, adaptation after rules change, learning speed,
            robustness, memory efficiency, computational cost, and performance across different hardware.
          </p>
          <p className={styles.p}>
            Leaderboards give each dimension a visible competitive structure, while bounties allow researchers,
            companies, sponsors, or community members to direct effort toward specific unsolved problems. A bounty
            might reward the first verified organism that reaches a transfer score under a fixed interaction or
            compute budget.
          </p>
          <p className={styles.p}>
            Because successful discoveries can earn real money, compute becomes more than a donation. Users can invest
            their own hardware or purchase additional search capacity in an attempt to produce stronger organisms.
            This creates a direct economic connection between research progress, compute allocation, and rewards.
          </p>
          <p className={styles.p}>
            The system should also reward less visible contributions, such as creating difficult environments,
            reproducing results, identifying benchmark exploits, contributing architecture primitives, and finding
            useful intermediate lineages.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>A distributed frontier lab</h2>
          <p className={styles.p}>
            Current frontier research is concentrated because transformer scaling rewards enormous homogeneous
            clusters, vast datasets, and capital-intensive training runs. A search across many small, irregular and
            heterogeneous learning systems is naturally more distributable.
          </p>
          <p className={styles.p}>
            Different populations could run asynchronously on CPUs, GPUs, laptops, cloud hardware, and future devices.
            The scientific work could also be distributed: users contribute genomes and environments, independent
            nodes reproduce discoveries, human researchers direct promising searches, and AI agents continuously run
            new experiments.
          </p>
          <p className={styles.p}>
            The ambition is not merely to crowdsource compute. It is to create a worldwide research organization with
            no single fixed architecture, benchmark, or research agenda.
          </p>
          <p className={styles.p}>
            SAGI begins with small artificial organisms and deliberately limited genome languages, but it can expand
            into neural, symbolic, recurrent, plastic, cellular, program-like, and hybrid systems. Some searches may
            begin from known algorithms, while others begin almost from scratch. Evolution, gradient-based
            optimization, program synthesis, novelty search, quality-diversity methods, human engineering, and
            autonomous research agents can all operate within the same laboratory.
          </p>
          <p className={styles.closing}>
            The project is based on a simple position: the architecture of general intelligence remains an open
            question, so the search for it should remain open as well.
          </p>
          <p className={styles.signoff}>— Tim Trussner</p>

          <div className={styles.ctaRow}>
            <CtaLink to={APP_LOGIN} variant="primary">
              Join the network →
            </CtaLink>
            <CtaLink to="/" variant="ghost">
              Back to the site
            </CtaLink>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© 2026 SAGI · The thesis</span>
        <Link to="/">sagi.network</Link>
      </footer>
    </div>
  );
}
