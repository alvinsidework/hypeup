import { createFileRoute } from "@tanstack/react-router";
import { getProfilePhoto } from "@/lib/hypeup/lens-repo";
import { getSession } from "@/lib/hypeup/session.server";

const keyPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export const Route = createFileRoute("/api/lens/profile-photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const key = new URL(request.url).searchParams.get("key");
        if (!key || !keyPattern.test(key))
          return new Response(null, { status: 404, headers });
        const viewer = await getSession();
        const photo = await getProfilePhoto(key, viewer?.userId ?? null);
        if (!photo) return new Response(null, { status: 404, headers });
        return new Response(new Uint8Array(photo), {
          headers: { ...headers, "Content-Type": "image/jpeg" },
        });
      },
    },
  },
});
