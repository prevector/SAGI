import { useAuth } from "../auth/AuthContext";
import { Async, Card, type Column, Delta, MetricChart, PageHeader, Stat, Table } from "../components/ui";
import { api } from "../lib/api";
import { formatDate, formatTokens } from "../lib/format";
import type { TokenEntry, TokenReason } from "../lib/types";
import { useAsync } from "../lib/useAsync";
import { REASON_META } from "../features/tokens/reason";

const REASON_ORDER: TokenReason[] = ["compute", "bounty", "stake", "slash", "burn"];

export default function TokensPage() {
  const { username } = useAuth();
  const state = useAsync(() => api.getTokens(username ?? ""), [username]);

  const columns: Column<TokenEntry>[] = [
    { key: "at", header: "Date", render: (e) => formatDate(e.at), mono: true, sortValue: (e) => e.at },
    {
      key: "reason",
      header: "Reason",
      render: (e) => {
        const { label, Icon } = REASON_META[e.reason];
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)" }}>
            <Icon size={14} aria-hidden /> {label}
          </span>
        );
      }
    },
    { key: "note", header: "Note", render: (e) => e.note ?? "—" },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      mono: true,
      sortValue: (e) => e.amount,
      render: (e) => <Delta value={e.amount} format={formatTokens} suffix=" SAGI" />
    }
  ];

  return (
    <div>
      <PageHeader eyebrow="Economy" title="Tokens earned" subtitle="Your balance over time, by reason, and the full ledger. Earned in teal, spent in orange — always with a sign and icon." />
      <Async state={state}>
        {(t) => (
          <div style={{ display: "grid", gap: "var(--s5)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 2fr", gap: "var(--s4)" }}>
              <Card>
                <Stat label="Total balance" size="lg" value={formatTokens(t.total)} delta={<Delta value={t.earned24h} format={formatTokens} />} hint="last 24h" />
              </Card>
              <Card>
                <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "var(--s3)" }}>Cumulative balance</p>
                <MetricChart series={[{ key: "balance", label: "Balance", points: t.history, tone: "teal" }]} valueFormat={formatTokens} height={160} />
              </Card>
            </div>

            <Card>
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "var(--s4)" }}>By reason</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--s4)" }}>
                {REASON_ORDER.map((reason) => {
                  const { label, Icon, kind } = REASON_META[reason];
                  const amount = t.byReason[reason] ?? 0;
                  return (
                    <div key={reason} style={{ display: "grid", gap: "var(--s1)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
                        <Icon size={14} aria-hidden style={{ color: kind === "earn" ? "var(--accent)" : "var(--accent-2)" }} /> {label}
                      </span>
                      <span className="mono" style={{ fontSize: "var(--fs-h3)", color: kind === "earn" ? "var(--accent)" : "var(--accent-2)" }}>
                        {amount >= 0 ? "+" : "−"}{formatTokens(Math.abs(amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", marginBottom: "var(--s4)" }}>Ledger</p>
              <Table columns={columns} rows={t.ledger} rowKey={(e) => e.id} />
            </Card>
          </div>
        )}
      </Async>
    </div>
  );
}
