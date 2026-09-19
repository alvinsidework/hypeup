import { createFileRoute } from "@tanstack/react-router";
import { randomNonce } from "@/lib/hypeup/crypto.server";
import {
  instagramAppId,
  isDemoMode,
  oauthRedirectUri,
  OAUTH_STATE_COOKIE,
} from "@/lib/hypeup/env.server";
import { cookieHeader } from "@/lib/hypeup/session.server";
import { authorizeUrl } from "@/lib/instagram/oauth";

export const Route = createFileRoute("/api/auth/instagram")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (isDemoMode() || !instagramAppId()) {
          return Response.redirect(new URL("/connect?error=not_configured", request.url), 302);
        }
        const state = randomNonce();
        const location = authorizeUrl({
          appId: instagramAppId()!,
          redirectUri: oauthRedirectUri(request),
          state,
        });
        const headers = new Headers({ Location: location });
        headers.append("set-cookie", cookieHeader(OAUTH_STATE_COOKIE, state, request, 600));
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
