import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

test("rate cards are withheld until the brand receives a creator text reply", async () => {
  for (const key of [
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
  ]) {
    delete process.env[key];
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
  let db;
  try {
    const { getSql, getPglite, dbSource } =
      await server.ssrLoadModule("/src/lib/db.ts");
    assert.equal(dbSource, "pglite");
    db = await getPglite();
    const sql = await getSql();
    const {
      applyDealAction,
      getBrandThread,
      getBrandThreadById,
      getInfluencerThread,
      getPublicPage,
      openInquiry,
      sendText,
    } = await server.ssrLoadModule("/src/lib/hypeup/lens-repo.ts");
    const { parseTerms } = await server.ssrLoadModule(
      "/src/lib/hypeup/lens-rules.ts",
    );

    await sql`insert into hypeup_user (id, ig_user_id, username) values ('creator', 'ig-creator', 'creator')`;
    await sql`insert into hypeup_page (user_id, username, is_public) values ('creator', 'creator', true)`;
    await sql`insert into hypeup_rate
      (id, user_id, format, title, model, amount_krw, rate_bps, is_public, price_hidden)
      values ('shared', 'creator', 'reel', 'Rate offered to brands', 'hybrid', 342129, 725, true, false),
             ('private', 'creator', 'feed', 'Private rate', 'fixed', 918213, null, false, false),
             ('hidden', 'creator', 'story', 'Hidden rate', 'fixed', 663113, null, true, true)`;
    await sql`insert into hypeup_brand (id, email, contact_name, company, trust)
      values ('brand-a', 'a@example.test', 'A', 'Company A', 'company_domain'),
             ('brand-b', 'b@example.test', 'B', 'Company B', 'company_domain')`;
    await sql`insert into hypeup_brand_account (brand_id, auth_subject)
      values ('brand-a', 'account-a'), ('brand-b', 'account-b')`;

    const page = await getPublicPage("creator");
    assert.ok(page);
    assert.equal("rates" in page, false);
    const open = (brandId) =>
      openInquiry({
        username: "creator",
        brandId,
        contactName: "A",
        company: "Brand",
      });
    const locked = (desk) => {
      assert.equal(desk?.rateCardState, "locked");
      assert.deepEqual(desk.rates, []);
    };
    const first = await open("brand-a");
    const second = await open("brand-b");
    assert.ok(first.ok && second.ok);
    locked(first.desk);
    locked(second.desk);
    const threadId = first.desk.id;
    assert.equal(await getBrandThreadById("brand-b", threadId), null);
    const creator = await getInfluencerThread("creator", threadId);
    assert.equal(creator.rateCardState, "visible");
    assert.equal(creator.rates.length, 3);

    const creatorText = (body) =>
      sendText({ threadId, userId: "creator", body });
    const brandText = (body) =>
      sendText({ threadId, brandId: "brand-a", body });
    assert.ok((await creatorText("Welcome")).ok);
    const firstText = await brandText("Can we collaborate?");
    assert.ok(firstText.ok);
    locked(firstText.desk);
    const parsed = parseTerms({
      title: "Manual offer",
      format: "reel",
      model: "fixed",
      amountKrw: 550000,
    });
    assert.ok(parsed.ok);
    const proposal = await applyDealAction({
      threadId,
      actor: { role: "influencer", name: "", userId: "creator" },
      action: "propose",
      terms: parsed.terms,
    });
    assert.ok(proposal.ok);
    const accepted = await applyDealAction({
      threadId,
      actor: { role: "brand", name: "", brandId: "brand-a" },
      action: "agree",
      dealId: proposal.desk.deals[0].id,
    });
    assert.ok(accepted.ok);
    assert.equal(accepted.desk.deals[0].terms.pricing.fixed_amount_krw, 550000);
    locked(accepted.desk);
    await sql`insert into hypeup_message (id, thread_id, sender, body) values ('empty-reply', ${threadId}, 'influencer', '\n\t ')`;
    const awaiting = await getBrandThread("creator", "brand-a");
    locked(awaiting);
    assert.equal(
      await getBrandThreadById("brand-a", threadId, awaiting.messageVersion),
      null,
    );

    assert.ok((await creatorText("Yes, I am available for this project.")).ok);
    const updated = await getBrandThreadById(
      "brand-a",
      threadId,
      awaiting.messageVersion,
    );
    assert.equal(updated?.rateCardState, "visible");
    assert.deepEqual(
      updated.rates.map(({ id, amountKrw, rateBps }) => ({
        id,
        amountKrw,
        rateBps,
      })),
      [{ id: "shared", amountKrw: 342129, rateBps: 725 }],
    );
    assert.equal((await brandText("Thanks")).desk.rateCardState, "visible");
    locked(await getBrandThread("creator", "brand-b"));

    const secondId = second.desk.id;
    await sql`insert into hypeup_message (id, thread_id, sender, body, created_at)
      values ('first-contact', ${secondId}, 'brand', 'Hello', '2026-01-01T00:00:00.000001Z'),
             ('same-time', ${secondId}, 'influencer', 'Welcome', '2026-01-01T00:00:00.000001Z')`;
    locked(await getBrandThreadById("brand-b", secondId));
    await sql`insert into hypeup_message (id, thread_id, sender, body, created_at)
      values ('later-reply', ${secondId}, 'influencer', 'Yes', '2026-01-01T00:00:00.000002Z')`;
    assert.equal(
      (await getBrandThreadById("brand-b", secondId)).rateCardState,
      "visible",
    );
    assert.equal("rates" in (await getPublicPage("creator")), false);

    await db.transaction(async (tx) => {
      await tx.exec(
        "create role data_api_user; grant select on hypeup_rate to data_api_user; set local role data_api_user",
      );
      assert.deepEqual((await tx.query("select id from hypeup_rate")).rows, []);
    });
  } finally {
    await Promise.all([server.close(), db?.close()]);
  }
});
