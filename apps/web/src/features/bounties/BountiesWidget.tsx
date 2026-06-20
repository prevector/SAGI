import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { Widget } from "../../components/dashboard/Widget";
import { BountyCard } from "./BountyCard";

export function BountiesWidget() {
  const state = useAsync(() => api.getBounties(), []);

  return (
    <Widget
      title="Current bounties"
      eyebrow="Direct the search"
      to="/app/bounties"
      state={state}
      isEmpty={(all) => all.filter((b) => b.status !== "closed").length === 0}
      emptyMessage="No open bounties right now."
    >
      {(all) => (
        <div style={{ display: "grid", gap: "var(--s4)" }}>
          {all
            .filter((b) => b.status !== "closed")
            .slice(0, 2)
            .map((b) => (
              <BountyCard key={b.id} bounty={b} compact />
            ))}
        </div>
      )}
    </Widget>
  );
}
