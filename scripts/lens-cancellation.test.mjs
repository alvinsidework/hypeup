import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

test("either party can make a new proposal after mutually cancelling an agreement", async () => {
  for (const key of [
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
  ]) {
    delete process.env[key];
  }
  process.env.APP_ENCRYPTION_KEY = "ab".repeat(32);
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
    const {
      applyDealAction,
      getBrandThreadById,
      getInfluencerThread,
      recordSource,
    } = await server.ssrLoadModule("/src/lib/hypeup/lens-repo.ts");
    const { parseTerms, canPropose, systemSentences } =
      await server.ssrLoadModule("/src/lib/hypeup/lens-rules.ts");
    const { putBrandContract } = await server.ssrLoadModule(
      "/src/lib/hypeup/brand-repo.server.ts",
    );
    const sql = await getSql();
    await sql`insert into hypeup_user (id, ig_user_id, username) values ('creator', 'ig-creator', 'example.creator')`;
    await sql`insert into hypeup_brand (id, email, contact_name, company, trust)
      values ('brand', 'owner@example.test', '대표', '예시 브랜드', 'company_domain')`;
    await sql`insert into hypeup_brand_account (brand_id, auth_subject) values ('brand', 'brand-account')`;
    await sql`insert into hypeup_thread (id, user_id, brand_id) values ('thread', 'creator', 'brand')`;

    const brandContract = {
      kind: "company",
      legalName: "기존 예시 브랜드",
      birthDate: "",
      registrationNumber: "",
      phone: "",
      address: "",
      signature: null,
    };
    await putBrandContract("brand", brandContract);

    const brand = { role: "brand", name: "", brandId: "brand" };
    const creator = { role: "influencer", name: "", userId: "creator" };
    const act = (actor, action, details = {}) =>
      applyDealAction({
        threadId: "thread",
        actor,
        action,
        ...details,
      });
    const read = (actor, version) =>
      actor.role === "brand"
        ? getBrandThreadById(actor.brandId, "thread", version)
        : getInfluencerThread(actor.userId, "thread", version);
    const parsed = parseTerms({
      title: "릴스 협업",
      format: "reel",
      model: "fixed",
      amountKrw: 300000,
    });
    assert.ok(parsed.ok);
    let firstDealId;

    for (const [proposer, partner] of [
      [brand, creator],
      [creator, brand],
      [brand, creator],
    ]) {
      const proposed = await act(proposer, "propose", { terms: parsed.terms });
      assert.ok(proposed.ok);
      const draft = proposed.desk.deals.find((deal) => deal.status === "draft");
      assert.ok(draft);
      assert.equal(draft.proposedBy, proposer.role);
      firstDealId ??= draft.id;
      const selection = { dealId: draft.id };

      const agreed = await act(partner, "agree", selection);
      assert.ok(agreed.ok);
      assert.ok(
        agreed.desk.deals.find((deal) => deal.id === draft.id)?.agreedAt,
      );
      assert.equal((await act(partner, "confirm_cancel", selection)).ok, false);

      const requested = await act(proposer, "cancel", selection);
      assert.ok(requested.ok);
      assert.equal(
        requested.desk.deals.find((deal) => deal.id === draft.id)
          ?.cancelRequestedBy,
        proposer.role,
      );
      assert.equal(
        (await act(proposer, "confirm_cancel", selection)).ok,
        false,
      );
      assert.equal(
        (await act(partner, "propose", { terms: parsed.terms })).ok,
        false,
      );
      const waiting = await read(proposer);
      assert.ok(waiting);
      assert.equal(await read(proposer, waiting.messageVersion), null);

      const results = await Promise.all([
        act(partner, "confirm_cancel", selection),
        act(partner, "confirm_cancel", selection),
      ]);
      assert.equal(results.filter((result) => result.ok).length, 1);
      const cancelled = results.find((result) => result.ok);
      assert.ok(cancelled);
      assert.equal(
        cancelled.desk.deals.find((deal) => deal.id === draft.id)?.status,
        "cancelled",
      );
      assert.equal(canPropose(cancelled.desk.deals), true);
      const refreshed = await read(proposer, waiting.messageVersion);
      assert.ok(refreshed);
      assert.notEqual(refreshed.messageVersion, waiting.messageVersion);
      assert.equal(canPropose(refreshed.deals), true);
    }

    await putBrandContract("brand", {
      ...brandContract,
      legalName: "새 예시 브랜드",
    });
    const historical = await recordSource({ userId: "creator" }, firstDealId);
    assert.ok(historical.ok);
    assert.equal(historical.deal.status, "cancelled");
    assert.ok(historical.deal.agreedAt);
    assert.deepEqual(historical.deal.brandContract, brandContract);
    assert.deepEqual(historical.deal.terms, parsed.terms);
    assert.equal(
      historical.messages.filter(
        (message) => message.body === systemSentences.cancelled(),
      ).length,
      3,
    );
  } finally {
    await server.close();
    await pglite?.close();
  }
});
