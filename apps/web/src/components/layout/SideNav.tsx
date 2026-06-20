import { NavLink } from "react-router-dom";
import { config } from "../../lib/config";
import { navItems } from "./navItems";
import styles from "./SideNav.module.css";

export function SideNav() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.brand}>
        <span className={styles.mark}>{config.brand.name}</span>
      </div>
      <ul className={styles.list}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/"}
              className={({ isActive }) => [styles.link, isActive ? styles.active : ""].join(" ")}
            >
              <Icon size={18} aria-hidden className={styles.icon} />
              <span className={styles.label}>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
