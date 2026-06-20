export interface AppEnv {
  devMode: boolean;
  sessionSecret: string;
  port: number;
  cookieName: string;
  secureCookies: boolean;
}

export function getAppEnv(): AppEnv {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const devMode = process.env.DEV_MODE === "1" || nodeEnv !== "production";

  return {
    devMode,
    sessionSecret: process.env.SESSION_SECRET ?? "local-dev-secret",
    port: Number(process.env.PORT ?? 4000),
    cookieName: "sagi_session",
    secureCookies: process.env.SECURE_COOKIES === "1" || nodeEnv === "production"
  };
}
