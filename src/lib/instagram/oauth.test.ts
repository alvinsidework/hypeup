import assert from "node:assert/strict";
import test from "node:test";
import { isProfessionalAccount, normalizeAuthCode, parseGrantedScopes } from "./oauth-parse.ts";

test("strips Instagram #_ suffix from the auth code", () => {
  assert.equal(normalizeAuthCode("AQ123#_"), "AQ123");
  assert.equal(normalizeAuthCode("AQ123"), "AQ123");
});

test("rejects personal accounts", () => {
  assert.equal(isProfessionalAccount("PERSONAL"), false);
  assert.equal(isProfessionalAccount("BUSINESS"), true);
  assert.equal(isProfessionalAccount("MEDIA_CREATOR"), true);
});

test("parses granted scopes from a string or array", () => {
  assert.deepEqual(parseGrantedScopes("instagram_business_basic,instagram_business_manage_comments"), [
    "instagram_business_basic",
    "instagram_business_manage_comments",
  ]);
  assert.deepEqual(parseGrantedScopes(["instagram_business_basic", "instagram_business_manage_messages"]), [
    "instagram_business_basic",
    "instagram_business_manage_messages",
  ]);
});
