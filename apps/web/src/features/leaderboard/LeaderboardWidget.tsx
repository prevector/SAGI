import { config } from "../../lib/config";
import { Widget } from "../../components/dashboard/Widget";
import { LivePulse } from "../network/LivePulse";
import { LeaderboardTable } from "./LeaderboardTable";
import { useLeaderboard } from "./useLeaderboard";

export function LeaderboardWidget() {
  const state = useLeaderboard(10);

  return (
    <Widget
      title="Leaderboard"
      eyebrow={config.features.realtimeLeaderboard ? <LivePulse /> : "Top organisms"}
      to="/app/leaderboard"
      state={state}
      isEmpty={(rows) => rows.length === 0}
    >
      {(rows) => <LeaderboardTable entries={rows} variant="compact" />}
    </Widget>
  );
}
