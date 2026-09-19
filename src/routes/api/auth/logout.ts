import { createFileRoute } from "@tanstack/react-router";
import { SESSION_COOKIE } from "@/lib/hypeup/env.server";
import { cookieHeader } from "@/lib/hypeup/session.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = new Headers({ Location: new URL("/", request.url).toString() });
        headers.append("set-cookie", cookieHeader(SESSION_COOKIE, "", request, 0));
        return new Response(null, { status: 302, headers });
      },
      POST: async ({ request }) => {
        const headers = new Headers({ Location: new URL("/", request.url).toString() });
        headers.append("set-cookie", cookieHeader(SESSION_COOKIE, "", request, 0));
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
