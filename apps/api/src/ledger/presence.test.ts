import { describe, expect, it } from "vitest";
import { PresenceHub } from "./presence.js";

describe("PresenceHub", () => {
  it("registers and lists connected users", () => {
    const hub = new PresenceHub();
    const first = hub.register("ada", "app");
    hub.register("lin", "terminal");
    hub.register("ada", "terminal");

    const users = hub.listConnectedUsers();
    expect(users).toHaveLength(2);
    expect(users.find((user) => user.username === "ada")?.sessions).toBe(2);
    expect(users.find((user) => user.username === "lin")?.surface).toBe("terminal");

    hub.unregister(first);
    expect(hub.listConnectedUsers()).toHaveLength(2);
    expect(hub.listConnectedUsers().find((user) => user.username === "ada")?.sessions).toBe(1);
  });
});
