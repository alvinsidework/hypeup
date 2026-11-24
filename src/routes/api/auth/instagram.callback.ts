import { createFileRoute } from "@tanstack/react-router";
import { encryptToken } from "@/lib/hypeup/crypto.server";
import {
  instagramAppId,
  instagramAppSecret,
  oauthRedirectUri,
  OAUTH_CLIENT_COOKIE,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
} from "@/lib/hypeup/env.server";
import {
  claimOAuthAttempt,
  completeOAuthAttempt,
  failOAuthAttempt,
  finishPwaOAuthAttempt,
  readOAuthAttempt,
} from "@/lib/hypeup/oauth-attempt.server";
import {
  PWA_OAUTH_STATE_COOKIE,
  PWA_OAUTH_STATE_PREFIX,
  verifyOAuthState,
  type OAuthClient,
} from "@/lib/hypeup/oauth-state.server";
import {
  pwaOAuthView,
  redirectPwaOAuthView,
} from "@/lib/hypeup/oauth-pwa.server";
import { addLog, setWebhookSubscribed, upsertUser } from "@/lib/hypeup/repo";
import { appBridgeResponse, signAppHandoff } from "@/lib/hypeup/app-handoff";
import {
  cookieHeader,
  readCookieHeader,
  signSession,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/hypeup/session.server";
import {
  exchangeLongLivedToken,
  exchangeShortLivedToken,
  fetchMe,
  isAuthorizationCodeUsed,
  isLongLivedExchangeRejected,
  isProfessionalAccount,
  parseGrantedScopes,
} from "@/lib/instagram/oauth";
import { isTesterRoleRejected } from "@/lib/instagram/oauth-parse";
import { subscribeApps } from "@/lib/instagram/messages";
import { graphErrorPayload, InstagramApiError } from "@/lib/instagram/errors";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const CALLBACK_WAIT_MS = [0, 200, 400, 800, 1_600, 2_400, 3_200];
const MAX_CALLBACK_RESUMES = 2;

function redirectTo(target: URL, cookies: string[] = []) {
  const headers = new Headers({
    Location: target.href,
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  });
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

async function connectError(
  request: Request,
  client: OAuthClient,
  error: string,
  cookies: string[] = [],
) {
  if (client.client === "pwa") {
    if (error !== "oauth_pending") {
      await finishPwaOAuthAttempt(client.attempt, null, error).catch(() => {
        console.error("[hypeup] PWA OAuth failure could not be recorded");
      });
    }
    return redirectPwaOAuthView(
      request,
      client.attempt.origin,
      "failed",
      cookies,
    );
  }
  if (client.client === "app")
    return appBridgeResponse(request, { error }, cookies);
  const target = new URL("/connect", request.url);
  target.searchParams.set("error", error);
  return redirectTo(target, cookies);
}

async function connected(
  request: Request,
  client: OAuthClient,
  connectedUser: SessionPayload,
  clearState: string,
) {
  if (client.client === "pwa") {
    const finished = await finishPwaOAuthAttempt(
      client.attempt,
      connectedUser.userId,
      null,
    );
    return redirectPwaOAuthView(
      request,
      client.attempt.origin,
      finished ? "complete" : "failed",
      [clearState],
    );
  }
  const session = await signSession(connectedUser);
  if (client.client === "app") {
    return appBridgeResponse(
      request,
      { handoff: await signAppHandoff(session) },
      [clearState],
    );
  }
  return redirectTo(new URL("/", request.url), [
    clearState,
    cookieHeader(SESSION_COOKIE, session, request, SESSION_TTL_SECONDS),
  ]);
}

async function waitForOAuthAttempt(proof: string) {
  for (const delay of CALLBACK_WAIT_MS) {
    if (delay) await new Promise<void>((resolve) => setTimeout(resolve, delay));
    const attempt = await readOAuthAttempt(proof);
    if (attempt?.status !== "pending") return attempt;
  }
  return { status: "pending" } as const;
}

type OAuthStage =
  "authorization" | "short_token" | "long_token" | "profile" | "setup";

function oauthFailureCode(err: unknown, stage: OAuthStage): string {
  const message = err instanceof Error ? err.message : "";
  if (stage === "setup") {
    return /APP_ENCRYPTION_KEY|AUTH_SECRET/i.test(message)
      ? "missing_keys"
      : "oauth_retry";
  }
  if (isAuthorizationCodeUsed(err)) return "code_used";
  if (err instanceof InstagramApiError && err.status === 429)
    return "rate_limited";
  if (isTesterRoleRejected(err)) return "not_tester";
  if (/redirect[ _-]?uri|redirect[ _-]?url/i.test(message))
    return "redirect_mismatch";
  if (stage === "authorization") return "denied";
  if (
    err instanceof InstagramApiError &&
    (stage === "short_token" || stage === "long_token")
  ) {
    return "token_exchange";
  }
  return "oauth_retry";
}

async function finishAccountConnection(
  request: Request,
  client: OAuthClient,
  proof: string,
  code: string,
  appId: string,
  appSecret: string,
  clearState: string,
) {
  let stage: OAuthStage = "short_token";
  try {
    const shortLived = await exchangeShortLivedToken({
      appId,
      appSecret,
      redirectUri: oauthRedirectUri(request),
      code,
    });
    let accessToken = shortLived.access_token;
    let expiresIn = 60 * 60;
    stage = "long_token";
    try {
      const longLived = await exchangeLongLivedToken({
        appSecret,
        shortLived: shortLived.access_token,
      });
      accessToken = longLived.access_token;
      expiresIn = longLived.expires_in ?? 60 * 60 * 24 * 60;
    } catch (error) {
      if (!isLongLivedExchangeRejected(error)) throw error;
      console.error(
        "[hypeup] long-lived token exchange rejected, continuing with the short-lived token",
      );
    }

    stage = "profile";
    const me = await fetchMe(accessToken);
    if (!isProfessionalAccount(me.account_type)) {
      await failOAuthAttempt(proof, "personal_account");
      return connectError(request, client, "personal_account", [clearState]);
    }
    stage = "setup";
    const igUserId = String(me.user_id ?? me.id ?? shortLived.user_id);
    const user = await upsertUser({
      igUserId,
      username: me.username,
      name: me.name ?? null,
      accountType: me.account_type ?? null,
      profilePictureUrl: me.profile_picture_url ?? null,
      followersCount: me.followers_count ?? null,
      mediaCount: me.media_count ?? null,
      tokenCipher: encryptToken(accessToken),
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      grantedScopes: parseGrantedScopes(shortLived.permissions),
    });
    await completeOAuthAttempt(proof, user.id);
    const response = await connected(
      request,
      client,
      { userId: user.id, igUserId: user.igUserId },
      clearState,
    );

    // The connection is usable even when activity logging or webhook setup fails.
    try {
      await addLog({
        userId: user.id,
        type: "AUTH",
        success: true,
        message: `@${user.username} 계정을 연결했습니다.`,
      });
      await subscribeApps(accessToken, user.igUserId);
      await setWebhookSubscribed(user.id, new Date());
    } catch (error) {
      await addLog({
        userId: user.id,
        type: "ERROR",
        success: false,
        message:
          "연결 후 설정 기록에 실패했습니다. 실시간 수신 상태를 확인하세요.",
        meta: graphErrorPayload(error),
      }).catch(() => {
        console.error(
          "[hypeup] Instagram connection follow-up could not be recorded",
        );
      });
    }

    return response;
  } catch (error) {
    const failure = oauthFailureCode(error, stage);
    console.error("[hypeup] Instagram OAuth failed", stage, failure);
    await failOAuthAttempt(proof, failure).catch(() => {
      console.error("[hypeup] Instagram OAuth failure could not be recorded");
    });
    return connectError(request, client, failure, [clearState]);
  }
}

export const Route = createFileRoute("/api/auth/instagram/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const appId = instagramAppId();
        const appSecret = instagramAppSecret();
        const state = url.searchParams.get("state");
        const isPwa = state?.startsWith(PWA_OAUTH_STATE_PREFIX) ?? false;
        const stateCookie = isPwa ? PWA_OAUTH_STATE_COOKIE : OAUTH_STATE_COOKIE;
        const proof = readCookieHeader(request, stateCookie);
        const previousClient: OAuthClient = {
          client:
            readCookieHeader(request, OAUTH_CLIENT_COOKIE) === "app"
              ? "app"
              : "web",
        };
        if (!appId || !appSecret)
          return isPwa
            ? pwaOAuthView("failed")
            : connectError(request, previousClient, "not_configured");

        const code = url.searchParams.get("code");
        const resume = url.searchParams.get("resume");
        const client = await verifyOAuthState(proof, state);
        if (!proof || !state || !client) {
          if (isPwa) return pwaOAuthView("failed");
          // A completed web navigation may be restored after its state cookie was cleared.
          const session = readCookieHeader(request, SESSION_COOKIE);
          if (
            !proof &&
            state &&
            (code || resume) &&
            session &&
            (await verifySessionToken(session))
          ) {
            return redirectTo(new URL("/", request.url));
          }
          return connectError(request, previousClient, "state");
        }

        const resumeCount = resume === "1" ? 1 : resume === "2" ? 2 : 0;
        const clearState = cookieHeader(stateCookie, "", request, 0);
        if (url.searchParams.has("error") || (!code && !resumeCount)) {
          const providerError = new Error(
            ["error_description", "error_reason", "error"]
              .map((key) => url.searchParams.get(key))
              .join(" "),
          );
          const failure = oauthFailureCode(providerError, "authorization");
          if (client.client === "pwa") {
            try {
              if (!(await claimOAuthAttempt(proof))) {
                return connectError(request, client, "oauth_pending");
              }
              await failOAuthAttempt(proof, failure);
            } catch {
              return connectError(request, client, "oauth_retry", [clearState]);
            }
          }
          return connectError(request, client, failure, [clearState]);
        }

        try {
          if (code && !resumeCount && (await claimOAuthAttempt(proof))) {
            return finishAccountConnection(
              request,
              client,
              proof,
              code,
              appId,
              appSecret,
              clearState,
            );
          }

          const attempt = await waitForOAuthAttempt(proof);
          if (attempt?.status === "complete") {
            return connected(
              request,
              client,
              {
                userId: attempt.userId,
                igUserId: attempt.igUserId,
              },
              clearState,
            );
          }
          if (attempt?.status === "pending") {
            if (resumeCount === MAX_CALLBACK_RESUMES) {
              return connectError(request, client, "oauth_pending");
            }
            const next = new URL(url.pathname, request.url);
            next.searchParams.set("state", state);
            next.searchParams.set("resume", String(resumeCount + 1));
            return redirectTo(next);
          }
          return connectError(request, client, attempt?.error ?? "code_used", [
            clearState,
          ]);
        } catch {
          console.error(
            "[hypeup] Instagram OAuth attempt store is unavailable",
          );
          return connectError(request, client, "oauth_retry", [clearState]);
        }
      },
    },
  },
});
