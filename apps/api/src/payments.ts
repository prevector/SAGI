// Payment seam for sponsor-funded bounties — Mollie, TEST MODE ONLY.
//
// Flow (Variant A, polling): the launch form POSTs a draft → we create a local
// `bounty_contributions` row + a Mollie payment, and hand the browser the
// hosted-checkout URL. On return the web app polls `getStatus`, which re-fetches
// the authoritative status from Mollie. The bounty is materialised into the
// `bounties` table (status `open`) only on the first transition to `paid`.
//
// Test mode is guaranteed three ways: (1) the key must start with `test_` or we
// refuse to construct the client; (2) every created payment is asserted
// `mode === "test"`; (3) Mollie itself blocks live payments until KYC.
//
// The Variant B webhook handler (`handleWebhook`) is included but no route is
// mounted — flip it on later by adding a `webhookUrl` in `createCheckout` and a
// POST /api/webhooks/mollie route.

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Client } from "mollie-api-typescript";
import type { AppEnv } from "./env.js";
import type { Db } from "./ledger/db/client.js";
import { bounties, bountyContributions } from "./ledger/db/schema.js";

export const EUR_PER_TOKEN = 10;
export const MIN_TOKENS = 10;
export const MIN_EUR = MIN_TOKENS * EUR_PER_TOKEN;
const ONE = 1_000_000_000n; // base units per SAGI (DECIMALS=9), mirrors the ledger

const SPONSOR_TYPES = new Set(["hardware", "quant", "biotech", "robotics", "lab"]);
// Statuses that won't change again — the client can stop polling.
export const SETTLED_STATUSES = new Set(["paid", "canceled", "expired", "failed"]);

export interface BountyDraft {
  title: string;
  algorithmType: string;
  sponsorType: string;
  description: string;
  computeEstimate: number;
  targetMetric: string;
  target?: number;
  startDate: string;
  endDate: string;
  amountEur: number;
  tokens: number;
  sponsor: string;
}

export interface BountyCheckout {
  draftId: string; // == contribution id; echoed back on return for polling
  provider: "mollie";
  status: string;
  amountEur: number;
  tokens: number;
  checkoutUrl: string;
}

export interface ContributionStatus {
  status: string;
  settled: boolean;
  tokens: number;
  amountEur: number;
  bountyId?: string;
}

/** €-cents → Mollie's required "10.00" decimal string (EUR has 2 decimals). */
function toMollieValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Validate a launch-form payload. Tokens are re-derived from cash server-side. */
export function parseBountyDraft(body: unknown, sponsor: string): { draft: BountyDraft } | { error: string } {
  const data = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const title = str(data.title);
  const description = str(data.description);
  const targetMetric = str(data.targetMetric);
  const algorithmType = str(data.algorithmType) || "Other";
  const sponsorType = str(data.sponsorType);
  const startDate = str(data.startDate);
  const endDate = str(data.endDate);
  const amountEur = Number(data.amountEur);
  const computeEstimate = Number(data.computeEstimate) || 0;
  const target =
    data.target === undefined || data.target === null || data.target === "" ? undefined : Number(data.target);

  if (!title) return { error: "Title is required." };
  if (!description) return { error: "Description is required." };
  if (!targetMetric) return { error: "Target metric is required." };
  if (!SPONSOR_TYPES.has(sponsorType)) return { error: "Invalid sponsor category." };
  if (!startDate || !endDate) return { error: "Start and end dates are required." };
  if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
    return { error: "End date must be after the start date." };
  }
  if (!Number.isFinite(amountEur) || amountEur < MIN_EUR) {
    return { error: `Minimum bounty is ${MIN_TOKENS} tokens (€${MIN_EUR}).` };
  }
  if (target !== undefined && !Number.isFinite(target)) {
    return { error: "Target value must be a number." };
  }

  return {
    draft: {
      title,
      algorithmType,
      sponsorType,
      description,
      computeEstimate,
      targetMetric,
      ...(target !== undefined ? { target } : {}),
      startDate,
      endDate,
      amountEur,
      tokens: Math.floor(amountEur / EUR_PER_TOKEN),
      sponsor
    }
  };
}

export class PaymentsService {
  private readonly mollie: Client | null;
  /** Reason the service is unavailable, or null when ready. */
  readonly disabledReason: string | null;

  constructor(
    private readonly db: Db,
    private readonly env: AppEnv,
    private readonly ledgerMode: string
  ) {
    const key = env.mollieApiKey;
    if (!key) {
      this.mollie = null;
      this.disabledReason = "Mollie is not configured (set MOLLIE_API_KEY=test_… in the environment).";
    } else if (/^test_x+$/i.test(key)) {
      // The .env.example placeholder — loaded fine, but Mollie will reject it.
      this.mollie = null;
      this.disabledReason =
        "MOLLIE_API_KEY is still the placeholder. Paste your real test_ key from Mollie Dashboard → Developers → API keys, then restart the API.";
    } else if (!key.startsWith("test_")) {
      // Belt-and-suspenders: live payments are intentionally disabled.
      this.mollie = null;
      this.disabledReason = "MOLLIE_API_KEY must be a TEST key (test_…). Live payments are disabled for the showcase.";
    } else if (!env.appUrl) {
      this.mollie = null;
      this.disabledReason = "APP_URL must be set so Mollie can redirect back to the app.";
    } else {
      // The test key IS test mode — do not also pass testmode:true with an API key.
      this.mollie = new Client({ security: { apiKey: key } });
      this.disabledReason = null;
    }
  }

  get enabled(): boolean {
    return this.mollie !== null;
  }

