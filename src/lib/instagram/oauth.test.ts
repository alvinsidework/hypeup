import assert from "node:assert/strict";
import test from "node:test";
import {
  isLongLivedExchangeRejected,
  isProfessionalAccount,
  isUnsupportedMethod,
  normalizeAuthCode,
  parseGrantedScopes,
} from "./oauth-parse.ts";

test("recognizes Instagram's misleading method rejection", () => {
  assert.equal(isUnsupportedMethod(new Error("Unsupported request - method type: get")), true);
  assert.equal(isUnsupportedMethod(new Error("Unsupported request - method type: post")), true);
  assert.equal(isUnsupportedMethod(new Error("invalid code")), false);
});

test("treats the access_token object error as a failed long-lived exchange", () => {
  const message =
    "unsupported post request. Object with ID 'access_token' does not exist, cannot be loaded due to missing permissions, or does not support this operation";
  assert.equal(isLongLivedExchangeRejected(new Error(message)), true);
  assert.equal(isLongLivedExchangeRejected(new Error("Unsupported request - method type: get")), true);
  assert.equal(isLongLivedExchangeRejected(new Error("invalid code")), false);
});

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
