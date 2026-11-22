import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import {
  isAuthorizationCodeUsed,
  isLongLivedExchangeRejected,
  isProfessionalAccount,
  isUnsupportedMethod,
  normalizeAuthCode,
  parseGrantedScopes,
} from "./oauth-parse.ts";

test("recognizes Instagram's misleading method rejection", () => {
  assert.equal(isUnsupportedMethod(new Error("Unsupported request - method type: get")), true);
  assert.equal(isUnsupportedMethod(new Error("Unsupported request - method type: post")), true);
  assert.equal(isUnsupportedMethod(new Error("invalid code")), false);
});

test("treats the access_token object error as a failed long-lived exchange", () => {
  const message =
    "unsupported post request. Object with ID 'access_token' does not exist, cannot be loaded due to missing permissions, or does not support this operation";
  assert.equal(isLongLivedExchangeRejected(new Error(message)), true);
  assert.equal(isLongLivedExchangeRejected(new Error("Unsupported request - method type: get")), true);
  assert.equal(isLongLivedExchangeRejected(new Error("invalid code")), false);
});

test("strips Instagram #_ suffix from the auth code", () => {
  assert.equal(normalizeAuthCode("AQ123#_"), "AQ123");
  assert.equal(normalizeAuthCode("AQ123"), "AQ123");
});

test("recognizes already-used authorization codes separately from other authorization errors", () => {
  assert.equal(isAuthorizationCodeUsed(new Error("This authorization code has been used")), true);
  assert.equal(isAuthorizationCodeUsed(new Error("The authorization code has already been used.")), true);
  assert.equal(isAuthorizationCodeUsed(new Error("OAuthException: Authorization code was already used.")), true);
  assert.equal(isAuthorizationCodeUsed(new Error("Matching code was not found or was already used.")), true);
  assert.equal(isAuthorizationCodeUsed(new Error("The authorization code has expired.")), false);
  assert.equal(isAuthorizationCodeUsed(new Error("This access token has been used.")), false);
  assert.equal(isAuthorizationCodeUsed(new Error("This authorization code has not been used.")), false);
  assert.equal(isAuthorizationCodeUsed("This authorization code has been used"), false);
});

async function loadOAuth(context: TestContext): Promise<typeof import("./oauth")> {
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    resolve: { alias: { "@": fileURLToPath(new URL("../../", import.meta.url)) } },
    server: { middlewareMode: true, ws: false, watch: null },
  });
  context.after(() => server.close());
  return (await server.ssrLoadModule("/src/lib/instagram/oauth.ts")) as typeof import("./oauth");
}

test("the authorization URL stays on the web and preserves the Lens callback", async (context) => {
  const { authorizeUrl } = await loadOAuth(context);
  const redirectUri = "https://example.test/api/auth/instagram/callback";
  const url = new URL(authorizeUrl({ appId: "test-app", redirectUri, state: "test-state" }));
  assert.equal(url.origin, "https://www.instagram.com");
  assert.equal(url.pathname, "/oauth/authorize/");
  assert.equal(url.hash, "#weblink");
  assert.equal(url.searchParams.get("redirect_uri"), redirectUri);
  assert.equal(url.searchParams.get("state"), "test-state");
  assert.equal(url.searchParams.get("response_type"), "code");
});

test("the token exchange sends an authorization code once when Instagram rate limits it", async (context) => {
  const { exchangeShortLivedToken } = await loadOAuth(context);

  const request = context.mock.method(globalThis, "fetch", async () =>
    Response.json({ error_message: "Rate limited" }, { status: 429 }),
  );
  await assert.rejects(
    exchangeShortLivedToken({
      appId: "test-app",
      appSecret: "test-secret",
      redirectUri: "https://example.test/callback",
      code: "test-code#_",
    }),
    { name: "InstagramApiError", message: "Rate limited", status: 429 },
  );
  assert.equal(request.mock.callCount(), 1);
  const [url, options] = request.mock.calls[0].arguments;
  assert.equal(url, "https://api.instagram.com/oauth/access_token");
  assert.equal(options?.method, "POST");
  assert.equal(options?.redirect, "error");
  assert.ok(options?.body instanceof URLSearchParams);
  assert.equal(options.body.get("code"), "test-code");
});

test("rejects personal accounts", () => {
  assert.equal(isProfessionalAccount("PERSONAL"), false);
  assert.equal(isProfessionalAccount("BUSINESS"), true);
  assert.equal(isProfessionalAccount("MEDIA_CREATOR"), true);
});

test("parses granted scopes from a string or array", () => {
  assert.deepEqual(parseGrantedScopes("instagram_business_basic,instagram_business_manage_comments"), [
    "instagram_business_basic",
    "instagram_business_manage_comments",
  ]);
  assert.deepEqual(parseGrantedScopes(["instagram_business_basic", "instagram_business_manage_messages"]), [
    "instagram_business_basic",
    "instagram_business_manage_messages",
  ]);
});
