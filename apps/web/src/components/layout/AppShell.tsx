import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SkeletonLines } from "../ui";
import { DemoControls } from "../../features/demo/DemoControls";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

export function AppShell() {
  useEffect(() => {
    document.title = "SAGI Dashboard";
  }, []);

  return (
    <div className={styles.shell}>
      <aside className={styles.aside}>
        <SideNav />
      </aside>
      <div className={styles.main}>
        <TopBar />
        <main className={styles.content}>
          <Suspense fallback={<SkeletonLines count={6} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      {/* Self-hides unless the ledger reports demo mode. */}
      <DemoControls />
    </div>
  );
}
