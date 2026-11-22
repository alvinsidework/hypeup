import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

test("rule-specific follower messages persist and reach each step of the gate", async (t) => {
  for (const [key, value] of Object.entries({
    DATABASE_URL: null,
    SUPABASE_DB_URL: null,
    POSTGRES_URL: null,
    POSTGRES_PRISMA_URL: null,
    INSTAGRAM_APP_ID: "test-instagram-app",
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
    const { getSql, getPglite, dbSource } =
      await server.ssrLoadModule("/src/lib/db.ts");
    assert.equal(dbSource, "pglite");
    pglite = await getPglite();
    const { encryptToken } = await server.ssrLoadModule(
      "/src/lib/hypeup/crypto.server.ts",
    );
    const { executeRuleOnComment, ingestWebhookMessage } =
      await server.ssrLoadModule("/src/lib/hypeup/actions.server.ts");
    const {
      findUserById,
      getComment,
      getRule,
      saveRule,
      upsertComment,
      upsertMedia,
    } = await server.ssrLoadModule("/src/lib/hypeup/repo.ts");
    const { getFollowerMessages, dmTextBytes } = await server.ssrLoadModule(
      "/src/lib/hypeup/rule-messages.ts",
    );
    assert.equal(dmTextBytes("한😀"), 7);
    assert.match(
      getFollowerMessages({ followButtonLabel: "$&" }).openingMessage,
      /\$&/,
    );

    const sql = await getSql();
    await sql`insert into hypeup_user (id, ig_user_id, username, token_cipher) values
      ('author', 'ig-author', 'author', ${encryptToken("test-token")}),
      ('other', 'ig-other', 'other', null)`;
    const author = await findUserById("author");
    const timestamp = new Date().toISOString();
    await upsertMedia(author.id, {
      id: "photo",
      caption: null,
      mediaType: "IMAGE",
      mediaUrl: null,
      thumbnailUrl: null,
      permalink: null,
      timestamp,
      likeCount: null,
      commentsCount: 1,
    });
    await upsertComment(author.id, {
      id: "comment",
      mediaId: "photo",
      parentId: null,
      igFromId: "comment-author",
      igFromUsername: "reader",
      text: "링크",
      timestamp,
      hidden: false,
      repliedPublic: false,
      repliedPrivate: false,
    });

    const base = {
      id: "rule",
      name: "안내",
      enabled: true,
      scope: "ALL",
      mediaId: null,
      matchMode: "CONTAINS",
      keywords: ["링크"],
      excludeKeywords: [],
      publicReplies: [],
      dmMessage: "최종 안내",
      hideComment: false,
      followersOnly: true,
      sortOrder: 0,
    };
    await saveRule(author.id, {
      ...base,
      followOpeningMessage: "먼저 확인해 주세요.",
      followReminderMessage: "팔로우 후 다시 확인해 주세요.",
      followButtonLabel: "확인하기",
    });
    await saveRule(author.id, { ...base, name: "안내 수정" });
    await assert.rejects(() => saveRule("other", base), /Failed to save rule/);
    const rule = await getRule(author.id, base.id);
    assert.equal(rule.name, "안내 수정");
    assert.equal(rule.followButtonLabel, "확인하기");

    let following = false;
    const messages = [];
    t.mock.method(globalThis, "fetch", async (input, options) => {
      const target = new URL(input);
      assert.equal(target.hostname, "graph.instagram.com");
      if (target.pathname.endsWith("/sender")) {
        return Response.json({
          username: "reader",
          is_user_follow_business: following,
        });
      }
      assert.ok(target.pathname.endsWith("/messages"));
      messages.push(JSON.parse(options.body));
      return Response.json({ message_id: "test-message" });
    });

    await executeRuleOnComment(author, await getComment(author.id, "comment"));
    const [opening] = messages;
    assert.deepEqual(opening.recipient, { comment_id: "comment" });
    assert.equal(opening.message.text, "먼저 확인해 주세요.");
    assert.equal(opening.message.quick_replies[0].title, "확인하기");
    const payload = opening.message.quick_replies[0].payload;
    const inbound = { igUserId: author.igUserId, senderId: "sender", payload };
    await ingestWebhookMessage(inbound);
    const reminder = messages[1];
    assert.deepEqual(reminder.recipient, { id: "sender" });
    assert.equal(reminder.message.text, "팔로우 후 다시 확인해 주세요.");
    assert.equal(reminder.message.quick_replies[0].title, "확인하기");
    assert.equal(reminder.message.quick_replies[0].payload, payload);

    following = true;
    await ingestWebhookMessage(inbound);
    assert.deepEqual(messages[2], {
      recipient: { id: "sender" },
      message: { text: "최종 안내" },
    });
    await ingestWebhookMessage(inbound);
    assert.equal(messages.length, 3);

    const reset = await saveRule(author.id, {
      ...base,
      followButtonLabel: null,
    });
    assert.equal(reset.followButtonLabel, null);
    assert.equal(getFollowerMessages(reset).buttonLabel, "안내 받기");
    assert.equal(reset.followOpeningMessage, "먼저 확인해 주세요.");
  } finally {
    await Promise.all([server.close(), pglite?.close()]);
  }
});
