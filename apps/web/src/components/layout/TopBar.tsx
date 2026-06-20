import { LogOut } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ComputeMetricsWidget } from "../../features/compute-metrics";
import { Avatar, Button } from "../ui";
import styles from "./TopBar.module.css";

export function TopBar() {
  const { username, logout, mode } = useAuth();

  return (
    <header className={styles.bar}>
      <div className={styles.modeTag} title="Auth mode">
        {mode}
      </div>
      <ComputeMetricsWidget />
      <div className={styles.user}>
        {username ? <Avatar seed={username} size={30} /> : null}
        <span className={styles.username}>{username}</span>
        <Button variant="ghost" size="sm" icon={<LogOut size={15} />} onClick={() => void logout()}>
          Log out
        </Button>
      </div>
    </header>
  );
}
