import { createFileRoute } from "@tanstack/react-router";
import { encryptToken } from "@/lib/hypeup/crypto.server";
import {
  instagramAppId,
  instagramAppSecret,
  isDemoMode,
  oauthRedirectUri,
  OAUTH_STATE_COOKIE,
  SESSION_COOKIE,
} from "@/lib/hypeup/env.server";
import { addLog, upsertUser } from "@/lib/hypeup/repo";
import { cookieHeader, readCookieHeader, signSession } from "@/lib/hypeup/session.server";
import {
  exchangeLongLivedToken,
  exchangeShortLivedToken,
  fetchMe,
  isProfessionalAccount,
  parseGrantedScopes,
} from "@/lib/instagram/oauth";
import { subscribeApps } from "@/lib/instagram/messages";
import { graphErrorPayload } from "@/lib/instagram/errors";

function redirectTo(request: Request, path: string, extraCookies: string[] = []) {
  const headers = new Headers({ Location: new URL(path, request.url).toString() });
  for (const cookie of extraCookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function connectError(request: Request, code: string, detail?: string, extraCookies: string[] = []) {
  const target = new URL("/connect", request.url);
  target.searchParams.set("error", code);
  if (detail) target.searchParams.set("detail", detail.slice(0, 180));
  const headers = new Headers({ Location: target.toString() });
  for (const cookie of extraCookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

export const Route = createFileRoute("/api/auth/instagram/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const error = url.searchParams.get("error");
        const errorReason = url.searchParams.get("error_reason") ?? "";
        if (error) {
          const description = url.searchParams.get("error_description") ?? "";
          const blob = `${error} ${errorReason} ${description}`;
          console.error("[hypeup] instagram oauth returned error", blob.slice(0, 300));
          return connectError(request, "denied", description.replaceAll("+", " "));
        }
        if (isDemoMode() || !instagramAppId() || !instagramAppSecret()) {
          return connectError(request, "not_configured");
        }

        const state = url.searchParams.get("state") ?? "";
        const expected = readCookieHeader(request, OAUTH_STATE_COOKIE);
        const clearState = cookieHeader(OAUTH_STATE_COOKIE, "", request, 0);
        if (!state || !expected || state !== expected) {
          return connectError(request, "state", undefined, [clearState]);
        }

        const code = url.searchParams.get("code");
        if (!code) return connectError(request, "denied", undefined, [clearState]);

        const redirectUri = oauthRedirectUri(request);
        try {
          const shortLived = await exchangeShortLivedToken({
            appId: instagramAppId()!,
            appSecret: instagramAppSecret()!,
            redirectUri,
            code,
          });
          const longLived = await exchangeLongLivedToken({
            appSecret: instagramAppSecret()!,
            shortLived: shortLived.access_token,
          });
          const me = await fetchMe(longLived.access_token);
          if (!isProfessionalAccount(me.account_type)) {
            return connectError(request, "personal_account", undefined, [clearState]);
          }
          const igUserId = String(me.user_id ?? me.id ?? shortLived.user_id);
          const expiresIn = longLived.expires_in ?? 60 * 60 * 24 * 60;
          const user = await upsertUser({
            igUserId,
            username: me.username,
            name: me.name ?? null,
            accountType: me.account_type ?? null,
            profilePictureUrl: me.profile_picture_url ?? null,
            followersCount: me.followers_count ?? null,
            mediaCount: me.media_count ?? null,
            tokenCipher: encryptToken(longLived.access_token),
            tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
            grantedScopes: parseGrantedScopes(shortLived.permissions),
          });
          await addLog({
            userId: user.id,
            type: "AUTH",
            success: true,
            message: `@${user.username} 계정을 연결했습니다.`,
          });
          try {
            await subscribeApps(longLived.access_token, user.igUserId);
            const { setWebhookSubscribed } = await import("@/lib/hypeup/repo");
            await setWebhookSubscribed(user.id, new Date());
          } catch (subscribeError) {
            await addLog({
              userId: user.id,
              type: "ERROR",
              success: false,
              message: "webhook 구독에 실패했습니다. 설정에서 다시 구독하세요.",
              meta: graphErrorPayload(subscribeError),
            });
          }
          const session = await signSession({ userId: user.id, igUserId: user.igUserId });
          return redirectTo(request, "/", [
            clearState,
            cookieHeader(SESSION_COOKIE, session, request, 60 * 60 * 24 * 30),
          ]);
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          console.error("[hypeup] instagram oauth callback failed", message.slice(0, 300));
          if (/APP_ENCRYPTION_KEY|AUTH_SECRET/i.test(message)) {
            return connectError(request, "missing_keys", undefined, [clearState]);
          }
          if (/redirect/i.test(message)) {
            return connectError(request, "redirect_mismatch", message, [clearState]);
          }
          if (/role|tester|not authorized|permissions/i.test(message)) {
            return connectError(request, "not_tester", message, [clearState]);
          }
          return connectError(request, "denied", message, [clearState]);
        }
      },
    },
  },
});
