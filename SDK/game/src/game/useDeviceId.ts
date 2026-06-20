import { useState } from "react";

const KEY = "sagi.device_id";

// A stable per-device id, persisted in localStorage. Fed once to registerUser.
export function useDeviceId(): string {
  const [id] = useState(() => {
    let existing = localStorage.getItem(KEY);
    if (!existing) {
      existing = `dev-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      localStorage.setItem(KEY, existing);
    }
    return existing;
  });
  return id;
}
