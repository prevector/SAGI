import type { IDockviewPanelProps } from "dockview";
import type { FootballLeaderboardSnapshot } from "@sagi/shared";
import { useEffect, useMemo, useState } from "react";
import { useGeneTerminal } from "../state";
import styles from "../GeneTerminal.module.css";

export function LeaderboardPanel(_: IDockviewPanelProps) {
  const terminal = useGeneTerminal();
  const [leaderboard, setLeaderboard] = useState<FootballLeaderboardSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      try {
        const response = await fetch("/api/football/leaderboard");
        if (!response.ok) {
          return;
        }
        const next = await response.json() as FootballLeaderboardSnapshot;
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
      </div>
      <div className={styles.leaderboardList}>
        {division.rows.slice(0, 8).map((row) => (
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
    </section>
  );
}
