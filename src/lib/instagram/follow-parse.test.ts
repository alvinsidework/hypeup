import assert from "node:assert/strict";
import test from "node:test";
import {
  followGatePayload,
  interpretFollowResponse,
  parseFollowGatePayload,
  sameInstagramUsername,
} from "./follow-parse.ts";

test("reads the follow field and ignores a missing one", () => {
  assert.equal(interpretFollowResponse({ is_user_follow_business: true, username: "Mina" }).status, "follower");
  assert.equal(interpretFollowResponse({ is_user_follow_business: false }).status, "not_follower");
  assert.equal(interpretFollowResponse({ username: "mina" }).status, "unknown");
});

test("matches instagram usernames without case or @", () => {
  assert.equal(sameInstagramUsername("@Mina", "mina"), true);
  assert.equal(sameInstagramUsername("mina", "other"), false);
  assert.equal(sameInstagramUsername("", "mina"), false);
});

test("round-trips the follow button payload", () => {
  assert.equal(parseFollowGatePayload(followGatePayload("gate-1")), "gate-1");
  assert.equal(parseFollowGatePayload("hello"), null);
});
