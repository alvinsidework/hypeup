import assert from "node:assert/strict";
import test from "node:test";
import {
  TESTER_ACCEPT_URL,
  applicantSiteUrl,
  composeAccessRequestEmail,
  formSubmitAccepted,
  normalizeInstagramHandle,
  replyBody,
} from "./access-request-mail.ts";

test("normalizes an instagram handle", () => {
  assert.equal(normalizeInstagramHandle(" @Hype.Up_1 "), "hype.up_1");
  assert.equal(normalizeInstagramHandle("bad handle"), null);
  assert.equal(normalizeInstagramHandle(".starts"), null);
  assert.equal(normalizeInstagramHandle("double..dot"), null);
});

test("reply block contains the tester accept link and not the admin dashboard", () => {
  const mail = composeAccessRequestEmail({
    instagram: "studio.han",
    email: "guest@example.com",
    appUrl: "https://hypeupinsta.vercel.app",
    appId: "123456",
    now: new Date("2026-09-24T03:00:00Z"),
  });
  const reply = replyBody(mail.text);
  assert.match(mail.subject, /@studio\.han/);
  assert.match(reply, new RegExp(TESTER_ACCEPT_URL.replace(/[.]/g, "\\.")));
  assert.match(reply, /아이폰에서 Instagram 앱이 열리면.*Safari 주소창에 직접 붙여넣으세요/);
  assert.match(reply, /테스터 초대\(Tester Invites\)/);
  assert.match(reply, /https:\/\/hypeupinsta\.vercel\.app\/connect/);
  assert.doesNotMatch(reply, /developers\.facebook\.com/);
  assert.match(mail.text, /https:\/\/developers\.facebook\.com\/apps\/123456\/roles\/roles\//);
  assert.match(mail.text, /guest@example.com/);
});

test("treats form activation as an accepted delivery", () => {
  assert.equal(formSubmitAccepted({ success: "true" }), true);
  assert.equal(
    formSubmitAccepted({ success: "false", message: "This form needs Activation." }),
    true,
  );
  assert.equal(formSubmitAccepted({ success: "false", message: "Make sure you open this page through a web server" }), false);
  assert.equal(formSubmitAccepted(null), false);
});

test("applicant link ignores localhost", () => {
  const live = "https://hypeupinsta.vercel.app";
  assert.equal(applicantSiteUrl("http://localhost:8080", live), live);
  assert.equal(applicantSiteUrl("https://hypeup.example/", live), "https://hypeup.example");
});
