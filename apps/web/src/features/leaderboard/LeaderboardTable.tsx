import { Trophy } from "lucide-react";
import { Avatar, type Column, Delta, Table, Tag } from "../../components/ui";
import type { LeaderboardEntry } from "../../lib/types";
import { formatCompute, formatScore, formatTokens } from "../../lib/format";
import styles from "./LeaderboardTable.module.css";

function nameCell(e: LeaderboardEntry) {
  return (
    <span className={styles.name}>
      <Avatar seed={e.username} size={24} />
      <span className="mono">{e.username}</span>
      {e.isCurrentUser ? <Tag tone="teal">you</Tag> : null}
    </span>
  );
}

// Bounties won — icon + number so it never relies on colour alone.
function bountiesCell(e: LeaderboardEntry) {
  return (
    <span className={e.bountiesWon > 0 ? styles.bounties : styles.bountiesZero}>
      <Trophy size={13} aria-hidden />
      <span className="mono">{e.bountiesWon}</span>
    </span>
  );
}

export function LeaderboardTable({ entries, variant = "full" }: { entries: LeaderboardEntry[]; variant?: "compact" | "full" }) {
  const columns: Column<LeaderboardEntry>[] = [
    { key: "rank", header: "#", render: (e) => e.rank, mono: true, sortValue: variant === "full" ? (e) => e.rank : undefined },
    { key: "user", header: "Organism", render: nameCell, sortValue: variant === "full" ? (e) => e.username : undefined },
    {
      key: "score",
      header: "Score",
      render: (e) => formatScore(e.score),
      align: "right",
      mono: true,
      sortValue: variant === "full" ? (e) => e.score : undefined
    },
    {
      key: "bounties",
      header: "Bounties",
      render: bountiesCell,
      align: "right",
      sortValue: variant === "full" ? (e) => e.bountiesWon : undefined
    }
  ];

  if (variant === "full") {
    columns.push(
      {
        key: "tokens",
        header: "Tokens",
        render: (e) => formatTokens(e.tokens),
        align: "right",
        mono: true,
        sortValue: (e) => e.tokens
      },
      {
        key: "compute",
        header: "Compute",
        render: (e) => formatCompute(e.computePower),
        align: "right",
        mono: true,
        sortValue: (e) => e.computePower
      },
      {
        key: "delta",
        header: "24h",
        render: (e) => (e.delta !== undefined ? <Delta value={e.delta} format={formatTokens} /> : "—"),
        align: "right",
        sortValue: (e) => e.delta ?? 0
      }
    );
  }

  return <Table columns={columns} rows={entries} rowKey={(e) => e.userId} highlight={(e) => Boolean(e.isCurrentUser)} />;
}
