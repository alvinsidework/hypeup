import { createFileRoute } from "@tanstack/react-router";
import { verifyAppHandoff } from "@/lib/hypeup/app-handoff";
import { OAUTH_CLIENT_COOKIE, SESSION_COOKIE } from "@/lib/hypeup/env.server";
import { cookieHeader, verifySessionToken } from "@/lib/hypeup/session.server";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export const Route = createFileRoute("/api/auth/instagram/handoff")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const handoff = new URL(request.url).searchParams.get("handoff") ?? "";
        const session = handoff ? await verifyAppHandoff(handoff) : null;
        const valid = session ? await verifySessionToken(session) : null;
        if (!session || !valid) {
          return Response.redirect(new URL("/connect?error=state", request.url), 302);
        }
        const headers = new Headers({
          Location: new URL("/", request.url).toString(),
          "cache-control": "no-store",
        });
        headers.append("set-cookie", cookieHeader(SESSION_COOKIE, session, request, THIRTY_DAYS));
        headers.append("set-cookie", cookieHeader(OAUTH_CLIENT_COOKIE, "", request, 0));
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
