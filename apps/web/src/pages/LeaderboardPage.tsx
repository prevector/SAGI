import { Async, Card, PageHeader } from "../components/ui";
import { api } from "../lib/api";
import { useAsync } from "../lib/useAsync";
import { LeaderboardTable } from "../features/leaderboard/LeaderboardTable";

export default function LeaderboardPage() {
  const state = useAsync(() => api.getLeaderboard(), []);

  return (
    <div>
      <PageHeader
        eyebrow="Standings"
        title="Leaderboard"
        subtitle="Verified organisms ranked by tokens earned. Your row is marked with a teal bar and a “you” tag — click a column to sort."
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
