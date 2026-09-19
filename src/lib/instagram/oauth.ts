import { formPost, graphGet, graphRawGet } from "./client";
import { normalizeAuthCode } from "./oauth-parse.ts";
import type { IgProfile, LongTokenResponse, ShortTokenResponse } from "./types";

export const OAUTH_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
].join(",");

export { isProfessionalAccount, normalizeAuthCode, parseGrantedScopes } from "./oauth-parse.ts";

export function authorizeUrl(input: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", input.appId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OAUTH_SCOPES);
  url.searchParams.set("state", input.state);
  // Stay on Instagram Login. The Facebook option rejects these scopes.
  url.searchParams.set("enable_fb_login", "0");
  return url.toString();
}

function asShortToken(payload: unknown): ShortTokenResponse {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data) && record.data[0] && typeof record.data[0] === "object") {
      return record.data[0] as ShortTokenResponse;
    }
    if (typeof record.access_token === "string") {
      return record as unknown as ShortTokenResponse;
    }
  }
  throw new Error("Unexpected short-lived token response");
}

export async function exchangeShortLivedToken(input: {
  appId: string;
  appSecret: string;
  redirectUri: string;
  code: string;
}): Promise<ShortTokenResponse> {
  const payload = await formPost<unknown>("https://api.instagram.com/oauth/access_token", {
    client_id: input.appId,
    client_secret: input.appSecret,
    grant_type: "authorization_code",
    redirect_uri: input.redirectUri,
    code: normalizeAuthCode(input.code),
  });
  return asShortToken(payload);
}

export async function exchangeLongLivedToken(input: {
  appSecret: string;
  shortLived: string;
}): Promise<LongTokenResponse> {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", input.appSecret);
  url.searchParams.set("access_token", input.shortLived);
  return graphRawGet<LongTokenResponse>(url.toString());
}

export async function refreshLongLivedToken(token: string): Promise<LongTokenResponse> {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  return graphRawGet<LongTokenResponse>(url.toString());
}

export async function fetchMe(token: string): Promise<IgProfile> {
  return graphGet<IgProfile>(token, "/me", {
    fields: "user_id,username,name,account_type,profile_picture_url,followers_count,media_count",
  });
}


