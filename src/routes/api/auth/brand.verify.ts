import { createFileRoute } from "@tanstack/react-router";
import { verifyBrandAuth } from "@/lib/hypeup/brand-auth.server";

export const Route = createFileRoute("/api/auth/brand/verify")({
  server: { handlers: { POST: ({ request }) => verifyBrandAuth(request) } },
});
