import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Target, Trophy, Users } from "lucide-react";
import { Async, Button, Card, PageHeader, ProgressBar, Stat, Tag } from "../components/ui";
import { api } from "../lib/api";
import { formatDate, formatInt, formatTokens } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { BountyStatusChip } from "../features/common/status";

export default function BountyDetailPage() {
  const { id = "" } = useParams();
  const state = useAsync(() => api.getBounty(id), [id]);

  return (
    <div>
      <Link to="/bounties" style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)", color: "var(--text-muted)", marginBottom: "var(--s4)" }}>
        <ArrowLeft size={16} aria-hidden /> All bounties
      </Link>

      <Async state={state}>
        {(b) => (
          <div style={{ display: "grid", gap: "var(--s5)" }}>
            <PageHeader
              eyebrow={b.sponsor}
              title={b.title}
              subtitle={b.description}
              actions={
                b.status !== "closed" ? (
                  <Link to={`/session?bounty=${b.id}`}>
                    <Button variant="primary">Start session</Button>
                  </Link>
                ) : undefined
              }
            />

            <div style={{ display: "flex", gap: "var(--s3)", flexWrap: "wrap", alignItems: "center" }}>
              <BountyStatusChip status={b.status} />
              <Tag tone="neutral">{b.sponsorType}</Tag>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)", color: "var(--text-muted)", fontSize: "var(--fs-sm)" }}>
                <Users size={14} aria-hidden /> {formatInt(b.participants)} participants
              </span>
              <span style={{ color: "var(--text-faint)", fontSize: "var(--fs-sm)" }}>Opened {formatDate(b.createdAt)}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--s4)" }}>
              <Card><Stat label="Reward" icon={<Trophy size={16} />} value={<span style={{ color: "var(--accent-2)" }}>{formatTokens(b.rewardTokens)}</span>} /></Card>
              <Card><Stat label="Target metric" icon={<Target size={16} />} value={b.target ?? "—"} hint={b.targetMetric} /></Card>
              {b.status === "closed" ? (
                <>
                  <Card><Stat label="Winner" value={<span className="mono">{b.winner ?? "—"}</span>} /></Card>
                  <Card><Stat label="Final metric" value={<span className="mono">{b.finalMetric ?? "—"}</span>} hint={b.closedAt ? `Closed ${formatDate(b.closedAt)}` : undefined} /></Card>
                </>
              ) : (
                <Card style={{ gridColumn: "span 2", display: "grid", alignContent: "center" }}>
                  <ProgressBar value={b.progress} label={`Progress · ${b.targetMetric}`} />
                </Card>
              )}
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}