  /** Create the contribution row + Mollie payment and return the checkout URL. */
  async createCheckout(draft: BountyDraft): Promise<BountyCheckout> {
    if (!this.mollie) throw new Error(this.disabledReason ?? "Payments unavailable.");

    const id = randomUUID();
    const reference = randomUUID();
    const amountCents = Math.round(draft.amountEur * 100);
    const now = Date.now();

    // 1. Persist a pending row first, so a Mollie payment never lacks a local record.
    this.db
      .insert(bountyContributions)
      .values({
        id,
        sponsor: draft.sponsor,
        amountCents,
        tokens: draft.tokens,
        currency: "EUR",
        status: "created",
        reference,
        draft: JSON.stringify(draft),
        createdAt: now
      })
      .run();

    // 2. Create the payment at Mollie. redirectUrl carries our id so the return
    //    page knows what to poll; metadata is the trustworthy server-side link.
    const returnUrl = `${this.env.appUrl}/app/launch-bounty?status=return&contribution=${id}`;
    const payment = await this.mollie.payments.create({
      idempotencyKey: reference,
      paymentRequest: {
        description: `SAGI bounty: ${draft.title}`.slice(0, 255),
        amount: { currency: "EUR", value: toMollieValue(amountCents) },
        redirectUrl: returnUrl,
        cancelUrl: `${returnUrl}&canceled=1`,
        metadata: { contributionId: id, reference },
        locale: "nl_NL"
      }
    });

    // 3. Guard: never hand a non-test checkout to the browser.
    if (payment.mode !== "test") {
      throw new Error(`Refused: expected a test payment, got mode=${payment.mode}.`);
    }

    this.db
      .update(bountyContributions)
      .set({ molliePaymentId: payment.id, mode: payment.mode, status: payment.status })
      .where(eq(bountyContributions.id, id))
      .run();

    const checkoutUrl = payment.links?.checkout?.href;
    if (!checkoutUrl) throw new Error("Mollie returned no checkout URL.");

    return { draftId: id, provider: "mollie", status: payment.status, amountEur: draft.amountEur, tokens: draft.tokens, checkoutUrl };
  }

  /** Authoritative status read — re-fetches from Mollie and reconciles locally. */
  async getStatus(contributionId: string): Promise<ContributionStatus> {
    const row = this.db.select().from(bountyContributions).where(eq(bountyContributions.id, contributionId)).get();
    if (!row) throw new Error("Unknown contribution.");

    let status = row.status;
    let bountyId = row.bountyId ?? undefined;

    if (this.mollie && row.molliePaymentId && !SETTLED_STATUSES.has(row.status)) {
      const payment = await this.mollie.payments.get({ paymentId: row.molliePaymentId });
      if (payment.status !== row.status) {
        bountyId = this.reconcile(row, payment.status) ?? bountyId;
        status = payment.status;
      }
    }

    return {
      status,
      settled: SETTLED_STATUSES.has(status),
      tokens: row.tokens,
      amountEur: row.amountCents / 100,
      ...(bountyId ? { bountyId } : {})
    };
  }

  /** Variant B (webhook): authenticate by FETCHING the payment, never trust the body. */
  async handleWebhook(molliePaymentId: string): Promise<void> {
    if (!this.mollie) return;
    const row = this.db
      .select()
      .from(bountyContributions)
      .where(eq(bountyContributions.molliePaymentId, molliePaymentId))
      .get();
    if (!row) return; // unknown id → caller still returns 200 so Mollie stops retrying
    const payment = await this.mollie.payments.get({ paymentId: molliePaymentId });
    if (payment.status !== row.status) this.reconcile(row, payment.status);
  }

  /**
   * Apply a status change. On the first transition to `paid`, materialise the
   * bounty into the `bounties` table. Idempotent: gated on the stored status, so
   * the grant fires exactly once even if polling and a webhook both observe paid.
   */
  private reconcile(row: typeof bountyContributions.$inferSelect, nextStatus: string): string | undefined {
    const justPaid = nextStatus === "paid" && row.status !== "paid";
    let bountyId = row.bountyId ?? undefined;

    if (justPaid) {
      bountyId = this.materialiseBounty(row);
    }

    this.db
      .update(bountyContributions)
      .set({
        status: nextStatus,
        ...(justPaid ? { paidAt: Date.now(), bountyId } : {})
      })
      .where(eq(bountyContributions.id, row.id))
      .run();

    return bountyId;
  }

  /** Insert the paid bounty as `open`. The reward escrow lives in the contribution. */
  private materialiseBounty(row: typeof bountyContributions.$inferSelect): string {
    const draft = JSON.parse(row.draft) as BountyDraft;
    const bountyId = `b-${row.id.slice(0, 8)}`;
    const details = [
      draft.description,
      "",
      `Algorithm: ${draft.algorithmType}`,
      `Estimated compute: ${draft.computeEstimate} GFLOP-hours`,
      `Window: ${draft.startDate.slice(0, 10)} → ${draft.endDate.slice(0, 10)}`,
      `Funded by ${draft.sponsor} · €${(row.amountCents / 100).toFixed(2)}`
    ].join("\n");

    this.db
      .insert(bounties)
      .values({
        id: bountyId,
        title: draft.title,
        sponsor: draft.sponsor,
        sponsorType: draft.sponsorType,
        description: details,
        reward: (BigInt(draft.tokens) * ONE).toString(),
        status: "open",
        targetMetric: draft.targetMetric,
        target: draft.target ?? null,
        progress: 0,
        participants: 0,
        createdAt: Date.now(),
        // Sponsor-funded bounties are real even in demo mode; never synthetic.
        synthetic: 0
      })
      .onConflictDoNothing()
      .run();

    return bountyId;
  }
}
