// Minimal SSE hub. One endpoint streams NetworkSnapshot on every ledger
// change. EventSource auto-reconnects on the client. We send periodic comments
// as keep-alives and clean up on disconnect.

import type { Response } from "express";

export class SseHub {
  private clients = new Set<Response>();
  private keepAlive: ReturnType<typeof setInterval> | null = null;

  add(res: Response): void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering
    res.flushHeaders?.();
    res.write(": connected\n\n");
    this.clients.add(res);

    if (!this.keepAlive) {
      this.keepAlive = setInterval(() => {
        for (const c of this.clients) c.write(": ping\n\n");
      }, 20_000);
      this.keepAlive.unref?.();
    }
  }

  remove(res: Response): void {
    this.clients.delete(res);
    if (this.clients.size === 0 && this.keepAlive) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
  }

  broadcast(payload: unknown): void {
    const frame = `data: ${JSON.stringify(payload)}\n\n`;
    for (const c of this.clients) c.write(frame);
  }

  get size(): number {
    return this.clients.size;
  }

  close(): void {
    if (this.keepAlive) clearInterval(this.keepAlive);
    this.keepAlive = null;
    for (const c of this.clients) c.end();
    this.clients.clear();
  }
}
