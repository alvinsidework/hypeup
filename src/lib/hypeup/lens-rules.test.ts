import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  USERNAME_RE,
  buildDealRecord,
  canPropose,
  canonicalJson,
  copyIsSafe,
  maskAccount,
  maskEmail,
  parseTerms,
  priceLabel,
  proposalAddOnRows,
  suggestUsername,
  systemSentences,
  termsToInput,
  transitionError,
  trustForEmail,
  trustLabel,
  usageLabel,
  validateUsername,
} from "./lens-rules.ts";

describe("username", () => {
  it("accepts a short slug and rejects reserved or dotted names", () => {
    assert.equal(validateUsername("mina").ok, true);
    assert.equal(validateUsername("Mina").ok, true);
    assert.equal(validateUsername("mina").ok && validateUsername("Mina").ok ? validateUsername("mina").ok : false, true);
    const upper = validateUsername("Mina");
    assert.equal(upper.ok && upper.username, "mina");
    assert.equal(validateUsername("ab").ok, false);
    assert.equal(validateUsername("-mina").ok, false);
    assert.equal(validateUsername("mina-").ok, false);
    assert.equal(validateUsername("posts").ok, false);
    assert.equal(validateUsername("brand").ok, false);
    assert.equal(validateUsername("lens").ok, false);
    assert.equal(validateUsername("a.b").ok, false);
    assert.equal(suggestUsername("Hype.Up_1"), "hype-up-1");
  });

  it("explains app route collisions and rejects them in username suggestions", () => {
    assert.deepEqual(validateUsername(" Contacts "), {
      ok: false,
      error: "Lens에서 사용하는 주소예요. 다른 주소를 입력해 주세요.",
    });
    assert.equal(suggestUsername("contacts"), "");
  });

  it("reserves every static app route prefix that could be a public username", () => {
    const routeTree = readFileSync(new URL("../../routeTree.gen.ts", import.meta.url), "utf8");
    const prefixes = new Set(
      Array.from(routeTree.matchAll(/\bfullPath:\s*['"]\/([^/'"]+)/g), ([, prefix]) => prefix.toLowerCase())
        .filter((prefix) => USERNAME_RE.test(prefix)),
    );
    assert.ok(prefixes.has("contacts") && prefixes.has("api"), "could not read generated route paths");
    for (const prefix of prefixes) {
      assert.equal(validateUsername(prefix).ok, false, `/${prefix} conflicts with the app routes`);
    }
  });
});

describe("trust and masking", () => {
  it("labels free mail and hides the middle of an email and account", () => {
    assert.equal(trustForEmail("studio@gmail.com"), "personal_email");
    assert.equal(trustForEmail("hello@brand.co.kr"), "company_domain");
    assert.equal(trustLabel("company_domain"), "회사 메일");
    assert.equal(trustLabel("personal_email"), "개인 메일");
    assert.equal(maskEmail("alvin@brand.co.kr"), "a***n@brand.co.kr");
    assert.equal(maskAccount("국민", "123456781234"), "국민 ****1234");
  });
});

describe("terms", () => {
  const input = { title: "릴스 제안", format: "reel", model: "fixed", amountKrw: 300000 };

  it("keeps fixed, performance, and hybrid amounts apart", () => {
    const fixed = parseTerms({ title: "봄 자켓 릴스 1건", format: "reel", model: "fixed", amountKrw: 300000, revisions: 1 });
    assert.equal(fixed.ok, true);
    if (fixed.ok) {
      assert.equal(fixed.terms.pricing.fixed_amount_krw, 300000);
      assert.equal(fixed.terms.pricing.performance_rate_bps, null);
    }
    assert.equal(parseTerms({ title: "성과", format: "reel", model: "performance", ratePercent: 15 }).ok, true);
    assert.equal(parseTerms({ title: "성과", format: "reel", model: "performance", amountKrw: 1000 }).ok, false);
    const hybrid = parseTerms({
      title: "혼합",
      format: "reel",
      model: "hybrid",
      amountKrw: 300000,
      ratePercent: 15,
    });
    assert.equal(hybrid.ok, true);
    assert.equal(parseTerms({ title: "x".repeat(81), format: "reel", model: "fixed", amountKrw: 1 }).ok, false);
    assert.equal(priceLabel({ model: "fixed", amountKrw: 300000, rateBps: null, priceHidden: true }), "문의");
    assert.equal(usageLabel(0), "사용권 협의");
  });

  it("round trips selected add-ons without changing the base fee or legacy terms", () => {
    const legacy = parseTerms(input);
    assert.ok(legacy.ok);
    assert.equal("addOns" in legacy.terms, false);
    assert.deepEqual(proposalAddOnRows(legacy.terms.addOns), []);

    const proposal = parseTerms({ ...input, addOns: {
      collaboratorKrw: 30000,
      youtubeRepostKrw: 50000,
      tiktokRepostKrw: 40000,
      secondaryUse: { months: 3, amountKrw: 110000 },
      cleanCopyKrw: 0,
      custom: [
        { label: " 프로필 링크 ", details: " 24시간 유지 ", amountKrw: null },
        { label: "썸네일", details: "", amountKrw: 10000 },
      ],
    } });
    assert.ok(proposal.ok);
    assert.equal(proposal.terms.pricing.fixed_amount_krw, 300000);
    assert.deepEqual(parseTerms(termsToInput(proposal.terms)), proposal);
    const rows = proposalAddOnRows(proposal.terms.addOns);
    assert.deepEqual(rows.map((row) => [row.label, row.details, row.amountKrw]), [
      ["공동작업자 등록", "", 30000],
      ["YouTube 재업로드", "", 50000],
      ["TikTok 재업로드", "", 40000],
      ["클린본 제공", "", 0],
      ["2차 활용", "3개월", 110000],
      ["프로필 링크", "24시간 유지", null],
      ["썸네일", "", 10000],
    ]);

    assert.deepEqual(parseTerms({ ...input, addOns: { custom: [] } }), legacy);
  });

  it("rejects malformed proposal data and incomplete selected add-ons without throwing", () => {
    for (const malformed of [null, [], {}, { ...input, title: 1 }, { ...input, description: {} }, { ...input, paidAds: "false" }, { ...input, notes: [] }]) {
      assert.equal(parseTerms(malformed).ok, false);
    }
    for (const addOns of [
      [],
      { collaboratorKrw: null },
      { youtubeRepostKrw: -1 },
      { tiktokRepostKrw: "5000" },
      { cleanCopyKrw: 0.5 },
      { secondaryUse: { months: 0, amountKrw: 2000 } },
      { secondaryUse: { months: 2 } },
      { custom: [null] },
      { custom: [{ label: "  ", details: "" }] },
      { custom: [{ label: "썸네일", details: 10 }] },
      { custom: [{ label: "썸네일", details: "", amountKrw: Infinity }] },
    ]) {
      assert.equal(parseTerms({ ...input, addOns }).ok, false);
    }
  });
});

describe("deal transitions", () => {
  const draft = { status: "draft" as const, proposedBy: "brand" as const, cancelRequestedBy: null };
  it("lets only the other party agree, and blocks the wrong settlement actor", () => {
    assert.equal(transitionError(draft, "agree", "influencer"), null);
    assert.ok(transitionError(draft, "agree", "brand"));
    assert.equal(transitionError(draft, "withdraw", "brand"), null);
    assert.ok(transitionError(draft, "withdraw", "influencer"));
    assert.ok(transitionError({ status: "agreed", proposedBy: "brand", cancelRequestedBy: null }, "post", "brand"));
    assert.equal(
      transitionError({ status: "agreed", proposedBy: "brand", cancelRequestedBy: null }, "post", "influencer"),
      null,
    );
    assert.ok(transitionError({ status: "posted", proposedBy: "brand", cancelRequestedBy: null }, "paid", "brand"));
    assert.equal(
      transitionError({ status: "settlement_requested", proposedBy: "brand", cancelRequestedBy: null }, "paid", "brand"),
      null,
    );
    assert.ok(
      transitionError({ status: "settlement_requested", proposedBy: "brand", cancelRequestedBy: null }, "paid", "influencer"),
    );
    assert.equal(canPropose([{ status: "agreed" }]), false);
    assert.equal(canPropose([{ status: "settled" }]), true);
    assert.equal(canPropose([{ status: "cancelled" }]), true);
  });
});

describe("record copy", () => {
  it("keeps the payment sentence and a stable hash source", () => {
    const paid = systemSentences.paid("브랜드");
    assert.match(paid, /지급했다고 표시했습니다/);
    assert.match(paid, /Lens가 입금을 확인한 것은 아닙니다/);
    for (const text of [
      paid,
      systemSentences.agreed(),
      systemSentences.opened("브랜드"),
      systemSentences.disputed("하나"),
    ]) {
      assert.equal(copyIsSafe(text), true);
    }
    const body = buildDealRecord({
      influencerName: "하나",
      username: "mina",
      company: "브랜드",
      contactName: "김담당",
      emailMasked: "k***m@brand.co.kr",
      trustLabel: "회사 메일",
      deal: {
        id: "d1",
        status: "settled",
        title: "릴스",
        terms: parseTerms({ title: "릴스", format: "reel", model: "fixed", amountKrw: 300000 }).ok
          ? (parseTerms({ title: "릴스", format: "reel", model: "fixed", amountKrw: 300000 }) as { ok: true; terms: never }).terms
          : ({} as never),
        proposedBy: "brand",
        postUrl: "https://instagram.com/p/abc",
        postedOn: "2026-11-22",
        postNote: null,
        agreedAt: "2026-11-22T00:00:00.000Z",
        cancelRequestedBy: null,
        settlements: [],
      },
      messages: [{ sender: "brand", body: "안녕하세요", createdAt: "2026-11-22T00:00:00.000Z" }],
    });
    assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
    assert.match(canonicalJson(body), /입금을 확인한 것은 아닙니다/);
    assert.equal(JSON.stringify(body).includes("k***m@brand.co.kr"), true);
    assert.equal(JSON.stringify(body).includes("kim@"), false);
  });

  it("exports add-ons and contract details from finalized agreements only", () => {
    const proposal = parseTerms({ title: "릴스", format: "reel", model: "fixed", amountKrw: 300000, addOns: { cleanCopyKrw: 25000 } });
    assert.ok(proposal.ok);
    const brandContract = {
      kind: "company" as const,
      legalName: "예시브랜드",
      birthDate: "",
      registrationNumber: "",
      phone: "",
      address: "",
      signature: null,
    };
    const source = {
      influencerName: "하나",
      username: "mina",
      company: "예시브랜드",
      contactName: "김담당",
      emailMasked: "k***m@brand.co.kr",
      trustLabel: "회사 메일",
      deal: {
        id: "d1", status: "draft" as const, title: "릴스", terms: proposal.terms,
        proposedBy: "brand" as const, postUrl: null, postedOn: null, postNote: null,
        agreedAt: null, cancelRequestedBy: null, settlements: [], brandContract,
      },
      messages: [],
    };
    const draft = buildDealRecord(source);
    assert.equal("brandContract" in draft.deal, false);
    const agreed = buildDealRecord({ ...source, deal: { ...source.deal, status: "agreed", agreedAt: "2026-11-22T00:00:00.000Z" } });
    assert.equal(agreed.deal.terms.addOns?.cleanCopyKrw, 25000);
    assert.deepEqual(agreed.deal.brandContract, brandContract);
  });
});
