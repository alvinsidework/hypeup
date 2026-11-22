import { createFileRoute } from "@tanstack/react-router";
import { logoutBrand } from "@/lib/hypeup/brand-auth.server";

export const Route = createFileRoute("/api/auth/brand/logout")({
  server: { handlers: { POST: ({ request }) => logoutBrand(request) } },
});
