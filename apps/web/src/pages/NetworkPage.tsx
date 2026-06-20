import { Async, Avatar, Card, type Column, PageHeader, Stat, Table } from "../components/ui";
import { formatCompute, formatInt, formatTokens } from "../lib/format";
import type { NetworkNode } from "../lib/types";
import { LivePulse } from "../features/network/LivePulse";
import { NodeStatusChip } from "../features/common/status";
import { useNetwork } from "../features/network/useNetwork";

const columns: Column<NetworkNode>[] = [
  {
    key: "user",
    header: "Organism",
    render: (n) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)" }}>
        <Avatar seed={n.username} size={24} />
        <span className="mono">{n.username}</span>
      </span>
    ),
    sortValue: (n) => n.username
  },
  { key: "device", header: "Device", render: (n) => n.device },
  { key: "region", header: "Region", render: (n) => <span className="mono">{n.region ?? "—"}</span> },
  { key: "compute", header: "Compute", render: (n) => formatCompute(n.computePower), align: "right", mono: true, sortValue: (n) => n.computePower },
  { key: "status", header: "Status", render: (n) => <NodeStatusChip status={n.status} /> }
];

export default function NetworkPage() {
  const state = useNetwork();

  return (
    <div>
      <PageHeader
        eyebrow={<LivePulse />}
        title="Network overview"
        subtitle="The distributed compute fabric, updating live. Aggregate stats above; a sample of active nodes below."
      />
      <Async state={state}>
        {(snap) => (
          <div style={{ display: "grid", gap: "var(--s5)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--s4)" }}>
              <Card><Stat label="Active contributors" value={formatInt(snap.stats.activeContributors)} /></Card>
              <Card><Stat label="Total compute" value={formatCompute(snap.stats.totalCompute)} /></Card>
              <Card><Stat label="Running sessions" value={formatInt(snap.stats.runningSessions)} /></Card>
              <Card><Stat label="Tokens emitted 24h" value={formatTokens(snap.stats.tokensEmitted24h)} /></Card>
            </div>
            <Card>
              <Table columns={columns} rows={snap.nodes} rowKey={(n) => n.id} />
            </Card>
          </div>
        )}
      </Async>
    </div>
  );
}
