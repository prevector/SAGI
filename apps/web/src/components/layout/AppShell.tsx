import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { SkeletonLines } from "../ui";
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
          <Suspense fallback={<SkeletonLines count={6} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
