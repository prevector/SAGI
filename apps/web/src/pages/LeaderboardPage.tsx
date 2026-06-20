import { Async, Card, PageHeader } from "../components/ui";
import { config } from "../lib/config";
import { LeaderboardTable } from "../features/leaderboard/LeaderboardTable";
import { useLeaderboard } from "../features/leaderboard/useLeaderboard";
import { LivePulse } from "../features/network/LivePulse";

export default function LeaderboardPage() {
  const state = useLeaderboard(10);

  return (
    <div>
      <PageHeader
        eyebrow="Standings"
        title="Leaderboard"
        subtitle="The top 10 organisms ranked by best verified learning score, updating live. Your row is marked with a teal bar and a “you” tag — click a column to sort."
        actions={config.features.realtimeLeaderboard ? <LivePulse /> : undefined}
      />
      <Async state={state} isEmpty={(rows) => rows.length === 0}>
        {(rows) => (
          <Card>
            <LeaderboardTable entries={rows} variant="full" />
          </Card>
        )}
      </Async>
    </div>
  );
}
