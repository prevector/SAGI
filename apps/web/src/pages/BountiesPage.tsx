import { useSearchParams } from "react-router-dom";
import { Async, PageHeader } from "../components/ui";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { BountyCard } from "../features/bounties/BountyCard";
import styles from "./BountiesPage.module.css";

type Tab = "current" | "history";

export default function BountiesPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "history" ? "history" : "current";
  const state = useAsync(() => api.getBounties(), []);

  return (
    <div>
      <PageHeader
        eyebrow="Direct the search"
        title="Bounties"
        subtitle="Sponsored challenges that focus the population. Start a session against any open bounty."
      />

      <div className={styles.tabs} role="tablist" aria-label="Bounty status">
        {(["current", "history"] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={[styles.tab, tab === t ? styles.active : ""].join(" ")}
            onClick={() => setParams(t === "current" ? {} : { tab: "history" })}
          >
            {t === "current" ? "Current" : "History"}
          </button>
        ))}
      </div>

      <Async
        state={state}
        isEmpty={(all) => all.filter((b) => (tab === "history" ? b.status === "closed" : b.status !== "closed")).length === 0}
        emptyTitle={tab === "history" ? "No closed bounties yet" : "No open bounties"}
        emptyMessage={tab === "history" ? "Results will appear here once bounties close." : "Check back soon for new challenges."}
      >
        {(all) => {
          const list = all.filter((b) => (tab === "history" ? b.status === "closed" : b.status !== "closed"));
          return (
            <div className={styles.grid}>
              {list.map((b) => (
                <BountyCard key={b.id} bounty={b} />
              ))}
            </div>
          );
        }}
      </Async>
    </div>
  );
}
