import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { parseWebhookPayload, verifyWebhookSignature } from "./webhooks.ts";

test("rejects a bad webhook signature", () => {
  const body = "{\"object\":\"instagram\"}";
  assert.equal(verifyWebhookSignature(body, "sha256=deadbeef", "secret"), false);
});

test("accepts a valid HMAC signature", () => {
  const body = "{\"object\":\"instagram\"}";
  const header = "sha256=" + createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, header, "secret"), true);
});

test("parses Instagram Login comment payloads", () => {
  const events = parseWebhookPayload({
    object: "instagram",
    entry: [
      {
        id: "ig-user",
        field: "comments",
        value: {
          id: "c1",
          from: { id: "u1", username: "someone" },
          text: "가격 알려주세요",
          media: { id: "m1" },
        },
      },
    ],
  });
  assert.equal(events.length, 1);
  assert.equal(events[0]?.commentId, "c1");
  assert.equal(events[0]?.mediaId, "m1");
});

test("parses Facebook-style changes[] payloads", () => {
  const events = parseWebhookPayload({
    object: "instagram",
    entry: [
      {
        id: "ig-user",
        changes: [
          {
            field: "comments",
            value: { id: "c2", text: "링크", media: { id: "m2" } },
          },
        ],
      },
    ],
  });
  assert.equal(events[0]?.commentId, "c2");
});
