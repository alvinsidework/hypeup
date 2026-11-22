import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

test("Instagram sync scopes limit remote reads and preserve saved comment state", async (t) => {
  for (const [key, value] of Object.entries({
    DATABASE_URL: null,
    SUPABASE_DB_URL: null,
    POSTGRES_URL: null,
    POSTGRES_PRISMA_URL: null,
    INSTAGRAM_APP_ID: "test-instagram-app",
    APP_ENCRYPTION_KEY: "ab".repeat(32),
  })) {
    const old = process.env[key];
    if (value === null) delete process.env[key];
    else process.env[key] = value;
    t.after(() => {
      if (old === undefined) delete process.env[key];
      else process.env[key] = old;
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
    const { encryptToken } = await server.ssrLoadModule(
      "/src/lib/hypeup/crypto.server.ts",
    );
    const {
      findUserById,
      getComment,
      getMedia,
      upsertMediaBatch,
      updateCommentFlags,
    } = await server.ssrLoadModule("/src/lib/hypeup/repo.ts");
    const { syncFromInstagram } = await server.ssrLoadModule(
      "/src/lib/hypeup/actions.server.ts",
    );
    const sql = await getSql();
    await sql`insert into hypeup_user (id, ig_user_id, username, token_cipher) values
      ('operator', 'test-ig', 'operator', ${encryptToken("test-token")}),
      ('other-operator', 'other-ig', 'other-operator', null)`;
    const user = await findUserById("operator");
    assert.ok(user);

    const timestamp = new Date().toISOString();
    const media = [
      {
        id: "photo",
        media_type: "IMAGE",
        media_url: "https://example.test/photo.jpg",
        timestamp,
        comments_count: 2,
      },
      {
        id: "video",
        media_type: "VIDEO",
        media_url: "https://example.test/video.mp4",
        timestamp,
        comments_count: 0,
      },
    ];
    const calls = [];
    let rejectPhoto = false;
    t.mock.method(globalThis, "fetch", async (input, init) => {
      const url = new URL(input);
      assert.equal(url.hostname, "graph.instagram.com");
      const path = url.pathname.replace(/^\/v\d+\.\d+/, "");
      calls.push({ path, method: init.method });
      if (path === "/me/media") return Response.json({ data: media });
      if (path === "/second-photo/comments") {
        return Response.json({
          data: [
            {
              id: "older-comment",
              text: "An older comment",
              timestamp: new Date(
                Date.now() - 8 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          ],
        });
      }
      if (path !== "/photo/comments")
        throw new Error("unexpected Instagram fixture call");
      if (rejectPhoto)
        return Response.json(
          { error: { message: "Permission denied", code: 200 } },
          { status: 403 },
        );
      return Response.json({
        data: [
          {
            id: "root-comment",
            text: "A comment",
            timestamp,
            from: { id: "reader", username: "reader" },
            replies: {
              data: [{ id: "reply-comment", text: "A reply", timestamp }],
            },
          },
          { id: "second-comment", text: "Second comment", timestamp },
        ],
      });
    });

    const events = [];
    const publish = (event) => {
      events.push(event);
    };
    const posts = await syncFromInstagram(user, { scope: "posts" }, publish);
    assert.deepEqual(calls, [{ path: "/me/media", method: "GET" }]);
    assert.equal(posts.report.media, 2);
    assert.equal(posts.report.comments, 0);
    assert.equal(posts.report.rulesRan, 0);
    assert.ok(events[0].type === "progress" && events[0].value === undefined);
    const snapshot = events.find((event) => event.type === "media");
    assert.equal(snapshot.media.length, 2);
    assert.equal(
      snapshot.media.find((item) => item.id === "video").thumbnailUrl,
      null,
    );

    const photo = await getMedia(user.id, "photo");
    await upsertMediaBatch("other-operator", [
      { ...photo, caption: "Not this account's photo" },
    ]);
    assert.equal(await getMedia("other-operator", "photo"), null);
    assert.deepEqual(await getMedia(user.id, "photo"), photo);

    calls.length = 0;
    await assert.rejects(
      syncFromInstagram(
        user,
        { scope: "post", mediaId: "missing-post" },
        publish,
      ),
      /not_found/,
    );
    assert.deepEqual(calls, []);
    const post = await syncFromInstagram(
      user,
      { scope: "post", mediaId: "photo" },
      publish,
    );
    assert.deepEqual(calls, [{ path: "/photo/comments", method: "GET" }]);
    assert.equal(post.report.comments, 2);
    assert.equal(post.report.rulesRan, 0);
    assert.equal(post.comments.length, 3);
    assert.equal(
      post.comments.find((comment) => comment.id === "reply-comment").parentId,
      "root-comment",
    );
    const flags = {
      hidden: true,
      repliedPrivate: true,
      automationProcessedAt: timestamp,
    };
    await updateCommentFlags(user.id, "root-comment", flags);
    await syncFromInstagram(user, { scope: "post", mediaId: "photo" }, publish);
    const reloaded = await getComment(user.id, "root-comment");
    for (const [key, value] of Object.entries(flags))
      assert.equal(reloaded[key], value);

    calls.length = 0;
    events.length = 0;
    media.push({
      id: "second-photo",
      media_type: "IMAGE",
      media_url: "https://example.test/second-photo.jpg",
      timestamp,
      comments_count: 1,
    });
    const inbox = await syncFromInstagram(user, { scope: "inbox" }, publish);
    assert.deepEqual(
      calls.map((call) => call.path),
      ["/me/media", "/photo/comments", "/second-photo/comments"],
    );
    assert.equal(inbox.report.rulesRan, 1);
    assert.equal(inbox.report.comments, 3);
    assert.equal(inbox.comments.length, 4);
    assert.ok(
      events.some(
        (event) => event.value === 75 && event.detail === "게시물 2 / 2",
      ),
    );
    assert.ok(
      events.some(
        (event) => event.value === 95 && event.detail === "댓글 1 / 1",
      ),
    );

    calls.length = 0;
    rejectPhoto = true;
    await assert.rejects(
      syncFromInstagram(user, { scope: "post", mediaId: "photo" }, publish),
      /Permission denied/,
    );
    assert.deepEqual(
      calls.map((call) => call.path),
      ["/photo/comments"],
    );
  } finally {
    await Promise.all([server.close(), pglite?.close()]);
  }
});
