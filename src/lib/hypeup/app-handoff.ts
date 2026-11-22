import { SignJWT, jwtVerify } from "jose";
import { OAUTH_CLIENT_COOKIE } from "./env.server";
import { appBridgeDocument, appReturnTarget, type AppReturnInput } from "./app-return";
import { cookieHeader, sessionSecretKey } from "./session.server";

export type { AppReturnInput };
export { appBridgeDocument, appReturnTarget };

export function appBridgeResponse(
  request: Request,
  input: AppReturnInput,
  extraCookies: string[] = [],
): Response {
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  for (const cookie of extraCookies) headers.append("set-cookie", cookie);
  headers.append("set-cookie", cookieHeader(OAUTH_CLIENT_COOKIE, "", request, 0));
  return new Response(appBridgeDocument(appReturnTarget(input)), { status: 200, headers });
}

export async function signAppHandoff(session: string): Promise<string> {
  return new SignJWT({ kind: "app-handoff", session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(sessionSecretKey());
}

export async function verifyAppHandoff(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey());
    if (payload.kind !== "app-handoff" || typeof payload.session !== "string") return null;
    return payload.session;
  } catch {
    return null;
  }
}
