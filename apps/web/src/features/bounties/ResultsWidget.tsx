import { Trophy } from "lucide-react";
import { Avatar } from "../../components/ui";
import { api } from "../../lib/api";
import { formatTokens } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { Widget } from "../../components/dashboard/Widget";

export function ResultsWidget() {
  const state = useAsync(() => api.getBounties("closed"), []);

  return (
    <Widget
      title="Recent results"
      eyebrow="Historic bounties"
      to="/bounties?tab=history"
      state={state}
      isEmpty={(rows) => rows.length === 0}
    >
      {(rows) => (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "var(--s3)" }}>
          {rows.slice(0, 3).map((b) => (
            <li
              key={b.id}
              style={{ display: "flex", alignItems: "center", gap: "var(--s3)", justifyContent: "space-between" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "var(--s2)", minWidth: 0 }}>
                <Avatar seed={b.winner ?? b.id} size={24} />
                <span style={{ display: "grid", minWidth: 0 }}>
                  <span style={{ fontSize: "var(--fs-sm)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {b.title}
                  </span>
                  <span className="mono" style={{ fontSize: "var(--fs-mono)", color: "var(--text-muted)" }}>
                    <Trophy size={11} aria-hidden /> {b.winner}
                  </span>
                </span>
              </span>
              <span className="mono" style={{ color: "var(--accent-2)", whiteSpace: "nowrap" }}>
                {formatTokens(b.rewardTokens)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}
