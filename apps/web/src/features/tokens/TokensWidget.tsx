import { useAuth } from "../../auth/AuthContext";
import { Delta, Sparkline, Stat } from "../../components/ui";
import { api } from "../../lib/api";
import { formatTokens } from "../../lib/format";
import { useAsync } from "../../lib/useAsync";
import { Widget } from "../../components/dashboard/Widget";

export function TokensWidget() {
  const { username } = useAuth();
  const state = useAsync(() => api.getTokens(username ?? ""), [username]);

  return (
    <Widget title="Tokens earned" eyebrow="Economy" to="/tokens" state={state}>
      {(t) => (
        <div style={{ display: "grid", gap: "var(--s4)" }}>
          <Stat
            label="Total balance"
            size="lg"
            value={formatTokens(t.total)}
            delta={<Delta value={t.earned24h} format={formatTokens} />}
            hint="last 24h"
          />
          <Sparkline values={t.history.map((p) => p.v)} width={260} height={48} />
        </div>
      )}
    </Widget>
  );
}
