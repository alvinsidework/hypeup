import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { DemoBanner } from "@/components/demo-banner";
import { LogoMark, Wordmark } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { enterDemo, getBootstrap } from "@/lib/hypeup/bootstrap";
import { copy, oauthErrorCopy } from "@/lib/hypeup/copy";

export const Route = createFileRoute("/connect")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
    detail: typeof search.detail === "string" ? search.detail : undefined,
  }),
  loader: () => getBootstrap(),
  component: ConnectPage,
});

const CHECKLIST = [
  {
    title: "Instagram 프로페셔널 계정",
    body: "설정 → 계정 유형에서 비즈니스 또는 크리에이터로 전환하세요. 개인 계정은 연결되지 않습니다.",
  },
  {
    title: "Meta 개발자 계정과 Business 앱",
    body: "developers.facebook.com에서 앱을 만들고 유형을 Business로 고른 뒤, Instagram → API setup with Instagram business login을 추가하세요.",
  },
  {
    title: "Instagram App ID / Secret",
    body: "Facebook App ID와 다를 수 있습니다. OAuth client_id는 Instagram App ID입니다.",
  },
  {
    title: "Redirect URI 등록",
    body: "로컬은 http://localhost:8080/api/auth/instagram/callback 를 한 글자도 다르지 않게 등록하세요. 배포 도메인도 같은 경로로 추가합니다.",
  },
  {
    title: "권한과 테스터",
    body: "instagram_business_basic, instagram_business_manage_comments, instagram_business_manage_messages. Roles에 본인 계정을 테스터로 넣으세요.",
  },
  {
    title: "환경 변수",
    body: ".env.example을 복사해 INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, APP_ENCRYPTION_KEY, AUTH_SECRET을 채웁니다. openssl rand -hex 32 로 키를 만드세요.",
  },
];

function ConnectPage() {
  const boot = Route.useLoaderData();
  const { error, detail } = Route.useSearch();
  const router = useRouter();
  const errorText = error ? oauthErrorCopy[error] ?? copy.genericError : null;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <DemoBanner demoMode={boot.demoMode} />
      <header className="mx-auto flex h-16 max-w-[800px] items-center gap-2 px-4">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto max-w-[800px] px-4 py-10">
        <h1 className="font-display text-4xl tracking-tight">{copy.connectHeadline}</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted">{copy.connectBody}</p>
        <p className="mt-3 max-w-xl text-[13px] leading-6 text-muted">{copy.professionalHint}</p>

        {errorText ? (
          <div className="mt-6 rounded-md border border-border bg-surface px-4 py-3 text-[13px] text-danger">
            <p>{errorText}</p>
            {detail ? <p className="mt-2 text-[12px] leading-5 text-muted">{detail}</p> : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {boot.demoMode ? (
            <>
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-md border border-border px-4 text-[13px] text-muted"
                title={copy.notConfigured}
                disabled
              >
                {copy.continueWithInstagram}
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center rounded-md bg-fg px-4 text-[13px] font-medium text-bg"
                onClick={async () => {
                  await enterDemo();
                  await router.invalidate();
                  await router.navigate({ to: "/" });
                }}
              >
                {copy.browseDemo}
              </button>
            </>
          ) : (
            <a
              href="/api/auth/instagram"
              className="inline-flex h-11 items-center rounded-md bg-fg px-4 text-[13px] font-medium text-bg"
            >
              {copy.continueWithInstagram}
            </a>
          )}
        </div>

        {boot.demoMode ? (
          <p className="mt-4 text-[13px] text-muted">{copy.notConfigured}</p>
        ) : null}

        <ol className="mt-12 space-y-5">
          {CHECKLIST.map((item, index) => (
            <li key={item.title} className="rounded-lg border border-border bg-surface p-5">
              <p className="text-[12px] tabular-nums text-subtle">{String(index + 1).padStart(2, "0")}</p>
              <h2 className="mt-1 text-[15px] font-medium">{item.title}</h2>
              <p className="mt-2 text-[13px] leading-6 text-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </div>
  );
}
