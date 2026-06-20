import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Async, Avatar, Card, PageHeader, Stat } from "../components/ui";
import { api } from "../lib/api";
import { formatCompute, formatDate, formatInt, formatTokens } from "../lib/format";
import { useAsync } from "../lib/useAsync";
import { UserStatusDot } from "../features/common/status";

export default function ProfilePage() {
  const { username } = useAuth();
  const state = useAsync(() => api.getProfile(username ?? ""), [username]);
  const [displayName, setDisplayName] = useState("");

  return (
    <div>
      <PageHeader eyebrow="Profile" title="Your profile" subtitle="Identity, standing, and what you've contributed to the search." />
      <Async state={state}>
        {(p) => (
          <div style={{ display: "grid", gap: "var(--s5)" }}>
            <Card style={{ display: "flex", gap: "var(--s5)", flexWrap: "wrap", alignItems: "center" }}>
              <Avatar seed={p.avatarSeed} size={72} />
              <div style={{ display: "grid", gap: "var(--s2)" }}>
                <span className="mono" style={{ fontSize: "var(--fs-h2)" }}>{p.username}</span>
                <UserStatusDot status={p.status} />
                <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)", color: "var(--text-faint)", fontSize: "var(--fs-sm)" }}>
                  <CalendarDays size={14} aria-hidden /> Joined {formatDate(p.joinedAt)}
                </span>
              </div>
              <label style={{ display: "grid", gap: "var(--s2)", marginLeft: "auto", fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                Display name (local)
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={p.username}
                  style={{ padding: "var(--s2) var(--s3)", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--text)" }}
                />
              </label>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--s4)" }}>
              <Card><Stat label="Rank" value={`#${p.rank}`} /></Card>
              <Card><Stat label="Total tokens" value={formatTokens(p.totalTokens)} /></Card>
              <Card><Stat label="Compute contributed" value={formatCompute(p.computeContributed, "GFLOP-h")} /></Card>
              <Card><Stat label="Sessions run" value={formatInt(p.sessionsRun)} /></Card>
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}
