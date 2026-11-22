import assert from "node:assert/strict";
import test from "node:test";
import { appBridgeDocument, appReturnTarget } from "./app-return.ts";

test("app return target keeps the handoff in the lens scheme", () => {
  const target = appReturnTarget({ handoff: "abc.def", error: "state" });
  const url = new URL(target);
  assert.equal(url.protocol, "dev.lens.app:");
  assert.equal(url.hostname, "auth");
  assert.equal(url.searchParams.get("handoff"), "abc.def");
  assert.equal(url.searchParams.get("error"), "state");
});

test("bridge document escapes the return target", () => {
  const html = appBridgeDocument(appReturnTarget({ detail: `</script><img src=x>` }));
  assert.equal(html.includes("</script><img"), false);
  assert.equal(html.includes("Lens 앱으로 돌아가는 중이에요."), true);
});
