// Live demo driver (demo mode only). On a timer it emits plausible activity —
// synthetic contributors earning, the occasional bounty closing — so the
// leaderboard and network move during a showcase with nobody running real
// compute. Pausable/scriptable via the control panel. The driver is the "live"
// (non-deterministic) layer; the genesis fixtures are the deterministic one.

import type { LedgerService } from "./service.js";

export class DemoDriver {
  private timer: ReturnType<typeof setInterval> | null = null;
  private _running = false;

  constructor(private readonly service: LedgerService, private readonly intervalMs = 6000) {}

  get running(): boolean {
    return this._running;
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    this._running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setRunning(running: boolean): void {
    if (running) this.start();
    else this.stop();
  }

  private tick(): void {
    try {
      const ws = this.service.syntheticWallets();
      if (ws.length > 0) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          const addr = ws[Math.floor(Math.random() * ws.length)];
          this.service.addSyntheticWork(addr, 200 + Math.floor(Math.random() * 4000));
        }
      }
      if (Math.random() < 0.12) this.service.triggerBreakthrough();
      this.service.broadcast();
    } catch {
      // Never let a tick kill the driver.
    }
  }
}
