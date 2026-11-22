import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDealRecord,
  canPropose,
  canonicalJson,
  copyIsSafe,
  maskAccount,
  maskEmail,
  parseTerms,
  priceLabel,
  suggestUsername,
  systemSentences,
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
    assert.equal(validateUsername("lens").ok, false);
    assert.equal(validateUsername("a.b").ok, false);
    assert.equal(suggestUsername("Hype.Up_1"), "hype-up-1");
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
});
