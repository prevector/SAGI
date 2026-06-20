import { useAuth } from "../../auth/AuthContext";
import { Avatar, Stat } from "../../components/ui";
import { api } from "../../lib/api";
import { formatInt, formatTokens } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { Widget } from "../../components/dashboard/Widget";
import { UserStatusDot } from "../common/status";

export function ProfileWidget() {
  const { username } = useAuth();
  const state = useAsync(() => api.getProfile(username ?? ""), [username]);

  return (
    <Widget title="Profile" eyebrow="You" to="/app/profile" state={state}>
      {(p) => (
        <div style={{ display: "grid", gap: "var(--s4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
            <Avatar seed={p.avatarSeed} size={46} />
            <div style={{ display: "grid", gap: "var(--s1)" }}>
              <span className="mono" style={{ fontSize: "var(--fs-body)" }}>{p.username}</span>
              <UserStatusDot status={p.status} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--s6)" }}>
            <Stat label="Rank" value={`#${p.rank}`} />
            <Stat label="Tokens" value={formatTokens(p.totalTokens)} />
            <Stat label="Sessions" value={formatInt(p.sessionsRun)} />
          </div>
        </div>
      )}
    </Widget>
  );
}
