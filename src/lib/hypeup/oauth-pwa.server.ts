import { randomNonce } from "./crypto.server";
import {
  authSecret,
  instagramAppId,
  instagramAppSecret,
  isSecureCookie,
  oauthRedirectUri,
  SESSION_COOKIE,
} from "./env.server";
import {
  createPwaOAuthAttempt,
  finishPwaOAuthAttempt,
  hasCompletedPwaOAuthAttempt,
  launchPwaOAuthAttempt,
  readPwaOAuthResult,
} from "./oauth-attempt.server";
import {
  createOAuthState,
  OAUTH_STATE_TTL_SECONDS,
  PWA_OAUTH_STATE_COOKIE,
} from "./oauth-state.server";
import { LENS_LEGACY_ORIGIN, LENS_PUBLIC_ORIGIN } from "./public-origin";
import {
  cookieHeader,
  readCookieHeader,
  signSession,
  verifySessionToken,
} from "./session.server";
import { authorizeUrl } from "@/lib/instagram/oauth";

const START_PATH = "/api/auth/instagram";
const HANDOFF_PATH = "/api/auth/instagram/handoff";
const NONCE = /^[a-f0-9]{48}$/;
const SESSION_AGE = 60 * 60 * 24 * 30;

function privateHeaders() {
  return new Headers({
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
}

function failure(error: string, status: number, headers = privateHeaders()) {
  return Response.json({ status: "failed", error }, { status, headers });
}

function claimName(attemptId: string) {
  return `hypeup_oauth_pwa_claim_${attemptId}`;
}

function claimCookie(
  request: Request,
  id: string,
  token: string,
  maxAge: number,
) {
  const secure = isSecureCookie(request) ? "; Secure" : "";
  return `${claimName(id)}=${token}; Path=${HANDOFF_PATH}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function isSameOriginPost(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

function allowedOrigin(
  request: Request,
  origin: string | null,
): origin is string {
  return (
    Boolean(origin) &&
    (origin === LENS_PUBLIC_ORIGIN ||
      origin === LENS_LEGACY_ORIGIN ||
      origin === new URL(request.url).origin ||
      origin === new URL(oauthRedirectUri(request)).origin)
  );
}

function requestMediaType(request: Request) {
  return request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
}

async function prepare(request: Request) {
  if (!isSameOriginPost(request)) return failure("state", 403);
  if (!instagramAppId() || !instagramAppSecret())
    return failure("not_configured", 503);
  if (!authSecret()) return failure("missing_keys", 503);
  try {
    const origin = new URL(request.url).origin;
    const launchUrl = new URL(START_PATH, oauthRedirectUri(request));
    const id = randomNonce();
    const claimToken = randomNonce();
    const launchToken = randomNonce();
    await createPwaOAuthAttempt({ id, origin, claimToken, launchToken });
    const headers = privateHeaders();
    headers.append(
      "set-cookie",
      claimCookie(request, id, claimToken, OAUTH_STATE_TTL_SECONDS),
    );
    return Response.json(
      {
        status: "ready",
        attemptId: id,
        launchUrl: launchUrl.href,
        launchToken,
        expiresIn: OAUTH_STATE_TTL_SECONDS,
      },
      { headers },
    );
  } catch {
    return failure("oauth_retry", 503);
  }
}

async function launch(request: Request) {
  const origin = request.headers.get("origin");
  const mode = request.headers.get("sec-fetch-mode");
  try {
    if (!allowedOrigin(request, origin) || (mode && mode !== "navigate"))
      return pwaOAuthView("failed");
    const appId = instagramAppId();
    if (!appId) return pwaOAuthView("failed");
    const body = await request.formData();
    const launchToken = body.get("launchToken");
    if (typeof launchToken !== "string" || !NONCE.test(launchToken))
      return pwaOAuthView("failed");
    const attempt = await launchPwaOAuthAttempt(launchToken, origin);
    if (!attempt) return pwaOAuthView("failed");
    try {
      const { state, proof } = await createOAuthState({
        client: "pwa",
        attempt,
      });
      const headers = privateHeaders();
      headers.set(
        "location",
        authorizeUrl({ appId, redirectUri: oauthRedirectUri(request), state }),
      );
      headers.append(
        "set-cookie",
        cookieHeader(
          PWA_OAUTH_STATE_COOKIE,
          proof,
          request,
          OAUTH_STATE_TTL_SECONDS,
        ),
      );
      return new Response(null, { status: 303, headers });
    } catch {
      await finishPwaOAuthAttempt(attempt, null, "oauth_retry").catch(() => {});
      return redirectPwaOAuthView(request, origin, "failed");
    }
  } catch {
    return pwaOAuthView("failed");
  }
}

export function startPwaOAuth(request: Request): Promise<Response> | Response {
  const type = requestMediaType(request);
  if (type === "application/json") return prepare(request);
  if (type === "application/x-www-form-urlencoded") return launch(request);
  return failure("state", 415);
}

export async function pollPwaOAuth(request: Request): Promise<Response> {
  if (!isSameOriginPost(request)) return failure("state", 403);
  if (requestMediaType(request) !== "application/json")
    return failure("state", 415);
  const body: unknown = await request.json().catch(() => null);
  const id =
    body && typeof body === "object" && "attemptId" in body
      ? body.attemptId
      : null;
  if (typeof id !== "string" || !NONCE.test(id)) return failure("state", 400);
  const attempt = { id, origin: new URL(request.url).origin };
  const token = readCookieHeader(request, claimName(id));
  const headers = privateHeaders();
  try {
    if (!token) {
      // The session cookie may arrive before the PWA receives the response body.
      const existing = readCookieHeader(request, SESSION_COOKIE);
      const session = existing ? await verifySessionToken(existing) : null;
      if (session && (await hasCompletedPwaOAuthAttempt(attempt, session)))
        return Response.json({ status: "complete" }, { headers });
      return failure("state", 403, headers);
    }
    if (!NONCE.test(token)) return failure("state", 403, headers);
    // A suspended PWA can retry the same unexpired proof if its response was lost.
    const result = await readPwaOAuthResult(attempt, token);
    if (result?.status === "pending")
      return Response.json({ status: "pending" }, { headers });
    headers.append("set-cookie", claimCookie(request, id, "", 0));
    if (!result) return failure("state", 403, headers);
    if (result.status === "failed") return failure(result.error, 200, headers);
    const session = await signSession({
      userId: result.userId,
      igUserId: result.igUserId,
    });
    headers.append(
      "set-cookie",
      cookieHeader(SESSION_COOKIE, session, request, SESSION_AGE),
    );
    return Response.json({ status: "complete" }, { headers });
  } catch {
    return failure("oauth_retry", 503);
  }
}

type PwaView = "complete" | "failed";

export function redirectPwaOAuthView(
  request: Request,
  origin: string,
  view: PwaView,
  cookies: string[] = [],
): Response {
  if (!allowedOrigin(request, origin)) return pwaOAuthView("failed", cookies);
  const target = new URL(HANDOFF_PATH, origin);
  target.searchParams.set("view", view);
  const headers = privateHeaders();
  headers.set("location", target.href);
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export function pwaOAuthView(view: PwaView, cookies: string[] = []) {
  const done = view === "complete";
  const title = done
    ? "Instagram 승인 완료"
    : "Instagram 연결이 완료되지 않았어요";
  const instructions = done
    ? "이 창을 닫으면 Lens 앱에서 자동으로 연결돼요."
    : "이 창을 닫고 Lens 앱에서 다시 연결해 주세요.";
  const headers = privateHeaders();
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set(
    "content-security-policy",
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
  );
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return new Response(
    `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><title>${title} · Lens</title><style>
  body{font-family:system-ui,sans-serif;display:grid;min-height:100dvh;place-items:center;margin:0}main{width:min(90vw,420px);text-align:center}h1{font-size:1.5rem}button{font:inherit;padding:0.75rem 1.25rem;border:0;border-radius:0.75rem;background:#3458f5;color:white}small{display:block;margin-top:1rem}</style><main><h1>${title}</h1><p>${instructions}</p><button id="close" type="button">닫기</button><small>닫히지 않으면 브라우저 상단의 완료 또는 X를 눌러 주세요.</small></main><script>document.getElementById("close").onclick=()=>window.close();${done ? "window.close();" : ""}</script></html>`,
    { headers },
  );
}
