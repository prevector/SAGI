import { Link } from "react-router-dom";
import { Cpu, FlaskConical, LineChart, Bot, Dna, Building2, Trophy, Users, type LucideIcon } from "lucide-react";
import { Button, Card, ProgressBar, Tag } from "../../components/ui";
import type { Bounty, SponsorType } from "../../lib/types";
import { formatInt, formatTokens } from "../../lib/format";
import { BountyStatusChip } from "../common/status";
import styles from "./BountyCard.module.css";

const SPONSOR_ICON: Record<SponsorType, LucideIcon> = {
  hardware: Cpu,
  quant: LineChart,
  biotech: Dna,
  robotics: Bot,
  lab: FlaskConical
};

export function BountyCard({ bounty, compact = false }: { bounty: Bounty; compact?: boolean }) {
  const Icon = SPONSOR_ICON[bounty.sponsorType] ?? Building2;
  const closed = bounty.status === "closed";

  return (
    <Card as="article" muted={closed} className={styles.card}>
      <div className={styles.top}>
        <Tag tone="neutral" icon={<Icon size={12} />}>{bounty.sponsorType}</Tag>
        <BountyStatusChip status={bounty.status} />
      </div>

      <h3 className={styles.title}>
        <Link to={`/bounties/${bounty.id}`}>{bounty.title}</Link>
      </h3>
      <p className={styles.sponsor}>{bounty.sponsor}</p>

      {!compact ? <p className={styles.desc}>{bounty.description}</p> : null}

      <div className={styles.reward}>
        <span className={styles.rewardValue}>{formatTokens(bounty.rewardTokens)}</span>
        <span className={styles.rewardUnit}>SAGI reward</span>
      </div>

      {closed ? (
        <div className={styles.closedRow}>
          <span className={styles.meta}>
            <Trophy size={14} aria-hidden /> {bounty.winner ?? "—"}
          </span>
          {bounty.finalMetric !== undefined ? (
            <span className={styles.meta}>
              {bounty.targetMetric}: <b className="mono">{bounty.finalMetric}</b>
            </span>
          ) : null}
        </div>
      ) : (
        <ProgressBar value={bounty.progress} label={bounty.targetMetric} tone="teal" />
      )}

      <div className={styles.footer}>
        <span className={styles.meta}>
          <Users size={14} aria-hidden /> {formatInt(bounty.participants)} in
        </span>
        {!closed ? (
          <Link to={`/session?bounty=${bounty.id}`}>
            <Button size="sm" variant="primary">Start session</Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
