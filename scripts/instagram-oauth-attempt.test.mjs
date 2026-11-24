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
    INSTAGRAM_REDIRECT_URI:
      "https://hypeupinsta.vercel.app/api/auth/instagram/callback",
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

    await t.test(
      "only explicit tester-role rejections ask the user to check the invite",
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
        const providerCalls = [];
        const tokenErrors = new Map([
          ["need-role", "Insufficient Developer Role"],
          [
            "scope-error",
            "The request is not authorized due to missing permissions",
          ],
        ]);

        t.mock.method(globalThis, "fetch", async (input, init) => {
          const url = new URL(input);
          providerCalls.push(url.pathname);
          if (url.hostname === "api.instagram.com") {
            const code = init.body.get("code");
            const message = tokenErrors.get(code);
            if (message)
              return Response.json({ error_message: message }, { status: 400 });
            assert.equal(code, "profile-error");
            return Response.json({
              access_token: "test-short-token",
              user_id: "test-account",
            });
          }
          assert.equal(url.hostname, "graph.instagram.com");
          if (url.pathname === "/access_token")
            return Response.json({ access_token: "test-long-token" });
          assert.ok(url.pathname.endsWith("/me"));
          return Response.json(
            { error: { message: "Missing profile permissions", code: 10 } },
            { status: 400 },
          );
        });

        async function expectFailure(params, expected) {
          const started = await start({
            request: new Request(origin + "/api/auth/instagram"),
          });
          const state = new URL(
            started.headers.get("location"),
          ).searchParams.get("state");
          const cookie = started.headers.getSetCookie()[0].split(";", 1)[0];
          const url = new URL("/api/auth/instagram/callback", origin);
          url.search = new URLSearchParams({ state, ...params }).toString();
          const response = await callback({
            request: new Request(url, { headers: { cookie } }),
          });
          assert.equal(
            response.headers.get("location"),
            origin + "/connect?error=" + expected,
          );
          assert.match(
            response.headers.getSetCookie()[0],
            /^hypeup_oauth_state=;.*Max-Age=0/,
          );
          assert.equal(response.headers.getSetCookie().length, 1);
        }

        await expectFailure(
          {
            error: "access_denied",
            error_reason: "insufficient_developer_role",
          },
          "not_tester",
        );
        await expectFailure(
          {
            error: "access_denied",
            error_description: "Insufficient Developer Role",
          },
          "not_tester",
        );
        await expectFailure(
          {
            error: "access_denied",
            error_description: "Permissions not granted",
          },
          "denied",
        );
        assert.deepEqual(providerCalls, []);
        await expectFailure({ code: "need-role" }, "not_tester");
        await expectFailure({ code: "scope-error" }, "token_exchange");
        await expectFailure({ code: "profile-error" }, "oauth_retry");
        assert.equal(
          providerCalls.filter((path) => path === "/oauth/access_token").length,
          3,
        );
      },
    );
    await t.test(
      "PWA receives its session independently of the Instagram browser",
      async (t) => {
        const canonical = "https://www.lens4u.here";
        const legacy = "https://hypeupinsta.vercel.app";
        const path = "/api/auth/instagram";
        const handoffPath = `${path}/handoff`;
        const { Route: start } = await server.ssrLoadModule(
          `/src/routes${path}.ts`,
        );
        const { Route: callback } = await server.ssrLoadModule(
          `/src/routes${path}.callback.ts`,
        );
        const { Route: handoff } = await server.ssrLoadModule(
          `/src/routes${path}.handoff.ts`,
        );
        const postJson = (route, url, body, cookie = "") =>
          route.options.server.handlers.POST({
            request: new Request(url, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                origin: canonical,
                cookie,
              },
              body: JSON.stringify(body),
            }),
          });
        const cookieValue = (response) =>
          response.headers.getSetCookie()[0].split(";", 1)[0];

        const prepared = await postJson(start, canonical + path, {});
        const ticket = await prepared.json();
        assert.equal(ticket.status, "ready");
        assert.equal(ticket.launchUrl, legacy + path);
        assert.equal(ticket.expiresIn, 600);
        const claimCookie = cookieValue(prepared);
        assert.ok(
          claimCookie.startsWith(`hypeup_oauth_pwa_claim_${ticket.attemptId}=`),
        );
        assert.notEqual(claimCookie.split("=")[1], ticket.launchToken);
        const poll = (cookie) =>
          postJson(
            handoff,
            canonical + handoffPath,
            { attemptId: ticket.attemptId },
            cookie,
          );
        assert.deepEqual(await (await poll(claimCookie)).json(), {
          status: "pending",
        });

        const launch = (origin) =>
          start.options.server.handlers.POST({
            request: new Request(ticket.launchUrl, {
              method: "POST",
              headers: { origin, "sec-fetch-mode": "navigate" },
              body: new URLSearchParams({ launchToken: ticket.launchToken }),
            }),
          });
        assert.equal((await launch(legacy)).headers.get("location"), null);
        const launched = await launch(canonical);
        assert.equal(launched.status, 303);
        assert.equal((await launch(canonical)).headers.get("location"), null);
        const popupCookie = cookieValue(launched);
        assert.match(popupCookie, /^hypeup_oauth_pwa_state=/);
        const authorize = new URL(launched.headers.get("location"));
        const redirect = new URL(authorize.searchParams.get("redirect_uri"));
        redirect.search = new URLSearchParams({
          state: authorize.searchParams.get("state"),
          code: "pwa-test-code",
        });
        const finish = (cookie) =>
          callback.options.server.handlers.GET({
            request: new Request(redirect, { headers: { cookie } }),
          });
        let exchanges = 0;
        t.mock.method(globalThis, "fetch", async (input) => {
          const url = new URL(input);
          if (url.hostname === "api.instagram.com") {
            exchanges++;
            return Response.json({
              access_token: "short-test",
              user_id: "pwa-test-account",
            });
          }
          assert.equal(url.hostname, "graph.instagram.com");
          if (url.pathname === "/access_token")
            return Response.json({ access_token: "long-test" });
          if (url.pathname.endsWith("/me"))
            return Response.json({
              user_id: "pwa-test-account",
              username: "pwa-test-creator",
              account_type: "BUSINESS",
            });
          assert.ok(url.pathname.endsWith("/subscribed_apps"));
          return Response.json({ success: true });
        });
        assert.equal((await finish(claimCookie)).headers.get("location"), null);
        assert.equal(exchanges, 0);
        const result = await finish(popupCookie);
        assert.equal(
          result.headers.get("location"),
          `${canonical}${handoffPath}?view=complete`,
        );
        assert.match(
          result.headers.getSetCookie()[0],
          /^hypeup_oauth_pwa_state=;.*Max-Age=0/,
        );
        assert.equal(result.headers.getSetCookie().length, 1);
        assert.equal(exchanges, 1);
        assert.equal((await poll()).status, 403);
        assert.equal((await poll(popupCookie)).status, 403);
        for (let retry = 0; retry < 2; retry++) {
          const claimed = await poll(claimCookie);
          assert.deepEqual(await claimed.json(), { status: "complete" });
          const [clearClaim, session] = claimed.headers.getSetCookie();
          assert.match(clearClaim, /; Max-Age=0/);
          assert.match(session, /^hypeup_session=.+; Path=\/; HttpOnly/);
          const recovered = await poll(session.split(";", 1)[0]);
          assert.deepEqual(await recovered.json(), { status: "complete" });
          assert.equal(recovered.headers.getSetCookie().length, 0);
        }
      },
    );
  } finally {
    await Promise.all([server.close(), pglite?.close()]);
  }
});
