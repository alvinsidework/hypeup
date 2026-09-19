import { env as readEnv } from "@/lib/env.server";

export const DEMO_USER_ID = "demo-user";
export const DEMO_IG_USER_ID = "demo-ig";
export const SESSION_COOKIE = "hypeup_session";
export const OAUTH_STATE_COOKIE = "hypeup_oauth_state";
export const DEFAULT_GRAPH_VERSION = "v21.0";

function requiredWhenLive(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${key} is not set`);
  }
  return value;
}

export function isDemoMode(): boolean {
  return !readEnv("INSTAGRAM_APP_ID");
}

export function instagramAppId(): string | undefined {
  return readEnv("INSTAGRAM_APP_ID");
}

export function instagramAppSecret(): string | undefined {
  return readEnv("INSTAGRAM_APP_SECRET");
}

export function instagramRedirectUri(): string | undefined {
  return readEnv("INSTAGRAM_REDIRECT_URI");
}

export function instagramWebhookVerifyToken(): string | undefined {
  return readEnv("INSTAGRAM_WEBHOOK_VERIFY_TOKEN");
}

export function graphVersion(): string {
  return readEnv("IG_GRAPH_VERSION") ?? DEFAULT_GRAPH_VERSION;
}

export function appUrl(): string | undefined {
  return readEnv("APP_URL");
}

export function encryptionKey(): string | undefined {
  return readEnv("APP_ENCRYPTION_KEY");
}

export function authSecret(): string | undefined {
  return readEnv("AUTH_SECRET");
}

export function cronSecret(): string | undefined {
  return readEnv("CRON_SECRET");
}

export function requireLiveInstagram() {
  return {
    appId: requiredWhenLive("INSTAGRAM_APP_ID", instagramAppId()),
    appSecret: requiredWhenLive("INSTAGRAM_APP_SECRET", instagramAppSecret()),
    redirectUri: instagramRedirectUri(),
  };
}

export function isSecureCookie(request: Request): boolean {
  const proto =
    request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  return proto === "https";
}

export function requestOrigin(request: Request): string {
  const configured = appUrl();
  if (configured) return configured.replace(/\/$/, "");
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:8080"
  )
    .split(",")[0]
    .trim();
  const proto = (request.headers.get("x-forwarded-proto") ?? "http").split(",")[0].trim();
  return `${proto}://${host}`;
}

export function oauthRedirectUri(request: Request): string {
  return instagramRedirectUri() ?? `${requestOrigin(request)}/api/auth/instagram/callback`;
}
