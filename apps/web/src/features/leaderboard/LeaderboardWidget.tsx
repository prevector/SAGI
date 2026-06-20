import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { Widget } from "../../components/dashboard/Widget";
import { LeaderboardTable } from "./LeaderboardTable";

export function LeaderboardWidget() {
  const state = useAsync(() => api.getLeaderboard({ limit: 5 }), []);

  return (
    <Widget title="Leaderboard" eyebrow="Top organisms" to="/app/leaderboard" state={state} isEmpty={(rows) => rows.length === 0}>
      {(rows) => <LeaderboardTable entries={rows} variant="compact" />}
    </Widget>
  );
}
