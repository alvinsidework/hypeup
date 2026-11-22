const APP_AUTH_URL = "dev.lens.app://auth";

export type AppReturnInput = {
  handoff?: string;
  error?: string;
  detail?: string;
};

export function appReturnTarget(input: AppReturnInput): string {
  const url = new URL(APP_AUTH_URL);
  if (input.handoff) url.searchParams.set("handoff", input.handoff);
  if (input.error) url.searchParams.set("error", input.error);
  if (input.detail) url.searchParams.set("detail", input.detail.slice(0, 180));
  return url.toString();
}

export function appBridgeDocument(target: string): string {
  const literal = JSON.stringify(target);
  return `<!doctype html>
<html lang="ko">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lens</title>
<body style="margin:0;background:#0b0b0c;color:#f4f4f5;font-family:sans-serif">
<main style="padding:32px 20px">
<p>Lens 앱으로 돌아가는 중이에요.</p>
<p><a id="back">앱으로 돌아가기</a></p>
</main>
<script>
  const target = ${literal};
  const link = document.getElementById("back");
  if (link) link.setAttribute("href", target);
  location.replace(target);
</script>
`;
}
