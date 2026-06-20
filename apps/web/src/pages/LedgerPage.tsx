import { Boxes, Coins, Cpu, FlaskConical, Hash, Sparkles, Trophy, type LucideIcon } from "lucide-react";
import type { TxDTO } from "@sagi/ledger";
import { Card, type Column, PageHeader, Stat, Table, Tag } from "../components/ui";
import { formatInt, formatRelative, formatTokensStr } from "../lib/format";
import { useLedger } from "../features/ledger/useLedger";

// Tx kind -> label + icon (colour is never the only signal: icon + label always).
const KIND: Record<string, { label: string; Icon: LucideIcon }> = {
  COMPUTE_REWARD: { label: "Compute", Icon: Cpu },
  BOUNTY_PAYOUT: { label: "Bounty", Icon: Trophy },
  GENESIS: { label: "Genesis", Icon: Sparkles },
  STAKE: { label: "Stake", Icon: Coins },
  SLASH: { label: "Slash", Icon: Coins },
  BURN: { label: "Burn", Icon: Coins }
};

const short = (addr: string) => (addr.length > 16 ? `${addr.slice(0, 10)}…${addr.slice(-4)}` : addr);

const columns: Column<TxDTO>[] = [
  {
    key: "kind",
    header: "Type",
    render: (t) => {
      const { label, Icon } = KIND[t.kind] ?? { label: t.kind, Icon: Hash };
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)" }}>
          <Icon size={14} aria-hidden /> {label}
          {t.synthetic ? <Tag icon={<FlaskConical size={11} />}>Demo</Tag> : null}
        </span>
      );
    }
  },
  { key: "to", header: "To", render: (t) => <span className="mono">{short(t.to)}</span>, sortValue: (t) => t.to },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    mono: true,
    render: (t) => `${formatTokensStr(t.amount)} SAGI`,
    sortValue: (t) => Number(t.amount)
  },
  { key: "epoch", header: "Epoch", align: "right", mono: true, render: (t) => formatInt(t.epoch), sortValue: (t) => t.epoch },
  {
    key: "ts",
    header: "When",
    align: "right",
    render: (t) => formatRelative(new Date(t.ts).toISOString()),
    sortValue: (t) => t.ts
  }
];

export default function LedgerPage() {
  const { stats, txs, loading, error } = useLedger();

  return (
    <div>
      <PageHeader
        eyebrow="Ledger"
        title="Chain explorer"
        subtitle="The append-only token ledger: total supply, this epoch's emission, and recent transactions. A sequencer-sealed block layer slots in behind a switch."
      />

      {error ? (
        <Card><p style={{ color: "var(--accent-2)" }}>Could not load the ledger: {error.message}</p></Card>
      ) : (
        <div style={{ display: "grid", gap: "var(--s5)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--s4)" }}>
            <Card><Stat label="Total supply" value={stats ? `${formatTokensStr(stats.supplyTotal)} SAGI` : "—"} /></Card>
            <Card><Stat label="Emission this epoch" value={stats ? `${formatTokensStr(stats.emissionThisEpoch)} SAGI` : "—"} /></Card>
            <Card><Stat label="Epoch" value={stats ? formatInt(stats.epoch) : "—"} /></Card>
            <Card><Stat label="Transactions" value={stats ? formatInt(stats.height) : "—"} /></Card>
          </div>

          <Card>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "var(--s4)" }}>
              Recent transactions
            </p>
            {loading && txs.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>Loading the ledger…</p>
            ) : txs.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No transactions yet — run a session to mint the first reward.</p>
            ) : (
              <Table columns={columns} rows={txs} rowKey={(t) => t.id} />
            )}
          </Card>

          <Card>
            <p style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
              <Boxes size={15} aria-hidden /> Blocks
            </p>
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)", marginTop: "var(--s2)" }}>
              Chain layer off. Transactions are append-only now; sequencer-sealed,
              hash-chained, signed blocks (with <span className="mono">verifyChain</span>) arrive when
              the <span className="mono">ledger.chain</span> switch is enabled.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
