import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

const jpeg =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAADAAMDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABQf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCOALiMf//Z";

test("profile photos and linked Instagram metrics follow saved publication choices", async (t) => {
  for (const key of [
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
  ])
    delete process.env[key];
  process.env.INSTAGRAM_APP_ID = "test-instagram-app";
  process.env.APP_ENCRYPTION_KEY = "ab".repeat(32);
  const workspace = fileURLToPath(new URL("../", import.meta.url));
  const server = await createServer({
    root: workspace,
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
    const { getSql, getPglite, dbSource } =
      await server.ssrLoadModule("/src/lib/db.ts");
    assert.equal(dbSource, "pglite");
    pglite = await getPglite();
    const { getMedia, findUserById } = await server.ssrLoadModule(
      "/src/lib/hypeup/repo.ts",
    );
    const {
      getProfilePhoto,
      buildPublicPage,
      getPublicPage,
      savePage,
      saveWork,
    } = await server.ssrLoadModule("/src/lib/hypeup/lens-repo.ts");
    const { isProfileJpeg } = await server.ssrLoadModule(
      "/src/lib/hypeup/profile-photo.server.ts",
    );
    const { encryptToken } = await server.ssrLoadModule(
      "/src/lib/hypeup/crypto.server.ts",
    );
    const { syncPortfolioMedia } = await server.ssrLoadModule(
      "/src/lib/hypeup/actions.server.ts",
    );

    assert.equal(isProfileJpeg(jpeg), true);
    assert.equal(isProfileJpeg("data:image/jpeg;base64," + jpeg), false);
    const oversized = Buffer.from(jpeg, "base64");
    oversized.writeUInt16BE(
      513,
      oversized.indexOf(Buffer.from([0xff, 0xc0])) + 5,
    );
    assert.equal(isProfileJpeg(oversized.toString("base64")), false);

    const sql = await getSql();
    await sql`insert into hypeup_user (id, ig_user_id, username, token_cipher) values
      ('owner', 'ig-owner', 'studio.hana', ${encryptToken("test-token")}),
      ('other', 'ig-other', 'another', null)`;
    const owner = await findUserById("owner");
    t.mock.method(globalThis, "fetch", async (url) => {
      const request = new URL(url);
      assert.match(request.pathname, /\/me\/media$/);
      assert.match(request.searchParams.get("fields"), /like_count/);
      const after = request.searchParams.get("after");
      if (!after)
        return Response.json({
          data: [],
          paging: { next: "next", cursors: { after: "older" } },
        });
      assert.equal(after, "older");
      return Response.json({
        data: [
          {
            id: "photo",
            thumbnail_url: "https://example.com/photo.jpg",
            like_count: 312,
            comments_count: 0,
          },
        ],
      });
    });
    assert.equal((await syncPortfolioMedia(owner)).nextAfter, "older");
    const older = await syncPortfolioMedia(owner, "older");
    assert.equal(older.nextAfter, null);
    assert.equal((await getMedia("owner", "photo")).likeCount, 312);
    assert.equal(await getMedia("other", "photo"), null);

    const profile = {
      username: "studio-hana",
      displayName: "하나 스튜디오",
      bio: "작업을 소개합니다",
      categories: [],
      instagramHandle: "studio.hana",
      instagramFollowers: null,
      tiktokHandle: "",
      tiktokFollowers: null,
      youtubeHandle: "",
      youtubeFollowers: null,
      links: [],
      isPublic: false,
    };
    const draft = await savePage("owner", { ...profile, profilePhoto: jpeg });
    assert.equal(draft.ok, true);
    const key = new URL(
      draft.page.customPhotoUrl,
      "http://localhost",
    ).searchParams.get("key");
    assert.equal(await getPublicPage(profile.username), null);
    assert.equal(await getProfilePhoto(key, null), null);
    assert.equal(await getProfilePhoto(key, "other"), null);
    assert.deepEqual(
      Buffer.from(await getProfilePhoto(key, "owner")),
      Buffer.from(jpeg, "base64"),
    );

    const work = {
      title: "작업",
      brandName: "",
      channel: "instagram",
      format: "feed",
      postUrl: "",
      coverUrl: "",
      postedMonth: "",
      highlightLabel: "좋아요수",
      highlightValue: "312",
      stats: [{ label: "좋아요수", value: "312" }],
      isPublic: true,
      instagramMediaId: "photo",
      publicMetrics: ["views", "comments"],
      viewCount: 1234,
    };
    assert.equal((await saveWork("owner", work)).ok, true);
    assert.equal((await saveWork("owner", work)).ok, false);
    const preview = await buildPublicPage(
      "owner",
      draft.page,
      profile.username,
      null,
    );
    assert.equal(preview.channels[0].followers, null);
    assert.equal(preview.works[0].coverUrl, "https://example.com/photo.jpg");
    assert.equal(preview.works[0].highlightLabel, null);
    assert.deepEqual(preview.works[0].stats, [
      { label: "조회수", value: "1,234" },
      { label: "댓글수", value: "0" },
    ]);
    assert.equal(JSON.stringify(preview.works[0]).includes("312"), false);

    await savePage("owner", { ...profile, isPublic: true });
    assert.equal(
      (await getPublicPage(profile.username)).avatarUrl,
      draft.page.customPhotoUrl,
    );
    assert.ok(await getProfilePhoto(key, null));
    await savePage("owner", { ...profile, isPublic: true, profilePhoto: null });
    assert.equal((await getPublicPage(profile.username)).avatarUrl, null);
    assert.equal(await getProfilePhoto(key, null), null);
  } finally {
    await Promise.all([server.close(), pglite?.close()]);
  }
});
