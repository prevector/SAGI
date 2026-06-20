import type { Domain } from "@sagi/shared";

export type PresenceSurface = "app" | "terminal";

export interface PresenceClient {
  id: string;
  username: string;
  surface: PresenceSurface;
  connectedAt: number;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export class PresenceHub {
  private clients = new Map<string, PresenceClient>();
  private nextId = 1;

  register(username: string, surface: PresenceSurface = "app"): string {
    const id = `p-${this.nextId++}`;
    this.clients.set(id, {
      id,
      username,
      surface,
      connectedAt: Date.now()
    });
    return id;
  }

  unregister(id: string): void {
    this.clients.delete(id);
  }

  listConnectedUsers(): Domain.ConnectedUser[] {
    const byUser = new Map<string, Domain.ConnectedUser>();
    for (const client of this.clients.values()) {
      const existing = byUser.get(client.username);
      const next: Domain.ConnectedUser = {
        username: client.username,
        connectedAt: iso(client.connectedAt),
        surface: client.surface,
        sessions: 1
      };
      if (!existing) {
        byUser.set(client.username, next);
        continue;
      }
      byUser.set(client.username, {
        ...existing,
        connectedAt:
          new Date(existing.connectedAt).getTime() <= client.connectedAt
            ? existing.connectedAt
            : iso(client.connectedAt),
        surface: existing.surface === "terminal" || client.surface === "terminal" ? "terminal" : "app",
        sessions: (existing.sessions ?? 1) + 1
      });
    }
    return [...byUser.values()].sort((left, right) => left.username.localeCompare(right.username));
  }

  get size(): number {
    return this.clients.size;
  }
}
