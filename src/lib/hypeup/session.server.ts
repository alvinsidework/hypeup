import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { authSecret, isDemoMode, isSecureCookie, SESSION_COOKIE } from "./env.server";

const globalRef = globalThis as typeof globalThis & { __hypeupDemoSecret__?: string };

export type SessionPayload = {
  userId: string;
  igUserId: string;
};

const THIRTY_DAYS = 60 * 60 * 24 * 30;

function secretKey(): Uint8Array {
  const secret = authSecret();
  if (secret) return new TextEncoder().encode(secret);
  if (isDemoMode()) {
    globalRef.__hypeupDemoSecret__ ??= randomBytes(32).toString("hex");
    return new TextEncoder().encode(globalRef.__hypeupDemoSecret__);
  }
  throw new Error("AUTH_SECRET is not set");
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const userId = typeof payload.userId === "string" ? payload.userId : null;
    const igUserId = typeof payload.igUserId === "string" ? payload.igUserId : null;
    if (!userId || !igUserId) return null;
    return { userId, igUserId };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const request = getRequest();
  setCookie(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: request ? isSecureCookie(request) : false,
    maxAge: THIRTY_DAYS,
  });
}

export function clearSessionCookie(): void {
  const request = getRequest();
  setCookie(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: request ? isSecureCookie(request) : false,
    maxAge: 0,
  });
}

export function cookieHeader(
  name: string,
  value: string,
  request: Request,
  maxAge: number,
): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (isSecureCookie(request)) parts.push("Secure");
  return parts.join("; ");
}

export function readCookieHeader(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (rawKey === name) return rest.join("=");
  }
  return undefined;
}
