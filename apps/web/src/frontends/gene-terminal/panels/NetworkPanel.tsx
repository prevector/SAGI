import type { IDockviewPanelProps } from "dockview";
import { useAuth } from "../../../auth/AuthContext";
import { useNetwork } from "../../../features/network/useNetwork";
import { NetworkGraphViewport } from "../NetworkGraphViewport";
import styles from "../GeneTerminal.module.css";

export function NetworkPanel(_: IDockviewPanelProps) {
  const { username } = useAuth();
  const network = useNetwork();
  const users = network.data?.nodes ?? [];
  const onlineCount = users.reduce((sum, user) => sum + (user.online ? 1 : 0), 0);

  return (
    <section className={`${styles.panel} ${styles.networkPanel}`}>
      <div className={styles.networkHeader}>
        <strong>{network.loading ? "Syncing..." : `${users.length} known · ${onlineCount} online`}</strong>
      </div>
      <NetworkGraphViewport users={users} currentUser={username} />
    </section>
  );
}
