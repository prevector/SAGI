import { useEffect } from "react";
import { Link } from "react-router-dom";
import { APP_LOGIN } from "./lib/content";
import styles from "./DocsPage.module.css";

// Where "see a live example" points. Unset in prod (no localhost leak) → fall
// back to joining the network rather than a dead link.
const CONTRIBUTE_URL = import.meta.env.VITE_CONTRIBUTE_URL ?? "";

// The whole signal integration: register a user, ask for work, send a signal,
// get settled. Four calls — this mirrors the SDK demo's seam verbatim.
const SIGNAL_QUICKSTART = `import * as sagi from "@sagi/sdk";

// 1 · register your user with the network
const { user_id } = await sagi.registerUser({ appId: "your-app" });

// 2 · ask the network for a task (e.g. a DUEL: two candidates)
const task = await sagi.requestTask(user_id);

// 3 · send your user's judgement (a pick, a label, a comparison)
const { bet_id } = await sagi.submitSignal(task.task_id, user_id, choice);

// 4 · the network settles it against ground truth & credits tokens
const { won, tokens } = await sagi.getSignalResult(bet_id);`;

// The compute path: lend idle cycles, bounded by a budget you control.
const COMPUTE_QUICKSTART = `import * as sagi from "@sagi/sdk";

await sagi.initialize({ appId: "your-app", enabledPaths: ["compute"] });
await sagi.connect();

// the network only ever gets the headroom you grant it
sagi.setComputeBudget({
  maxCpuPercentage: 25,
  maxMemory: "512mb",
  batteryPolicy: "charging-only",
  foregroundOrBackgroundOnly: "background",
});

sagi.onJobCompleted(({ jobId, fitness, tokens }) => {
  console.log(\`job \${jobId} verified · +\${tokens} tokens\`);
});

sagi.startContributing(); // pause/stop the moment your app needs the resources`;

// The conceptual surface, grouped by area. Names mirror the design spec.
const SURFACE = `// ── core ────────────────────────────────────────────
sagi.initialize(config)
sagi.connect() / sagi.disconnect()
sagi.getStatus() / sagi.getStatistics()
sagi.getWallet() / sagi.getBalance() / sagi.getTransactions()
sagi.onRewardReceived(cb) / sagi.onError(cb)

// ── compute path ────────────────────────────────────
sagi.setComputeBudget(budget)
sagi.setExecutionPolicy(policy)
sagi.startContributing() / pauseContributing() / stopContributing()
sagi.onJobStarted(cb) / sagi.onJobCompleted(cb)

// ── signal path ─────────────────────────────────────
sagi.requestTask()                  // -> SignalTask (e.g. a DUEL)
sagi.submitSignal(taskId, response)
sagi.getSignalResult(betId)         // settlement outcome
sagi.getLeaderboard(limit)          // read search state, for dashboards
sagi.onTask(cb) / sagi.onTaskSettled(cb)`;

const REWARDS = `compute_reward = accepted_compute
               × job_difficulty
               × verification_quality
               × reliability_factor

signal_reward  = correct_prediction      // backed candidate ranked higher
               × task_difficulty
               × scout_reliability`;

const CONFIG = `Config:
  applicationId
  nodeIdentity
  walletAddress
  networkEndpoint
  supportedRuntimeVersion
  enabledPaths           // ["compute"], ["signal"], or both
  computeCapabilities
  resourceLimits

ComputeBudget:
  maxCpuPercentage
  maxGpuPercentage
  maxMemory
  maxExecutionTime
  batteryPolicy
  foregroundOrBackgroundOnly`;

/**
 * SAGI SDK documentation — a single readable reference, drawn from the SDK
 * design brief + unified spec. The "Check the documentation" CTA in the SAGI
 * network homepage section links here (/docs). Split into routed sub-pages once
 * it outgrows one scroll.
 */
