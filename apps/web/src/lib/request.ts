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
    throw new Error(`Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
