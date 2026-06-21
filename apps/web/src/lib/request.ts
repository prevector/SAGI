import { config } from "./config";

// Base path the app is mounted under (Vite injects "/" or e.g. "/sagi/").
const basePath = import.meta.env.BASE_URL ?? "/";

/** Build an absolute API URL that respects the sub-path mount and apiBaseUrl. */
export function apiUrl(path: string): string {
  const clean = path.replace(/^\//, "");
  if (config.apiBaseUrl) {
    return `${config.apiBaseUrl.replace(/\/$/, "")}/${clean}`;
  }
  return `${basePath}${clean}`;
}

/** fetch + JSON with cookies, tolerant of empty (204) bodies. */
export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    // Surface the server's `{ error }` body when present so callers can show a
    // real message (e.g. "Mollie is not configured…") instead of a bare status.
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: unknown };
      if (data && typeof data.error === "string") message = data.error;
    } catch {
      // Non-JSON / empty error body — keep the status-based message.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
