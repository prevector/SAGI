import { Outlet } from "react-router-dom";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

export function AppShell() {
  return (
    <div className={styles.shell}>
      <aside className={styles.aside}>
        <SideNav />
      </aside>
      <div className={styles.main}>
        <TopBar />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
