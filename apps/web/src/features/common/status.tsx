import { Ban, Check, CircleDot, Clock, Loader, Play, X } from "lucide-react";
import { StatusChip } from "../../components/ui";
import type { BountyStatus, NodeStatus, SessionStatus, UserStatus } from "../../lib/types";
import styles from "./status.module.css";

// Central colorblind-safe mappings: every status carries colour + icon + text.

export function BountyStatusChip({ status }: { status: BountyStatus }) {
  switch (status) {
    case "open":
      return <StatusChip tone="teal" icon={<CircleDot size={13} />} label="Open" />;
    case "active":
      return <StatusChip tone="orange" icon={<Play size={13} />} label="Active" />;
    case "closed":
      return <StatusChip tone="neutral" icon={<Check size={13} />} label="Closed" />;
  }
}

export function SessionStatusChip({ status }: { status: SessionStatus }) {
  switch (status) {
    case "queued":
      return <StatusChip tone="neutral" icon={<Clock size={13} />} label="Queued" />;
    case "running":
      return <StatusChip tone="orange" icon={<Loader size={13} />} label="Running" />;
    case "completed":
      return <StatusChip tone="positive" icon={<Check size={13} />} label="Completed" />;
    case "failed":
      return <StatusChip tone="negative" icon={<X size={13} />} label="Failed" />;
  }
}

export function NodeStatusChip({ status }: { status: NodeStatus }) {
  return status === "active" ? (
    <StatusChip tone="teal" icon={<CircleDot size={13} />} label="Active" />
  ) : (
    <StatusChip tone="neutral" icon={<Clock size={13} />} label="Idle" />
  );
}

const USER_STATUS = {
  online: { tone: "var(--accent)", label: "Online", Icon: CircleDot },
  idle: { tone: "var(--accent-2)", label: "Idle", Icon: Clock },
  offline: { tone: "var(--text-faint)", label: "Offline", Icon: Ban }
} as const;

/** Compact dot + label for a user's presence. */
export function UserStatusDot({ status }: { status: UserStatus }) {
  const { tone, label, Icon } = USER_STATUS[status];
  return (
    <span className={styles.userStatus} style={{ color: tone }}>
      <Icon size={13} aria-hidden /> {label}
    </span>
  );
}
