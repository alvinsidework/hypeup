import { createFileRoute } from "@tanstack/react-router";
import { instagramAppSecret, instagramWebhookVerifyToken } from "@/lib/hypeup/env.server";
import { ingestWebhookComment } from "@/lib/hypeup/actions.server";
import { parseWebhookPayload, verifyWebhookSignature } from "@/lib/instagram/webhooks";

export const Route = createFileRoute("/api/webhooks/instagram")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        const expected = instagramWebhookVerifyToken();
        if (mode === "subscribe" && expected && token === expected) {
          return new Response(challenge, {
            status: 200,
            headers: { "content-type": "text/plain" },
          });
        }
        return new Response("forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const secret = instagramAppSecret();
        const raw = await request.text();
        const signature = request.headers.get("x-hub-signature-256");
        if (!secret || !verifyWebhookSignature(raw, signature, secret)) {
          return new Response("invalid signature", { status: 401 });
        }
        let payload: unknown = null;
        try {
          payload = JSON.parse(raw) as unknown;
        } catch {
          return new Response("ok", { status: 200 });
        }
        const events = parseWebhookPayload(payload);
        for (const event of events) {
          try {
            await ingestWebhookComment(event);
          } catch (error) {
            console.error("[hypeup] webhook event failed", error);
          }
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
