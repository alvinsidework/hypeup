import assert from "node:assert/strict";
import test from "node:test";
import { canPrivateReply, matchRule, type MatchRule } from "./engine.ts";

const self = { igUserId: "me", username: "studio.hana" };

function rule(partial: Partial<MatchRule> & Pick<MatchRule, "id" | "name">): MatchRule {
  return {
    enabled: true,
    scope: "ALL",
    mediaId: null,
    matchMode: "CONTAINS",
    keywords: [],
    excludeKeywords: [],
    publicReplies: ["ok"],
    dmMessage: null,
    hideComment: false,
    sortOrder: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

test("ANY matches every comment", () => {
  const preview = matchRule(
    [rule({ id: "1", name: "any", matchMode: "ANY" })],
    { id: "c", text: "안녕하세요", mediaId: "m" },
    self,
  );
  assert.equal(preview.rule?.id, "1");
});

test("CONTAINS matches a keyword", () => {
  const preview = matchRule(
    [rule({ id: "1", name: "price", keywords: ["가격", "얼마"] })],
    { id: "c", text: "가격 알려주세요", mediaId: "m" },
    self,
  );
  assert.equal(preview.rule?.id, "1");
});

test("EXACT requires a full match after trim", () => {
  const rules = [rule({ id: "1", name: "exact", matchMode: "EXACT", keywords: ["가격"] })];
  assert.equal(
    matchRule(rules, { id: "c", text: " 가격 ", mediaId: "m" }, self).rule?.id,
    "1",
  );
  assert.equal(matchRule(rules, { id: "c", text: "가격 알려주세요", mediaId: "m" }, self).rule, null);
});

test("exclude keywords skip the rule", () => {
  const preview = matchRule(
    [rule({ id: "1", name: "price", keywords: ["가격"], excludeKeywords: ["팔로워"] })],
    { id: "c", text: "가격 팔로워 이벤트", mediaId: "m" },
    self,
  );
  assert.equal(preview.rule, null);
});

test("first matching rule wins by sort order", () => {
  const preview = matchRule(
    [
      rule({ id: "later", name: "b", keywords: ["가격"], sortOrder: 2 }),
      rule({ id: "first", name: "a", keywords: ["가격"], sortOrder: 0 }),
    ],
    { id: "c", text: "가격", mediaId: "m" },
    self,
  );
  assert.equal(preview.rule?.id, "first");
});

test("skips the operator's own comments", () => {
  const preview = matchRule(
    [rule({ id: "1", name: "any", matchMode: "ANY" })],
    { id: "c", text: "답글", mediaId: "m", igFromId: "me", igFromUsername: "studio.hana" },
    self,
  );
  assert.equal(preview.skippedSelf, true);
  assert.equal(preview.rule, null);
});

test("invalid regex is skipped", () => {
  const preview = matchRule(
    [rule({ id: "1", name: "bad", matchMode: "REGEX", keywords: ["("] })],
    { id: "c", text: "hello", mediaId: "m" },
    self,
  );
  assert.equal(preview.rule, null);
  assert.equal(preview.skippedInvalidRegex, true);
});

test("private reply guards", () => {
  assert.equal(canPrivateReply({ repliedPrivate: true, timestamp: new Date().toISOString() }).ok, false);
  const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const expired = canPrivateReply({ repliedPrivate: false, timestamp: old });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.reason, "expired");
});
