import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { Button, ProgressBar } from "../../components/ui";
import { api } from "../../lib/api";
import { formatTokens } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { Widget } from "../../components/dashboard/Widget";
import { SessionStatusChip } from "../common/status";

export function SessionWidget() {
  const { username } = useAuth();
  const state = useAsync(() => api.getSessions(username ?? ""), [username]);

  return (
    <Widget title="Sessions" eyebrow="Run the search" to="/session" state={state} isEmpty={(s) => s.length === 0}>
      {(sessions) => {
        const latest = sessions[0];
        return (
          <div style={{ display: "grid", gap: "var(--s4)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--s3)" }}>
              <span className="mono" style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                {latest.id}
              </span>
              <SessionStatusChip status={latest.status} />
            </div>
            {latest.status === "running" ? (
              <ProgressBar value={latest.progress} label="Progress" tone="orange" />
            ) : latest.status === "completed" ? (
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
                Earned <b className="mono" style={{ color: "var(--accent-2)" }}>{formatTokens(latest.tokensEarned ?? 0)}</b>
              </p>
            ) : (
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>{latest.result ?? "—"}</p>
            )}
            <Link to="/session">
              <Button size="sm" variant="primary" icon={<Zap size={15} />}>Start a session</Button>
            </Link>
          </div>
        );
      }}
    </Widget>
  );
}
