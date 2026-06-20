import { useCallback, useEffect, useState } from "react";
import { FastForward, FlaskConical, Pause, Play, Trophy, X, Zap } from "lucide-react";
import { Button, Card } from "../../components/ui";
import { fetchJson } from "../../lib/request";

// Hidden demo control panel. Only renders when the ledger is in demo mode
// (GET /api/demo/state). Lets a presenter direct the showcase: trigger a
// breakthrough, win a bounty live, advance an epoch, pause/resume the driver.

interface DemoState {
  demo: boolean;
  driverRunning?: boolean;
  openBounties?: number;
  epoch?: number;
}

interface ActionResult {
  ok?: boolean;
  title?: string;
  winner?: string;
  reason?: string;
  epoch?: number;
}

export function DemoControls() {
  const [state, setState] = useState<DemoState | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await fetchJson<DemoState>("/api/demo/state"));
    } catch {
      setState({ demo: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = useCallback(
    async (path: string, body?: Record<string, unknown>) => {
      setBusy(true);
      try {
        const r = await fetchJson<ActionResult>(path, {
          method: "POST",
          ...(body ? { body: JSON.stringify(body) } : {})
        });
        setFlash(r.title ? `${r.winner} won “${r.title}”` : r.reason ? r.reason : "Done");
        await refresh();
      } catch {
        setFlash("Action failed");
      } finally {
        setBusy(false);
        setTimeout(() => setFlash(null), 3500);
      }
    },
    [refresh]
  );

  if (!state?.demo) return null;

  const wrap: React.CSSProperties = { position: "fixed", right: "var(--s4)", bottom: "var(--s4)", zIndex: 60 };

  if (!open) {
    return (
      <div style={wrap}>
        <Button size="sm" variant="primary" icon={<FlaskConical size={15} />} onClick={() => setOpen(true)}>
          Demo
        </Button>
      </div>
    );
  }

  return (
    <div style={{ ...wrap, width: 248 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s3)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--s2)", fontSize: "var(--fs-sm)" }}>
            <FlaskConical size={14} aria-hidden /> Demo controls
          </span>
          <span className="mono" style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>
            epoch {state.epoch ?? "—"}
          </span>
        </div>
        <div style={{ display: "grid", gap: "var(--s2)" }}>
          <Button size="sm" variant="primary" icon={<Trophy size={15} />} disabled={busy} onClick={() => act("/api/demo/breakthrough")}>
            Trigger breakthrough
          </Button>
          <Button size="sm" variant="reward" icon={<Zap size={15} />} disabled={busy} onClick={() => act("/api/demo/win")}>
            Make me win
          </Button>
          <Button size="sm" variant="ghost" icon={<FastForward size={15} />} disabled={busy} onClick={() => act("/api/demo/advance-epoch")}>
            Advance epoch
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={state.driverRunning ? <Pause size={15} /> : <Play size={15} />}
            disabled={busy}
            onClick={() => act("/api/demo/driver", { running: !state.driverRunning })}
          >
            {state.driverRunning ? "Pause driver" : "Resume driver"}
          </Button>
        </div>
        {flash ? (
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--accent-2)", marginTop: "var(--s3)" }}>{flash}</p>
        ) : null}
        <button
          onClick={() => setOpen(false)}
          aria-label="Close demo controls"
          style={{ position: "absolute", top: "var(--s3)", right: "var(--s3)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
        >
          <X size={15} />
        </button>
      </Card>
    </div>
  );
}
