import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AppEnv } from "./env.js";

interface StoredUsersFile {
  users: Record<string, string>;
}

const runsDir = path.resolve(process.cwd(), "runs");
const usersPath = path.join(runsDir, "users.json");

function normalizeUsername(username: string): string {
  return username.trim();
}

export function isValidPasswordHash(passwordHash: string): boolean {
  return /^[a-f0-9]{64}$/.test(passwordHash.trim().toLowerCase());
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{2,32}$/.test(normalizeUsername(username));
}

async function readStoredUsers(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(usersPath, "utf8");
    const parsed = JSON.parse(raw) as StoredUsersFile;
    return typeof parsed === "object" && parsed !== null && parsed.users ? parsed.users : {};
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : "";
    if (code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeStoredUsers(users: Record<string, string>): Promise<void> {
  await mkdir(runsDir, { recursive: true });
  await writeFile(usersPath, JSON.stringify({ users }, null, 2));
}

export async function usernameExists(username: string, env: AppEnv): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (env.authUsers[normalized]) {
    return true;
  }
  const storedUsers = await readStoredUsers();
  return Boolean(storedUsers[normalized]);
}

export async function verifyStoredPasswordHash(username: string, passwordHash: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  const storedUsers = await readStoredUsers();
  return storedUsers[normalized] === passwordHash.trim().toLowerCase();
}

export async function registerUser(username: string, passwordHash: string, env: AppEnv): Promise<void> {
  const normalized = normalizeUsername(username);
  const normalizedHash = passwordHash.trim().toLowerCase();
  const storedUsers = await readStoredUsers();

  if (env.authUsers[normalized] || storedUsers[normalized]) {
    throw new Error("That username already exists.");
  }

  storedUsers[normalized] = normalizedHash;
  await writeStoredUsers(storedUsers);
}
