import { useEffect, useState } from "react";
import { LogOut, Rocket, Trophy, Coins, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { LeaderboardEntry, Profile } from "../../lib/types";
import { formatCompute, formatDate, formatInt, formatTokens } from "../../lib/format";
import styles from "./AccountModal.module.css";

interface AccountModalProps {
  username: string;
  onClose: () => void;
  onLogout: () => void;
}

/**
 * Account overlay opened from the terminal menu bar. Shows the signed-in
 * sponsor's profile, lifetime tokens and bounties, a launch-bounty CTA, and
 * the logout action (which used to live directly in the menu bar).
 */
export function AccountModal({ username, onClose, onLogout }: AccountModalProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setError(false);
    Promise.all([api.getProfile(username), api.getLeaderboard()])
      .then(([p, board]) => {
        if (!active) return;
        setProfile(p);
        setMe(board.find((row) => row.isCurrentUser) ?? board.find((row) => row.username === username) ?? null);
      })
      .catch(() => active && setError(true));
    return () => {
      active = false;
    };
  }, [username]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const initials = username.slice(0, 2).toUpperCase();
  const totalTokens = profile?.totalTokens ?? me?.tokens ?? null;
  const bountiesWon = me?.bountiesWon ?? null;

  return (
    <div className={styles.overlay} onPointerDown={onClose} role="presentation">
      <div
        className={styles.modal}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Account"
      >
        <header className={styles.header}>
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden>
              {initials}
            </span>
            <div className={styles.identityText}>
              <span className={styles.username}>{username}</span>
              <span className={styles.subline}>
                {profile ? `Rank #${formatInt(profile.rank)} · ${profile.status}` : "Sponsor account"}
              </span>
            </div>
          </div>
          <button className={styles.iconButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <section className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>
              <Coins size={15} />
            </span>
            <span className={styles.statValue}>{totalTokens === null ? "—" : formatTokens(totalTokens)}</span>
            <span className={styles.statLabel}>Tokens earned</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>
              <Trophy size={15} />
            </span>
            <span className={styles.statValue}>{bountiesWon === null ? "—" : formatInt(bountiesWon)}</span>
            <span className={styles.statLabel}>Bounties collected</span>
          </div>
        </section>

        <section className={styles.details}>
          <Row label="Member since" value={profile ? formatDate(profile.joinedAt) : "—"} />
          <Row label="Compute contributed" value={profile ? formatCompute(profile.computeContributed, "GFLOP-h") : "—"} />
          <Row label="Sessions run" value={profile ? formatInt(profile.sessionsRun) : "—"} />
          {error ? <p className={styles.error}>Could not load profile data.</p> : null}
        </section>

        <button
          className={styles.launchButton}
          onClick={() => {
            onClose();
            navigate("/app/launch-bounty");
          }}
        >
          <Rocket size={16} />
          Launch a bounty
        </button>

        <footer className={styles.footer}>
          <button className={styles.logoutButton} onClick={onLogout}>
            <LogOut size={14} />
            Log out
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}
