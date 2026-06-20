import { useAuth } from "../auth/AuthContext";
import { PageHeader } from "../components/ui";
import { config } from "../lib/config";
import { ProfileWidget } from "../features/profile/ProfileWidget";
import { TokensWidget } from "../features/tokens/TokensWidget";
import { LeaderboardWidget } from "../features/leaderboard/LeaderboardWidget";
import { BountiesWidget } from "../features/bounties/BountiesWidget";
import { ResultsWidget } from "../features/bounties/ResultsWidget";
import { ProgressWidget } from "../features/progress/ProgressWidget";
import { NetworkWidget } from "../features/network/NetworkWidget";
import { SessionWidget } from "../features/session/SessionWidget";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { username } = useAuth();

  return (
    <div>
      <PageHeader
        eyebrow={config.brand.name}
        title={`Welcome, ${username}.`}
        subtitle="A live view of the distributed search — your standing, the network, and the bounties directing it."
      />

      <div className={styles.grid}>
        <div className={styles.wide}>
          <ProgressWidget />
        </div>
        <div className={styles.narrow}>
          <ProfileWidget />
        </div>

        <TokensWidget />
        <NetworkWidget />

        <div className={styles.wide}>
          <LeaderboardWidget />
        </div>
        <div className={styles.narrow}>
          <SessionWidget />
        </div>

        <BountiesWidget />
        <ResultsWidget />
      </div>
    </div>
  );
}
