import { createFileRoute } from "@tanstack/react-router";
import { cronSecret } from "@/lib/hypeup/env.server";
import { decryptToken, encryptToken } from "@/lib/hypeup/crypto.server";
import { addLog, listUsersNeedingRefresh, updateUserToken } from "@/lib/hypeup/repo";
import { refreshLongLivedToken } from "@/lib/instagram/oauth";
import { graphErrorPayload } from "@/lib/instagram/errors";

function authorized(request: Request): boolean {
  const secret = cronSecret();
  const header = request.headers.get("authorization");
  if (request.headers.get("x-vercel-cron") === "1") return true;
  if (secret && header === `Bearer ${secret}`) return true;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  return false;
}

export const Route = createFileRoute("/api/cron/refresh-tokens")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return new Response("unauthorized", { status: 401 });
        const users = await listUsersNeedingRefresh();
        let refreshed = 0;
        for (const user of users) {
          if (!user.tokenCipher) continue;
          try {
            const current = decryptToken(user.tokenCipher);
            const next = await refreshLongLivedToken(current);
            const expiresIn = next.expires_in ?? 60 * 60 * 24 * 60;
            await updateUserToken(
              user.id,
              encryptToken(next.access_token),
              new Date(Date.now() + expiresIn * 1000).toISOString(),
            );
            await addLog({
              userId: user.id,
              type: "AUTH",
              success: true,
              message: "액세스 토큰을 갱신했습니다.",
            });
            refreshed += 1;
          } catch (error) {
            await addLog({
              userId: user.id,
              type: "ERROR",
              success: false,
              message: "토큰 갱신에 실패했습니다. 다시 연결하세요.",
              meta: graphErrorPayload(error),
            });
          }
        }
        return Response.json({ ok: true, refreshed, scanned: users.length });
      },
    },
  },
});
