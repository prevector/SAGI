import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock, CreditCard, Info, Loader2, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type BountyContributionStatus, type BountyDraftInput } from "../lib/api";
import type { SponsorType } from "../lib/types";
import { formatInt } from "../lib/format";
import styles from "./LaunchBountyPage.module.css";

// Conversion + floor: 1 token = €10, minimum bounty is 10 tokens = €100.
const EUR_PER_TOKEN = 10;
const MIN_TOKENS = 10;
const MIN_EUR = MIN_TOKENS * EUR_PER_TOKEN;

const SPONSOR_TYPES: { value: SponsorType; label: string }[] = [
  { value: "hardware", label: "Hardware" },
  { value: "quant", label: "Quant / Finance" },
  { value: "biotech", label: "Biotech" },
  { value: "robotics", label: "Robotics" },
  { value: "lab", label: "Research lab" }
];

const ALGORITHM_TYPES = [
  "Reinforcement learning",
  "Evolutionary / neuroevolution",
  "Supervised learning",
  "Self-supervised / representation",
  "Meta-learning / few-shot",
  "Planning / search",
  "Other"
];

interface FormState {
  title: string;
  algorithmType: string;
  sponsorType: SponsorType;
  description: string;
  computeEstimate: string;
  targetMetric: string;
  target: string;
  startDate: string;
  endDate: string;
  amountEur: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialState: FormState = {
  title: "",
  algorithmType: ALGORITHM_TYPES[0],
  sponsorType: "lab",
  description: "",
  computeEstimate: "",
  targetMetric: "",
  target: "",
  startDate: todayIso(),
  endDate: "",
  amountEur: String(MIN_EUR)
};

export default function LaunchBountyPage() {
  const [params] = useSearchParams();
  // Coming back from Mollie's checkout — poll the real payment status instead of
  // trusting the redirect.
  if (params.get("status") === "return") {
    return (
      <ReturnView contributionId={params.get("contribution")} canceled={params.get("canceled") === "1"} />
    );
  }
  return <LaunchBountyForm />;
}

function LaunchBountyForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(initialState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Launch a bounty · SAGI";
  }, []);

  const amountEur = Number(form.amountEur) || 0;
  // Tokens are derived from the EUR commitment (the sponsor fills in cash).
  const tokens = useMemo(() => Math.floor(amountEur / EUR_PER_TOKEN), [amountEur]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!form.title.trim()) return "Give the bounty a title.";
    if (!form.description.trim()) return "Describe what the bounty rewards.";
    if (!form.targetMetric.trim()) return "Name the target metric winners are judged on.";
    if (!form.endDate) return "Set an end date for the bounty.";
    if (form.endDate < form.startDate) return "The end date must be after the start date.";
    if (amountEur < MIN_EUR) return `The minimum bounty is ${MIN_TOKENS} tokens (€${MIN_EUR}).`;
    return null;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    const input: BountyDraftInput = {
      title: form.title.trim(),
      algorithmType: form.algorithmType,
      sponsorType: form.sponsorType,
      description: form.description.trim(),
      computeEstimate: Number(form.computeEstimate) || 0,
      targetMetric: form.targetMetric.trim(),
      ...(form.target.trim() ? { target: Number(form.target) } : {}),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      amountEur,
      tokens
    };
    try {
      const checkout = await api.createBountyDraft(input);
      // Hand the browser to the payment provider. Today the URL is the in-app
      // "pending" confirmation; once Mollie is wired it becomes the hosted page.
      window.location.assign(checkout.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <button className={styles.back} type="button" onClick={() => navigate("/app")}>
            <ArrowLeft size={15} />
            Terminal
          </button>
          <span className={styles.route}>/app/launch-bounty</span>
          <span className={styles.mode}>Mollie test mode</span>
        </div>

        <header className={styles.head}>
          <h1 className={styles.title}>Fund a bounty</h1>
          <p className={styles.lede}>
            Set a verifiable target, fund the reward, and route the network toward one measurable result. The bounty
            opens only after the Mollie payment clears.
          </p>
        </header>

        <form className={styles.form} onSubmit={onSubmit}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Bounty spec</h2>

            <Field label="Title" htmlFor="title">
              <input
                id="title"
                className={styles.input}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="First to 0.85 transfer under fixed compute"
                maxLength={120}
              />
            </Field>

            <div className={styles.grid2}>
              <Field label="Type of algorithm" htmlFor="algorithmType">
                <select
                  id="algorithmType"
                  className={styles.input}
                  value={form.algorithmType}
                  onChange={(e) => set("algorithmType", e.target.value)}
                >
                  {ALGORITHM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Sponsor category" htmlFor="sponsorType">
                <select
                  id="sponsorType"
                  className={styles.input}
                  value={form.sponsorType}
                  onChange={(e) => set("sponsorType", e.target.value as SponsorType)}
                >
                  {SPONSOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Estimated compute needed (GFLOP-hours)" htmlFor="computeEstimate">
              <input
                id="computeEstimate"
                className={styles.input}
                type="number"
                min={0}
                value={form.computeEstimate}
                onChange={(e) => set("computeEstimate", e.target.value)}
                placeholder="1000"
              />
            </Field>

            <div className={styles.grid2}>
              <Field label="Start date" htmlFor="startDate">
                <input
                  id="startDate"
                  className={styles.input}
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  min={todayIso()}
                />
              </Field>
              <Field label="End date" htmlFor="endDate">
                <input
                  id="endDate"
                  className={styles.input}
                  type="date"
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                  min={form.startDate || todayIso()}
                />
              </Field>
            </div>

            <div className={styles.grid2}>
              <Field label="Target metric" htmlFor="targetMetric">
                <input
                  id="targetMetric"
                  className={styles.input}
                  value={form.targetMetric}
                  onChange={(e) => set("targetMetric", e.target.value)}
                  placeholder="Transfer score"
                />
              </Field>
              <Field label="Target value (optional)" htmlFor="target">
                <input
                  id="target"
                  className={styles.input}
                  type="number"
                  value={form.target}
                  onChange={(e) => set("target", e.target.value)}
                  placeholder="0.85"
                />
              </Field>
            </div>

            <Field label="Description" htmlFor="description">
              <textarea
                id="description"
                className={styles.textarea}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                placeholder="What must the winning organism demonstrate? How is the result verified?"
                maxLength={1200}
              />
            </Field>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Funding</h2>

            <div className={styles.grid2}>
              <Field label="Your contribution (EUR)" htmlFor="amountEur">
                <div className={styles.moneyField}>
                  <span className={styles.prefix}>€</span>
                  <input
                    id="amountEur"
                    className={styles.input}
                    type="number"
                    min={MIN_EUR}
                    step={EUR_PER_TOKEN}
                    value={form.amountEur}
                    onChange={(e) => set("amountEur", e.target.value)}
                  />
                </div>
              </Field>
              <Field label="Reward (tokens)" htmlFor="tokens">
                <div className={styles.moneyField}>
                  <span className={styles.prefix}>⬡</span>
                  <input id="tokens" className={`${styles.input} ${styles.readonly}`} value={formatInt(tokens)} readOnly tabIndex={-1} />
                </div>
              </Field>
            </div>
            <p className={styles.rate}>
              <Info size={13} />
              1 token = €10 · minimum bounty {MIN_TOKENS} tokens (€{MIN_EUR}). Tokens are calculated from the cash you
              commit.
            </p>

            <div className={styles.checkoutSummary} aria-label="Checkout summary">
              <span>
                <strong>Amount</strong>
                €{formatInt(amountEur)}
              </span>
              <span>
                <strong>Reward</strong>
                {formatInt(tokens)} tokens
              </span>
              <span>
                <strong>Activation</strong>
                After payment clears
              </span>
            </div>

            <div className={styles.note}>
              <p>
                Sponsor funds move through Mollie first. Once the payment is paid, SAGI creates the open bounty and
                escrows the token reward for the winning organism.
              </p>
              <details className={styles.legal}>
                <summary>Token mechanics</summary>
                <p>
                  SAGI is a utility and work token, not a claim on company equity or profit. Contributors earn it for
                  verified compute and bounty wins. Sponsor fees can support buyback and burn mechanics, while staking
                  and slashing keep submitted work accountable.
                </p>
              </details>
            </div>
          </section>

          {error ? <p className={styles.error}>{error}</p> : null}

          <button className={styles.payButton} type="submit" disabled={busy}>
            {busy ? <Loader2 size={16} className={styles.spin} /> : <CreditCard size={16} />}
            {busy ? "Starting checkout…" : `Continue to payment · €${formatInt(amountEur)}`}
          </button>
          <p className={styles.payHint}>Secure Mollie checkout. The bounty activates only after server-side confirmation.</p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label className={styles.field} htmlFor={htmlFor}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const PENDING_STATUSES = new Set(["created", "open", "pending", "authorized"]);

/** Post-checkout view: polls the authoritative payment status until it settles. */
function ReturnView({ contributionId, canceled }: { contributionId: string | null; canceled: boolean }) {
  const navigate = useNavigate();
  const [result, setResult] = useState<BountyContributionStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | null>(null);

  const poll = useCallback(async () => {
    if (!contributionId) {
      setFailed(true);
      return;
    }
    try {
      const status = await api.getBountyContributionStatus(contributionId);
      setResult(status);
      if (!status.settled) {
        timer.current = window.setTimeout(poll, 1500);
      }
    } catch {
      setFailed(true);
    }
  }, [contributionId]);

  useEffect(() => {
    document.title = "Bounty payment · SAGI";
    void poll();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [poll]);

  const status = result?.status;
  const settling = !failed && (!result || PENDING_STATUSES.has(status ?? ""));
  const paid = status === "paid";

  let icon = <Loader2 size={28} className={styles.spin} />;
  let iconClass = styles.successIcon;
  let title = "Confirming your payment…";
  let body: React.ReactNode = "Hang tight while we verify the payment with Mollie.";

  if (failed || (!settling && !paid)) {
    icon = <XCircle size={28} />;
    iconClass = styles.failIcon;
    title = canceled && !paid ? "Payment canceled" : `Payment ${status ?? "could not be confirmed"}`;
    body = "No money moved and no bounty was created. Adjust the details and try again.";
  } else if (paid) {
    icon = <CheckCircle2 size={28} />;
    title = "Bounty funded";
    body = (
      <>
        Your €{formatInt(result?.amountEur ?? 0)} contribution cleared and a{" "}
        <strong>{formatInt(result?.tokens ?? 0)}-token</strong> bounty is now live on the network. The reward is
        escrowed for whichever organism wins.
      </>
    );
  } else if (settling) {
    icon = <Clock size={28} className={styles.spin} />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.success}>
        <span className={iconClass}>{icon}</span>
        <h1 className={styles.successTitle}>{title}</h1>
        <p className={styles.successText}>{body}</p>
        {!settling ? (
          <div className={styles.returnActions}>
            {!paid ? (
              <button className={styles.secondaryButton} onClick={() => navigate("/app/launch-bounty")}>
                Edit bounty
              </button>
            ) : null}
            <button className={styles.primaryButton} onClick={() => navigate("/app")}>
              Back to the terminal
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
