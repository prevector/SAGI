import { Award, Cpu, Flame, Lock, Scissors, type LucideIcon } from "lucide-react";
import type { TokenReason } from "../../lib/types";

interface ReasonMeta {
  label: string;
  Icon: LucideIcon;
  /** earned (teal) vs spent (orange) axis. */
  kind: "earn" | "spend";
}

export const REASON_META: Record<TokenReason, ReasonMeta> = {
  compute: { label: "Compute", Icon: Cpu, kind: "earn" },
  bounty: { label: "Bounty", Icon: Award, kind: "earn" },
  stake: { label: "Stake", Icon: Lock, kind: "spend" },
  slash: { label: "Slash", Icon: Scissors, kind: "spend" },
  burn: { label: "Burn", Icon: Flame, kind: "spend" }
};
