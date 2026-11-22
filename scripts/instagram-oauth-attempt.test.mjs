import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

test("Instagram callback claims and recovers an attempt across concurrent requests", async (t) => {
  for (const [key, value] of Object.entries({
    DATABASE_URL: null,
    SUPABASE_DB_URL: null,
    POSTGRES_URL: null,
    POSTGRES_PRISMA_URL: null,
    INSTAGRAM_APP_ID: "test-instagram-app",
    INSTAGRAM_APP_SECRET: "test-instagram-secret",
    AUTH_SECRET: "test-only-session-secret",
    APP_ENCRYPTION_KEY: "ab".repeat(32),
  })) {
    const previous = process.env[key];
    if (value === null) delete process.env[key];
    else process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }

  const server = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    configFile: false,
    envDir: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: {
      alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
    },
    server: { middlewareMode: true, ws: false, watch: null },
  });
  let pglite;
  try {
    const { dbSource, getPglite, getSql } =
      await server.ssrLoadModule("/src/lib/db.ts");
    assert.equal(dbSource, "pglite");
    pglite = await getPglite();
    const {
      claimOAuthAttempt,
      completeOAuthAttempt,
      failOAuthAttempt,
      readOAuthAttempt,
    } = await server.ssrLoadModule("/src/lib/hypeup/oauth-attempt.server.ts");
    const sql = await getSql();

    await sql`
      insert into hypeup_user (id, ig_user_id, username, token_cipher)
      values ('lens-user', 'ig-user', 'lens-test', 'test-token')
    `;

    const binding = randomBytes(48).toString("hex");
    const otherBinding = randomBytes(48).toString("hex");
    const claimed = await Promise.all(
      Array.from({ length: 8 }, () => claimOAuthAttempt(binding)),
    );
    assert.equal(claimed.filter(Boolean).length, 1);
    assert.deepEqual(await readOAuthAttempt(binding), { status: "pending" });
    assert.equal(await readOAuthAttempt(otherBinding), null);
    assert.deepEqual(await sql`select state_hash from hypeup_oauth_attempt`, [
      { state_hash: createHash("sha256").update(binding).digest("hex") },
    ]);

    await completeOAuthAttempt(binding, "lens-user");
    await failOAuthAttempt(binding, "denied");
    assert.deepEqual(await readOAuthAttempt(binding), {
      status: "complete",
      userId: "lens-user",
      igUserId: "ig-user",
    });

    await sql`update hypeup_user set token_cipher = null where id = 'lens-user'`;
    assert.equal(await readOAuthAttempt(binding), null);

    assert.equal(await claimOAuthAttempt(otherBinding), true);
    await failOAuthAttempt(otherBinding, "code_used");
    assert.deepEqual(await readOAuthAttempt(otherBinding), {
      status: "failed",
      error: "code_used",
    });
    assert.equal(await claimOAuthAttempt(otherBinding), false);

    await sql`update hypeup_oauth_attempt set expires_at = now() - interval '1 minute'`;
    assert.equal(await readOAuthAttempt(otherBinding), null);
    await claimOAuthAttempt(randomBytes(48).toString("hex"));
    assert.deepEqual(
      await sql`select count(*) as count from hypeup_oauth_attempt`,
      [{ count: 1 }],
    );

    await t.test(
      "two callbacks redeem one code, and recovery requires its signed browser cookie",
      async (t) => {
        const { Route: startRoute } = await server.ssrLoadModule(
          "/src/routes/api/auth/instagram.ts",
        );
        const { Route: callbackRoute } = await server.ssrLoadModule(
          "/src/routes/api/auth/instagram.callback.ts",
        );
        const start = startRoute.options.server.handlers.GET;
        const callback = callbackRoute.options.server.handlers.GET;
        const origin = "https://lens.test";
        const startResponse = await start({
          request: new Request(origin + "/api/auth/instagram"),
        });
        const state = new URL(
          startResponse.headers.get("location"),
        ).searchParams.get("state");
        const stateCookie = startResponse.headers.getSetCookie()[0];
        const cookie = stateCookie.split(";", 1)[0];
        assert.equal(startResponse.headers.get("cache-control"), "no-store");
        assert.match(stateCookie, /; HttpOnly;/);
        assert.notEqual(cookie.split("=", 2)[1], state);

        const callbackUrl = new URL("/api/auth/instagram/callback", origin);
        callbackUrl.searchParams.set("state", state);
        callbackUrl.searchParams.set("code", "test-code");
        const getCallback = (binding) =>
          callback({
            request: new Request(callbackUrl, { headers: { cookie: binding } }),
          });

        let shortExchanges = 0;
        let resolveExchange;
        const exchangeGate = new Promise((resolve) => {
          resolveExchange = resolve;
        });
        let notifyExchangeStarted;
        const exchangeStarted = new Promise((resolve) => {
          notifyExchangeStarted = resolve;
        });
        t.mock.method(globalThis, "fetch", async (input) => {
          const url = new URL(input);
          if (
            url.hostname === "api.instagram.com" &&
            url.pathname === "/oauth/access_token"
          ) {
            shortExchanges++;
            notifyExchangeStarted();
            await exchangeGate;
            return shortExchanges === 1
              ? Response.json({
                  access_token: "test-short-token",
                  user_id: "test-account",
                })
              : Response.json(
                  { error_message: "This authorization code has been used" },
                  { status: 400 },
                );
          }
          assert.equal(url.hostname, "graph.instagram.com");
          if (url.pathname === "/access_token")
            return Response.json({ access_token: "test-long-token" });
          if (url.pathname.endsWith("/me")) {
            return Response.json({
              user_id: "test-account",
              username: "test-creator",
              account_type: "BUSINESS",
            });
          }
          assert.ok(url.pathname.endsWith("/subscribed_apps"));
          return Response.json({ success: true });
        });

        const first = getCallback(cookie);
        await exchangeStarted;
        const duplicate = getCallback(cookie);
        resolveExchange();
        const responses = await Promise.all([first, duplicate]);
        assert.equal(shortExchanges, 1);
        for (const response of responses) {
          assert.equal(response.headers.get("location"), origin + "/");
          assert.equal(response.headers.get("cache-control"), "no-store");
          assert.ok(
            response.headers
              .getSetCookie()
              .some((value) => value.startsWith("hypeup_session=")),
          );
        }

        const forged = await getCallback("hypeup_oauth_state=" + state);
        assert.equal(
          new URL(forged.headers.get("location")).searchParams.get("error"),
          "state",
        );
        assert.equal(forged.headers.getSetCookie().length, 0);
        assert.equal(shortExchanges, 1);
      },
    );
  } finally {
    await Promise.all([server.close(), pglite?.close()]);
  }
});
