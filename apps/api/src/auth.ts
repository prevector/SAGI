import crypto from "node:crypto";
import type { Request, Response } from "express";
import type { SessionInfo } from "@sagi/shared";
import type { AppEnv } from "./env.js";

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.cookie;
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) {
          return [part, ""];
        }

        const key = part.slice(0, index);
        const value = decodeURIComponent(part.slice(index + 1));
        return [key, value];
      })
  );
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSessionValue(secret: string): string {
  return sign("local-developer", secret);
}

function encodeSessionValue(username: string, secret: string): string {
  const normalized = username.trim();
  const signature = sign(normalized, secret);
  return `${Buffer.from(normalized).toString("base64url")}.${signature}`;
}

function decodeSessionValue(value: string, secret: string): string | null {
  const [encodedName, signature] = value.split(".");

  if (!encodedName || !signature) {
    return null;
  }

  const username = Buffer.from(encodedName, "base64url").toString("utf8").trim();

  if (!username) {
    return null;
  }

  const expectedSignature = sign(username, secret);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  return username;
}

export function getAuthenticatedUsername(request: Request, env: AppEnv): string | null {
  if (env.devMode) {
    return "Local developer";
  }

  const cookies = parseCookies(request);
  const sessionValue = cookies[env.cookieName];

  if (!sessionValue) {
    return null;
  }

  return decodeSessionValue(sessionValue, env.sessionSecret);
}

export function isAuthenticated(request: Request, env: AppEnv): boolean {
  return getAuthenticatedUsername(request, env) !== null;
}

export function getSessionInfo(request: Request, env: AppEnv): SessionInfo {
  const username = getAuthenticatedUsername(request, env);
  const authenticated = username !== null;

  return {
    authenticated,
    mode: env.devMode ? "development" : "production",
    user: authenticated
      ? {
          name: username
        }
      : null
  };
}

export function setSessionCookie(response: Response, env: AppEnv, username: string): void {
  response.cookie(env.cookieName, encodeSessionValue(username, env.sessionSecret), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(response: Response, env: AppEnv): void {
  response.clearCookie(env.cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.secureCookies,
    path: "/"
  });
}
