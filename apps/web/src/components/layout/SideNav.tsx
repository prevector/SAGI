import { NavLink } from "react-router-dom";
import { navItems } from "./navItems";
import { SagiLogo } from "../ui/SagiLogo";
import styles from "./SideNav.module.css";

export function SideNav() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.brand}>
        <SagiLogo height={24} className={styles.mark} />
      </div>
      <ul className={styles.list}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/app"}
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
