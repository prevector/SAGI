import { Stat } from "../../components/ui";
import { formatCompute, formatInt, formatTokens } from "../../lib/format";
import { Widget } from "../../components/dashboard/Widget";
import { LivePulse } from "./LivePulse";
import { useNetwork } from "./useNetwork";

export function NetworkWidget() {
  const state = useNetwork();

  return (
    <Widget title="Network" eyebrow={<LivePulse />} to="/network" state={state}>
      {(snap) => (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s5)" }}>
          <Stat label="Active contributors" value={formatInt(snap.stats.activeContributors)} />
          <Stat label="Running sessions" value={formatInt(snap.stats.runningSessions)} />
          <Stat label="Total compute" value={formatCompute(snap.stats.totalCompute)} />
          <Stat label="Tokens 24h" value={formatTokens(snap.stats.tokensEmitted24h)} />
        </div>
      )}
    </Widget>
  );
}
