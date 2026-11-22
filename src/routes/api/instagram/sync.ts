import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  AuthRequiredError,
  requireUser,
  syncFromInstagram,
} from "@/lib/hypeup/actions.server";
import { copy } from "@/lib/hypeup/copy";
import { requestOrigin } from "@/lib/hypeup/env.server";
import type { InstagramSyncEvent } from "@/lib/hypeup/sync-contract";
import { koreanError } from "@/lib/instagram/errors";

const inputSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("posts") }),
  z.object({ scope: z.literal("inbox") }),
  z.object({ scope: z.literal("post"), mediaId: z.string().min(1).max(128) }),
]);

const headers = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store, no-transform",
  "X-Content-Type-Options": "nosniff",
};

function encodeEvent(event: InstagramSyncEvent): string {
  return JSON.stringify(event) + "\n";
}

function errorResponse(status: number, message: string): Response {
  return new Response(encodeEvent({ type: "error", message }), {
    status,
    headers,
  });
}

function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = request.headers.get("origin");
  return (
    !origin ||
    origin === new URL(request.url).origin ||
    origin === requestOrigin(request)
  );
}

function syncError(error: unknown): string {
  if (error instanceof Error && error.message === "token_expired")
    return copy.tokenExpired;
  if (error instanceof Error && error.message === "not_found")
    return "게시물을 찾을 수 없습니다.";
  return koreanError(error);
}

export const Route = createFileRoute("/api/instagram/sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isSameOrigin(request))
          return errorResponse(403, copy.genericError);
        if (
          !/^application\/json(?:\s*;|$)/i.test(
            request.headers.get("content-type") ?? "",
          )
        ) {
          return errorResponse(415, copy.genericError);
        }
        const input = inputSchema.safeParse(
          await request.json().catch(() => null),
        );
        if (!input.success) return errorResponse(400, copy.genericError);

        let user: Awaited<ReturnType<typeof requireUser>>;
        try {
          user = await requireUser();
        } catch (error) {
          return error instanceof AuthRequiredError
            ? errorResponse(401, "인스타그램을 다시 연결해 주세요.")
            : errorResponse(500, copy.genericError);
        }

        const encoder = new TextEncoder();
        let closed = false;
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const publish = (event: InstagramSyncEvent) => {
              if (!closed)
                controller.enqueue(encoder.encode(encodeEvent(event)));
            };
            void syncFromInstagram(user, input.data, publish)
              .then(publish, (error: unknown) =>
                publish({ type: "error", message: syncError(error) }),
              )
              .finally(() => {
                if (closed) return;
                closed = true;
                controller.close();
              });
          },
          cancel() {
            closed = true;
          },
        });
        return new Response(stream, { headers });
      },
    },
  },
});