export default function DocsPage() {
  useEffect(() => {
    const prev = document.title;
    document.title = "SAGI SDK — Documentation";
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
        <p className={styles.eyebrow}>SAGI SDK · Documentation</p>
        <h1 className={styles.h1}>Plug any app into the network.</h1>
        <p className={styles.lead}>
          The SAGI SDK lets games and applications contribute to a distributed search for AGI —
          lending <strong>compute</strong>, surfacing <strong>human judgment</strong>, or both — and
          earn token rewards for the work. It is a thin, language-native client over the SAGI
          network; it never executes arbitrary code, and it stays isolated from your app&apos;s
          logic. This is the initial reference and will grow alongside the SDK.
        </p>

        {/* ── Two paths ───────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Two ways to contribute</h2>
          <p className={styles.p}>
            One SDK, two contribution paths over a shared core. An app can enable either, or both,
            settling all rewards into a single wallet.
          </p>
          <div className={styles.pathGrid}>
            <div className={`${styles.path} ${styles.pathCompute}`}>
              <p className={styles.pathTag}>Path A</p>
              <p className={styles.pathName}>Compute</p>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Donates</span>
                <span className={styles.metaVal}>Idle CPU / GPU cycles</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Does</span>
                <span className={styles.metaVal}>
                  Runs genome jobs (<code>SEARCH</code>, <code>VERIFY</code>, <code>VALIDATE</code>,{" "}
                  <code>BENCHMARK</code>) in a restricted runtime
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Validated by</span>
                <span className={styles.metaVal}>
                  Independent reproduction — deterministic agreement across nodes
                </span>
              </div>
            </div>
            <div className={`${styles.path} ${styles.pathSignal}`}>
              <p className={styles.pathTag}>Path B</p>
              <p className={styles.pathName}>Signal</p>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Donates</span>
                <span className={styles.metaVal}>Human judgment</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Does</span>
                <span className={styles.metaVal}>
                  Triages which candidates deserve expensive evaluation (<code>DUEL</code>: pick the
                  fitter of two)
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Validated by</span>
                <span className={styles.metaVal}>
                  Settlement against the network&apos;s ground-truth evaluation
                </span>
              </div>
            </div>
          </div>
          <p className={styles.callout}>
            The two paths form one loop: <strong>the signal path decides what to evaluate; the
            compute path does the evaluating.</strong> Players&apos; taps choose targets while their
            idle cycles supply the work — better models make better games, which attract more
            players, which produce better signal. A flywheel.
          </p>
        </section>

        {/* ── Architecture ────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>How it fits together</h2>
          <p className={styles.p}>
            The SAGI system splits into three layers. Your app only ever talks to the SDK; the SDK
            talks to the network coordinator, which owns all the business logic — validation,
            settlement, the ledger, and reward issuance.
          </p>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>architecture</div>
            <pre className={styles.code}>{`Host application        games · dashboards · passive nodes
    ↓
SAGI SDK
    ├── Core            network client · identity & wallet · ledger · resources
    ├── Compute path    job scheduler · restricted runtime · result validator
    └── Signal path     task client · response submitter · leaderboard reader
    ↓
SAGI Network           orchestration · validation · settlement · ledger`}</pre>
          </div>
          <p className={styles.p}>
            The SDK implements no consensus or token-issuance logic. It enforces resource limits and
            the restricted-execution boundary, signs work with a local identity, and reads its
            balance — nothing more.
          </p>
        </section>

        {/* ── Install ─────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Install</h2>
          <code className={styles.install}>npm install @sagi/sdk</code>
          <p className={styles.p}>
            For casual apps the SDK manages the cryptographic keypair transparently, so a player
            never handles keys — yet the same identity still produces signed, verifiable work on
            both paths.
          </p>
        </section>

        {/* ── Signal quickstart ───────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Quickstart — the signal path</h2>
          <p className={styles.p}>
            The signal path is the fastest way in: it&apos;s near-free (API calls only) and needs no
            runtime. The entire integration is four calls — drop them where your app already
            collects a choice from a user.
          </p>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>the entire signal integration</div>
            <pre className={styles.code}>{SIGNAL_QUICKSTART}</pre>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>The four signal calls</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>01</div>
              <div>
                <p className={styles.stepTitle}>
                  <code>registerUser()</code>
                </p>
                <p className={styles.stepBody}>
                  Introduce one of your users to the network. You get back a <code>user_id</code>{" "}
                  that contributions and token rewards are credited against.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>02</div>
              <div>
                <p className={styles.stepTitle}>
                  <code>requestTask()</code>
                </p>
                <p className={styles.stepBody}>
                  Ask the network for a unit of work suited to your app. In v1 that&apos;s a{" "}
                  <code>DUEL</code> — two candidates the cheap automated proxy couldn&apos;t separate,
                  so the human call is worth the most.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>03</div>
              <div>
                <p className={styles.stepTitle}>
                  <code>submitSignal()</code>
                </p>
                <p className={styles.stepBody}>
                  Send back what your user produced — a judgement, a label, a comparison. The SDK
                  signs the response; you get a <code>bet_id</code> for the settlement. The host app
                  never learns which tasks are gold-standard checks.
                </p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>04</div>
              <div>
                <p className={styles.stepTitle}>
                  <code>getSignalResult()</code>
                </p>
                <p className={styles.stepBody}>
                  When the candidate is scored by full evaluation, the network settles the open bet
                  against ground truth, returning whether it <code>won</code> and how many{" "}
                  <code>tokens</code> the accurate scout earned.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Compute path ────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>The compute path</h2>
          <p className={styles.p}>
            The compute path lends idle cycles to evaluate candidate genomes. You set a budget, the
            SDK pulls signed jobs within it, runs them in a sandboxed runtime, and submits signed
            results — pausing instantly whenever your app needs the resources back.
          </p>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>opting an app into compute</div>
            <pre className={styles.code}>{COMPUTE_QUICKSTART}</pre>
          </div>

          <p className={styles.p} style={{ marginTop: 28 }}>
            The network distributes four kinds of signed job:
          </p>
          <div className={styles.grid}>
            <div className={styles.card}>
              <p className={styles.cardTitle}>SEARCH</p>
              <p className={styles.cardBody}>Execute a candidate genome in an environment.</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardTitle}>VERIFY</p>
              <p className={styles.cardBody}>Repeat an existing result on an independent node.</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardTitle}>VALIDATE</p>
              <p className={styles.cardBody}>Run a candidate across more environments or seeds.</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardTitle}>BENCHMARK</p>
              <p className={styles.cardBody}>Measure performance, memory use and execution time.</p>
            </div>
          </div>

          <p className={styles.p} style={{ marginTop: 28 }}>
            Genomes run in a restricted runtime — never as arbitrary code. Every job is signature-,
            version- and resource-checked before a single operation runs. The runtime guarantees:
          </p>
          <ul className={styles.guards}>
            <li>Deterministic, reproducible execution</li>
            <li>A fixed set of supported operations</li>
            <li>Bounded memory and execution time</li>
            <li>Reproducible random-number generation</li>
            <li>No filesystem access</li>
            <li>No network access</li>
            <li>No native code loading</li>
            <li>No access to the host application</li>
          </ul>
          <p className={styles.callout}>
            A compute result is only accepted after enough independent nodes reproduce it and agree.
            Nodes never know who else is validating the same job — so a result can&apos;t be faked by
            collusion.
          </p>
        </section>

        {/* ── Full surface ────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>The SDK surface</h2>
          <p className={styles.p}>
            Beyond the quickstarts, the SDK exposes a small, predictable surface grouped by area.
            Names mirror the design spec and will firm up with the published SDK.
          </p>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>public interface</div>
            <pre className={styles.code}>{SURFACE}</pre>
          </div>
        </section>

        {/* ── Identity & wallet ───────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Identity &amp; wallet</h2>
          <p className={styles.p}>
            Each SDK installation owns one cryptographic node identity, used by both paths to sign
            compute results and signal responses. The private key stays local and never leaves the
            device. Both paths settle into the same wallet, which can read its address and balance,
            list transactions, verify rewards, and transfer tokens. Issuance, settlement and the
            ledger all live in the network — the SDK only communicates through signed transactions.
          </p>
        </section>

        {/* ── Rewards ─────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Rewards</h2>
          <p className={styles.p}>
            Each path earns into the wallet as its own reward type, weighted by difficulty and your
            track record of reliability.
          </p>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>how rewards are weighted</div>
            <pre className={styles.code}>{REWARDS}</pre>
          </div>
          <p className={styles.p} style={{ marginTop: 22 }}>
            No reward is issued for:
          </p>
          <ul className={`${styles.guards} ${styles.guardsNo}`}>
            <li>Invalid or unverified compute results</li>
            <li>Jobs that exceed their execution limits</li>
            <li>Duplicate submissions on either path</li>
            <li>Signals that fail gold-standard checks or look sybil</li>
            <li>Signals that backed the losing candidate</li>
          </ul>
        </section>

        {/* ── Configuration ───────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Configuration</h2>
          <p className={styles.p}>
            <code>enabledPaths</code> picks which paths run. The compute path takes a strict budget;
            the signal path carries only a light policy (how many tasks to cache, whether they may
            surface in the foreground) since it&apos;s essentially free.
          </p>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>config &amp; compute budget</div>
            <pre className={styles.code}>{CONFIG}</pre>
          </div>
        </section>

        {/* ── Security ────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Security boundary</h2>
          <p className={styles.p}>
            The SDK treats the network as a source of <em>signed specifications</em>, never code to
            run. Everything received is untrusted until verified; everything submitted is signed.
          </p>
          <div className={styles.split}>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Trusted</p>
              <p className={styles.cardBody}>
                Signed job &amp; task specifications · the verified SAGI runtime · the local SDK ·
                the network&apos;s ground-truth evaluation.
              </p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Untrusted</p>
              <p className={styles.cardBody}>
                Received genomes · claimed results · remote nodes · host applications · human
                responses (noisy, sybil-prone, adversarial).
              </p>
            </div>
          </div>
          <p className={`${styles.callout} ${styles.calloutOrange}`}>
            The SDK stays isolated from gameplay: SAGI jobs and tasks can&apos;t read or modify your
            app&apos;s state, and gameplay can&apos;t influence results or responses beyond a
            user&apos;s genuine choice.
          </p>
        </section>

        {/* ── What you can contribute ─────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>What can you contribute?</h2>
          <p className={styles.p}>
            A contribution is anything the network can&apos;t cheaply produce on its own. That&apos;s
            broader than people expect — it isn&apos;t only crowd judgment.
          </p>
          <div className={styles.grid}>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Human judgment</p>
              <p className={styles.cardBody}>
                Comparisons, labels, preferences and reviews from your users — the evaluation signal
                models are expensive to fake.
              </p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Passive compute</p>
              <p className={styles.cardBody}>
                Idle cycles on a laptop, a GPU rig, or a business&apos;s spare infrastructure,
                evaluating candidates while it&apos;s not otherwise busy.
              </p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Proprietary signal</p>
              <p className={styles.cardBody}>
                Domain outcomes a business already generates — turned into training signal without
                handing over the raw data.
              </p>
            </div>
          </div>
        </section>

        {/* ── v1 scope ────────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Version 1 scope</h2>
          <div className={styles.split}>
            <div className={styles.card}>
              <p className={styles.cardTitle}>In v1</p>
              <ul className={styles.guards} style={{ gridTemplateColumns: "1fr" }}>
                <li>Network connection &amp; shared node identity</li>
                <li>Wallet access &amp; reward tracking (compute + signal)</li>
                <li>Compute-budget management</li>
                <li>Signed job reception &amp; restricted genome execution</li>
                <li>Verification jobs</li>
                <li>
                  Signed task reception (<code>DUEL</code>) &amp; signal submission
                </li>
                <li>Settlement against ground truth · leaderboard read</li>
              </ul>
            </div>
            <div className={styles.card}>
              <p className={styles.cardTitle}>Not yet</p>
              <ul className={`${styles.guards} ${styles.guardsNo}`} style={{ gridTemplateColumns: "1fr" }}>
                <li>Arbitrary user code or custom execution engines</li>
                <li>General smart contracts</li>
                <li>Direct peer-to-peer code execution</li>
                <li>Host filesystem or network access</li>
                <li>
                  Signal task types beyond <code>DUEL</code>
                </li>
                <li>Client-side reward computation or consensus</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Next steps ──────────────────────────────────────── */}
        <section className={styles.section}>
          <h2 className={styles.h2}>Next steps</h2>
          <p className={styles.p}>See the SDK in action, then wire it into your own app.</p>
          <div className={styles.ctaRow}>
            {CONTRIBUTE_URL ? (
              <a className={styles.ctaPrimary} href={CONTRIBUTE_URL}>
                See an app built on the SDK →
              </a>
            ) : (
              <Link className={styles.ctaPrimary} to={APP_LOGIN}>
                Join the network →
              </Link>
            )}
            <Link className={styles.ctaSecondary} to="/">
              Back to the network
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© 2026 SAGI · SDK documentation (preview)</span>
        <Link to="/">sagi.network</Link>
      </footer>
    </div>
  );
}
