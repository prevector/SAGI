import { Check, Circle } from "lucide-react";
import { ProgressBar } from "../../components/ui";
import { api } from "../../lib/api";
import { useAsync } from "../../lib/useAsync";
import { Widget } from "../../components/dashboard/Widget";

export function ProgressWidget() {
  const state = useAsync(() => api.getProgress(), []);

  return (
    <Widget title="Progress to AGI" eyebrow="The search" to="/progress" state={state}>
      {(p) => {
        const reached = p.milestones.filter((m) => m.reachedAt).length;
        return (
          <div style={{ display: "grid", gap: "var(--s4)" }}>
            <ProgressBar value={p.overallProgress} label="Overall progress" />
            <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>{p.headline}</p>
            <p style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)", fontSize: "var(--fs-sm)" }}>
              <Check size={14} aria-hidden style={{ color: "var(--accent)" }} /> {reached} reached
              <Circle size={12} aria-hidden style={{ color: "var(--text-faint)", marginLeft: "var(--s3)" }} />
              {p.milestones.length - reached} upcoming
            </p>
          </div>
        );
      }}
    </Widget>
  );
}
