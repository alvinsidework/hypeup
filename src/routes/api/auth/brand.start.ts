import { createFileRoute } from "@tanstack/react-router";
import { beginBrandAuth } from "@/lib/hypeup/brand-auth.server";

export const Route = createFileRoute("/api/auth/brand/start")({
  server: { handlers: { POST: ({ request }) => beginBrandAuth(request) } },
});
