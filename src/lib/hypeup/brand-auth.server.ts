import { createClient, type AuthError } from "@supabase/supabase-js";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { env } from "@/lib/env.server";
import { isSecureCookie } from "./env.server";
import { sessionSecretKey } from "./session.server";
import type { BrandAuthOptions } from "./brand-auth-api";

const SESSION_COOKIE = "lens_brand_session";
const ATTEMPT_COOKIE = "lens_brand_auth_attempt";
const SESSION_LIFETIME = 60 * 60 * 24 * 7;
const ATTEMPT_LIFETIME = 60 * 60;
const OTP_RESEND_DELAY = 60;
const ISSUER = "lens:brand";
const SESSION_AUDIENCE = "lens:brand:session";
const ATTEMPT_AUDIENCE = "lens:brand:attempt";
const DEFAULT_RETURN = "/brand";
const RETURN_ORIGIN = "https://lens.invalid";
const emailSchema = z.email().max(254);
const unavailableOptions: BrandAuthOptions = { email: false };
const unavailable = "지금은 이메일 로그인을 이용할 수 없어요.";
const invalidCode =
  "인증번호가 올바르지 않거나 만료됐어요. 다시 확인하거나 새 번호를 요청해 주세요.";
const verifyError =
  "이메일 인증을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";
const rateLimited = "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};

export type BrandIdentity = { subject: string; email: string; name: string };

function supabaseConfig() {
  const url = env("SUPABASE_URL");
  const key = env("SUPABASE_ANON_KEY");
  return url && key ? { url, key } : null;
}

let optionsCache:
  { expiresAt: number; result: Promise<BrandAuthOptions> } | undefined;

export async function readBrandAuthOptions(): Promise<BrandAuthOptions> {
  const config = supabaseConfig();
  if (!config || env("BRAND_AUTH_EMAIL_ENABLED") === "false")
    return unavailableOptions;
  if (optionsCache && optionsCache.expiresAt > Date.now())
    return optionsCache.result;

  const result = fetch(new URL("/auth/v1/settings", config.url), {
    headers: { apikey: config.key },
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  })
    .then(async (response) => {
      if (!response.ok) return unavailableOptions;
      const { external, mailer_autoconfirm: autoConfirm } =
        (await response.json()) as {
          external?: Partial<BrandAuthOptions>;
          mailer_autoconfirm?: boolean;
        };
      return { email: external?.email === true && autoConfirm === false };
    })
    .catch(() => unavailableOptions);

  optionsCache = { expiresAt: Date.now() + 60_000, result };
  return result;
}

function cookieOptions(request: Request, maxAge: number) {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureCookie(request),
    maxAge,
  };
}

function createAuthClient() {
  const config = supabaseConfig();
  if (!config) return null;
  let retryAfter: number | undefined;
  const { auth } = createClient(config.url, config.key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (input, init) => {
        const response = await fetch(input, {
          ...init,
          signal: AbortSignal.timeout(8000),
        });
        const header = response.headers.get("Retry-After");
        if (header !== null) {
          const seconds = /^\d+$/.test(header)
            ? Number(header)
            : (Date.parse(header) - Date.now()) / 1000;
          if (Number.isSafeInteger(Math.ceil(seconds)) && seconds > 0)
            retryAfter = Math.ceil(seconds);
        }
        return response;
      },
    },
  });
  return { auth, resendDelay: () => retryAfter ?? OTP_RESEND_DELAY };
}

function localReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  )
    return DEFAULT_RETURN;
  const url = new URL(value, RETURN_ORIGIN);
  if (
    url.origin !== RETURN_ORIGIN ||
    url.pathname.startsWith("//") ||
    /^\/api(?:\/|$)/i.test(url.pathname) ||
    /%2f|%5c/i.test(url.pathname)
  )
    return DEFAULT_RETURN;
  return `${url.pathname}${url.search}${url.hash}`;
}

function sameOriginPost(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

function fail(
  error: string,
  status: number,
  retryAfterSeconds?: number,
): Response {
  const headers = new Headers(privateHeaders);
  if (retryAfterSeconds) headers.set("Retry-After", String(retryAfterSeconds));
  return Response.json(
    { ok: false, error, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) },
    { status, headers },
  );
}

function isRateLimited(error: AuthError): boolean {
  return (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  );
}

function signToken(
  audience: string,
  payload: Record<string, string>,
  maxAge: number,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(sessionSecretKey());
}

async function readToken(cookie: string, audience: string) {
  const token = getCookie(cookie);
  if (!token) return null;
  try {
    return (
      await jwtVerify(token, sessionSecretKey(), {
        algorithms: ["HS256"],
        issuer: ISSUER,
        audience,
      })
    ).payload;
  } catch {
    return null;
  }
}

