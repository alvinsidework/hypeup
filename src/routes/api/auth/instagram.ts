import { createFileRoute } from "@tanstack/react-router";
import {
  instagramAppId,
  isDemoMode,
  oauthRedirectUri,
  OAUTH_STATE_COOKIE,
} from "@/lib/hypeup/env.server";
import { cookieHeader } from "@/lib/hypeup/session.server";
import {
  createOAuthState,
  OAUTH_STATE_TTL_SECONDS,
} from "@/lib/hypeup/oauth-state.server";
import { startPwaOAuth } from "@/lib/hypeup/oauth-pwa.server";
import { authorizeUrl } from "@/lib/instagram/oauth";

function redirectHeaders(location: string): Headers {
  return new Headers({
    Location: location,
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  });
}

export const Route = createFileRoute("/api/auth/instagram")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const appId = instagramAppId();
        if (isDemoMode() || !appId) {
          const location = new URL(
            "/connect?error=not_configured",
            request.url,
          );
          return new Response(null, {
            status: 302,
            headers: redirectHeaders(location.href),
          });
        }
        const client =
          new URL(request.url).searchParams.get("client") === "app"
            ? "app"
            : "web";
        try {
          const { state, proof } = await createOAuthState({ client });
          const location = authorizeUrl({
            appId,
            redirectUri: oauthRedirectUri(request),
            state,
          });
          const headers = redirectHeaders(location);
          headers.append(
            "set-cookie",
            cookieHeader(
              OAUTH_STATE_COOKIE,
              proof,
              request,
              OAUTH_STATE_TTL_SECONDS,
            ),
          );
          return new Response(null, { status: 302, headers });
        } catch {
          const location = new URL("/connect?error=missing_keys", request.url);
          return new Response(null, {
            status: 302,
            headers: redirectHeaders(location.href),
          });
        }
      },
      POST: ({ request }) => startPwaOAuth(request),
    },
  },
});
