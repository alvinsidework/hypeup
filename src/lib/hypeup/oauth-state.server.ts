import { SignJWT, jwtVerify } from "jose";
import { randomNonce } from "./crypto.server";
import { sessionSecretKey } from "./session.server";

export type OAuthClient = "web" | "app";

export const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export async function createOAuthState(client: OAuthClient) {
  const state = randomNonce();
  const proof = await new SignJWT({ kind: "instagram-oauth", state, client })
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
    return payload.client === "web" || payload.client === "app"
      ? payload.client
      : null;
  } catch {
    return null;
  }
}