export async function getBrandIdentity(): Promise<BrandIdentity | null> {
  const payload = await readToken(SESSION_COOKIE, SESSION_AUDIENCE);
  if (
    typeof payload?.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.name !== "string"
  )
    return null;
  return { subject: payload.sub, email: payload.email, name: payload.name };
}

export async function beginBrandAuth(request: Request): Promise<Response> {
  if (!sameOriginPost(request)) return fail(unavailable, 403);
  const form = await request.formData().catch(() => null);
  const email = emailSchema.safeParse(
    String(form?.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!email.success) return fail("이메일 주소를 확인해 주세요.", 400);
  if (!(await readBrandAuthOptions()).email) return fail(unavailable, 503);

  try {
    const client = createAuthClient();
    if (!client) return fail(unavailable, 503);

    const previous = await readToken(ATTEMPT_COOKIE, ATTEMPT_AUDIENCE);
    if (previous?.email === email.data && typeof previous.iat === "number") {
      const wait = Math.ceil(
        previous.iat + OTP_RESEND_DELAY - Date.now() / 1000,
      );
      if (wait > 0) return fail(rateLimited, 429, wait);
    }

    const attempt = await signToken(
      ATTEMPT_AUDIENCE,
      {
        email: email.data,
        returnTo: localReturnTo(form?.get("returnTo")),
      },
      ATTEMPT_LIFETIME,
    );
    const { error } = await client.auth.signInWithOtp({
      email: email.data,
      options: { shouldCreateUser: true },
    });
    if (error) {
      return isRateLimited(error)
        ? fail(rateLimited, 429, client.resendDelay())
        : fail("인증번호를 보내지 못했어요. 잠시 후 다시 시도해 주세요.", 502);
    }

    setCookie(
      ATTEMPT_COOKIE,
      attempt,
      cookieOptions(request, ATTEMPT_LIFETIME),
    );
    return Response.json(
      { ok: true, email: email.data, retryAfterSeconds: OTP_RESEND_DELAY },
      { headers: privateHeaders },
    );
  } catch {
    return fail("인증번호를 보내지 못했어요. 잠시 후 다시 시도해 주세요.", 502);
  }
}

export async function verifyBrandAuth(request: Request): Promise<Response> {
  if (!sameOriginPost(request)) return fail(unavailable, 403);
  const form = await request.formData().catch(() => null);
  const token = String(form?.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(token))
    return fail("인증번호 6자리를 입력해 주세요.", 400);
  const attempt = await readToken(ATTEMPT_COOKIE, ATTEMPT_AUDIENCE);
  if (typeof attempt?.email !== "string") {
    return fail(
      "인증 요청이 만료됐어요. 이메일로 새 인증번호를 받아 주세요.",
      400,
    );
  }
  if (!(await readBrandAuthOptions()).email) return fail(unavailable, 503);

  try {
    const client = createAuthClient();
    if (!client) return fail(unavailable, 503);
    const { data, error } = await client.auth.verifyOtp({
      email: attempt.email,
      token,
      type: "email",
    });
    if (error) {
      if (isRateLimited(error)) return fail(rateLimited, 429);
      return error.code === "otp_expired" ||
        error.status === 400 ||
        error.status === 403 ||
        error.status === 422
        ? fail(invalidCode, 400)
        : fail(verifyError, 502);
    }

    const user = data.user;
    if (
      !data.session ||
      typeof user?.id !== "string" ||
      !user.id ||
      user.email?.trim().toLowerCase() !== attempt.email ||
      !user.email_confirmed_at ||
      user.is_anonymous
    )
      return fail(verifyError, 502);

    const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
    const session = await signToken(
      SESSION_AUDIENCE,
      {
        sub: user.id,
        email: attempt.email,
        name: typeof name === "string" ? name.trim().slice(0, 120) : "",
      },
      SESSION_LIFETIME,
    );
    setCookie(ATTEMPT_COOKIE, "", cookieOptions(request, 0));
    setCookie(
      SESSION_COOKIE,
      session,
      cookieOptions(request, SESSION_LIFETIME),
    );
    return Response.json(
      { ok: true, redirectTo: localReturnTo(attempt.returnTo) },
      { headers: privateHeaders },
    );
  } catch {
    return fail(verifyError, 502);
  }
}

export async function logoutBrand(request: Request): Promise<Response> {
  if (!sameOriginPost(request)) return fail(unavailable, 403);
  const form = await request.formData().catch(() => null);
  setCookie(ATTEMPT_COOKIE, "", cookieOptions(request, 0));
  setCookie(SESSION_COOKIE, "", cookieOptions(request, 0));
  return new Response(null, {
    status: 303,
    headers: {
      ...privateHeaders,
      Location: localReturnTo(form?.get("returnTo")),
    },
  });
}
