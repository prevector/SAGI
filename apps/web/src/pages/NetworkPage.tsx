import type { NetworkNode } from "../lib/types";
import { LivePulse } from "../features/network/LivePulse";
import { NodeStatusChip } from "../features/common/status";
import { useNetwork } from "../features/network/useNetwork";
import { Avatar, Async, Card, type Column, PageHeader, Stat, Table } from "../components/ui";
import { formatCompute, formatInt, formatTokens } from "../lib/format";

const onlineColumns: Column<NetworkNode>[] = [
  {
    key: "user",
    header: "Online now",
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
  { key: "status", header: "Compute", render: (n) => <NodeStatusChip status={n.status} /> }
];

export default function NetworkPage() {
  const state = useNetwork();
  const onlineNodes = state.data?.nodes.filter((node) => node.online) ?? [];

  return (
    <div>
      <PageHeader
        eyebrow={<LivePulse />}
        title="Network overview"
        subtitle="Live connected users and the distributed compute fabric updating over SSE."
      />
      <Async state={state}>
        {(snap) => (
          <div style={{ display: "grid", gap: "var(--s5)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--s4)" }}>
              <Card><Stat label="Online now" value={formatInt(snap.stats.onlineUsers ?? snap.connectedUsers.length)} /></Card>
              <Card><Stat label="Active contributors" value={formatInt(snap.stats.activeContributors)} /></Card>
              <Card><Stat label="Total compute" value={formatCompute(snap.stats.totalCompute)} /></Card>
              <Card><Stat label="Running sessions" value={formatInt(snap.stats.runningSessions)} /></Card>
              <Card><Stat label="Tokens emitted 24h" value={formatTokens(snap.stats.tokensEmitted24h)} /></Card>
            </div>
            <Card>
              <h3 style={{ margin: "0 0 var(--s3)" }}>Connected users</h3>
              <Table columns={onlineColumns} rows={onlineNodes} rowKey={(n) => n.id} />
            </Card>
            <Card>
              <h3 style={{ margin: "0 0 var(--s3)" }}>Compute nodes</h3>
              <Table
                columns={[
                  ...onlineColumns.slice(0, 3),
                  { key: "compute", header: "Compute", render: (n) => formatCompute(n.computePower), align: "right", mono: true, sortValue: (n) => n.computePower },
                  { key: "status", header: "Status", render: (n) => <NodeStatusChip status={n.status} /> }
                ]}
                rows={snap.nodes}
                rowKey={(n) => n.id}
              />
            </Card>
          </div>
        )}
      </Async>
    </div>
  );
}
