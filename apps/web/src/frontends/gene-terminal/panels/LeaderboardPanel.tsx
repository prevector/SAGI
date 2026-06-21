import type { IDockviewPanelProps } from "dockview";
import type { FootballLeaderboardDivision, FootballLeaderboardSnapshot } from "@sagi/shared";
import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../../../lib/request";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

function entrantLabel(division: FootballLeaderboardDivision, index: number | null): string {
  if (index === null) return "bye";
  const entrant = division.tournament.entrants.find((item) => item.index === index);
  return entrant ? `${entrant.username} / ${entrant.creatureName}` : `entrant ${index + 1}`;
}

export function LeaderboardPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const [leaderboard, setLeaderboard] = useState<FootballLeaderboardSnapshot | null>(null);
  const [showTournament, setShowTournament] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      try {
        const next = await fetchJson<FootballLeaderboardSnapshot>("/api/football/leaderboard");
        if (!cancelled) {
          setLeaderboard(next);
        }
      } catch (error) {
        console.warn("Failed to load football leaderboard.", error);
      }
    }

    void loadLeaderboard();
    const timer = window.setInterval(loadLeaderboard, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const division = useMemo(() => (
    leaderboard?.divisions.find((entry) => (
      entry.hiddenSize === (terminal.footballBest?.hiddenSize ?? terminal.hiddenSize) &&
      entry.teamSize === (terminal.footballBest?.teamSize ?? terminal.footballTeamSize) &&
      entry.matchTicks === (terminal.footballBest?.matchTicks ?? terminal.footballMatchTicks)
    )) ?? leaderboard?.divisions[0] ?? null
  ), [leaderboard, terminal.footballBest, terminal.footballMatchTicks, terminal.footballTeamSize, terminal.hiddenSize]);

  if (!division) {
    return (
      <section className={`${styles.panel} ${styles.panelLeaderboard}`}>
        <div className={styles.note}>No server leaderboard yet.</div>
      </section>
    );
  }

  return (
    <section className={`${styles.panel} ${styles.panelLeaderboard}`}>
      <div className={styles.leaderboardMeta}>
        <span>{division.teamSize}v{division.teamSize}</span>
        <span>{division.entrants} entries</span>
        <button
          className={styles.leaderboardGraphButton}
          type="button"
          onClick={() => setShowTournament((value) => !value)}
        >
          {showTournament ? "hide tournament" : "show tournament"}
        </button>
      </div>
      <div className={styles.leaderboardList}>
        {division.rows.map((row) => (
          <div key={`${row.username}:${row.creatureId}`} className={styles.leaderboardRow}>
            <span className={styles.leaderboardRank}>{row.rank}</span>
            <div className={styles.leaderboardIdentity}>
              <strong>{row.username}</strong>
              <span>{row.creatureName}</span>
            </div>
            <b>{row.verifiedScore.toFixed(1)}</b>
          </div>
        ))}
      </div>
      {showTournament ? (
        <div className={styles.tournamentGraph}>
          {Array.from(new Set(division.tournament.matches.map((match) => match.round))).map((round) => (
            <div key={round} className={styles.tournamentRound}>
              <b>round {round + 1}</b>
              {division.tournament.matches
                .filter((match) => match.round === round)
                .map((match) => (
                  <div key={match.id} className={styles.tournamentMatch}>
                    <span className={match.winnerIndex === match.leftIndex ? styles.tournamentWinner : ""}>
                      {entrantLabel(division, match.leftIndex)}
                    </span>
                    <span className={match.winnerIndex === match.rightIndex ? styles.tournamentWinner : ""}>
                      {entrantLabel(division, match.rightIndex)}
                    </span>
                    <em>{match.score ? `${match.score[0]}-${match.score[1]}` : "bye"}</em>
                  </div>
                ))}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
