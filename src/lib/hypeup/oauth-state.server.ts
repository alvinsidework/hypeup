import { SignJWT, jwtVerify } from "jose";
import { randomNonce } from "./crypto.server";
import { sessionSecretKey } from "./session.server";

export type OAuthClient =
  | { client: "web" | "app" }
  | { client: "pwa"; attempt: { id: string; origin: string } };

export const OAUTH_STATE_TTL_SECONDS = 10 * 60;
export const PWA_OAUTH_STATE_COOKIE = "hypeup_oauth_pwa_state";
export const PWA_OAUTH_STATE_PREFIX = "pwa_";

export async function createOAuthState(client: OAuthClient) {
  const state =
    (client.client === "pwa" ? PWA_OAUTH_STATE_PREFIX : "") + randomNonce();
  const proof = await new SignJWT({ kind: "instagram-oauth", state, ...client })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_STATE_TTL_SECONDS}s`)
    .sign(sessionSecretKey());
  return { state, proof };
}

export async function verifyOAuthState(
  proof: string | undefined,
  state: string | null,
): Promise<OAuthClient | null> {
  if (!proof || !state) return null;
  try {
    const { payload } = await jwtVerify(proof, sessionSecretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.kind !== "instagram-oauth" || payload.state !== state)
      return null;
    if (payload.client === "web" || payload.client === "app")
      return { client: payload.client };
    if (payload.client === "pwa" && state.startsWith(PWA_OAUTH_STATE_PREFIX)) {
      const attempt = payload.attempt as {
        id?: unknown;
        origin?: unknown;
      } | null;
      if (typeof attempt?.id === "string" && typeof attempt.origin === "string")
        return {
          client: "pwa",
          attempt: { id: attempt.id, origin: attempt.origin },
        };
    }
    return null;
  } catch {
    return null;
  }
}
