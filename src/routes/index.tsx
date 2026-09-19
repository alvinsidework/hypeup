import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { LogoMark, Wordmark } from "@/components/logo";
import { LogTable } from "@/components/log-table";
import { SiteFooter } from "@/components/site-footer";
import { enterDemo, getBootstrap } from "@/lib/hypeup/bootstrap";
import { copy } from "@/lib/hypeup/copy";
import { formatCount, relativeTime } from "@/lib/hypeup/format";

export const Route = createFileRoute("/")({
  loader: async () => {
    const boot = await getBootstrap();
    if (!boot.user) return { boot, home: null };
    const { getOverview } = await import("@/lib/hypeup/api");
    const home = await getOverview();
    return { boot, home };
  },
  component: Home,
});

function Home() {
  const { boot, home } = Route.useLoaderData();
  if (!boot.user || !home) return <Landing demoMode={boot.demoMode} />;
  return (
    <AppShell user={boot.user} demoMode={boot.demoMode}>
      <Overview />
    </AppShell>
  );
}

function Landing({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  return (
    <div className="min-h-dvh bg-bg text-fg">
      {demoMode ? (
        <div className="border-b border-border bg-surface px-4 py-2 text-center text-[12px] text-accent">
          {copy.demoBanner}
        </div>
      ) : null}
      <header className="mx-auto flex h-16 max-w-[1200px] items-center gap-2 px-4">
        <LogoMark className="size-7" />
        <Wordmark />
      </header>
      <main className="mx-auto grid max-w-[1200px] gap-12 px-4 py-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-20">
        <section>
          <p className="text-[12px] uppercase tracking-[0.16em] text-accent">Comment desk</p>
          <h1 className="mt-4 max-w-xl font-display text-4xl leading-[1.1] tracking-tight sm:text-6xl">
            {copy.tagline}
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted">{copy.landingBody}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {demoMode ? (
              <>
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
                <Link
                  to="/connect"
                  search={{ error: undefined, detail: undefined }}
                  className="inline-flex h-11 items-center rounded-md border border-border px-4 text-[13px]"
                >
                  연결 준비
                </Link>
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
        </section>
        <section className="rounded-xl border border-border bg-surface p-6">
          <p className="text-[12px] uppercase tracking-[0.14em] text-subtle">지금 할 일</p>
          <ol className="mt-4 space-y-4 text-[14px] leading-6 text-muted">
            <li>
              <span className="font-medium text-fg">1. 프로페셔널 계정</span>
              <span className="block">Instagram을 비즈니스 또는 크리에이터로 전환</span>
            </li>
            <li>
              <span className="font-medium text-fg">2. Meta 앱</span>
              <span className="block">developers.facebook.com에서 Business 앱 + Instagram Login</span>
            </li>
            <li>
              <span className="font-medium text-fg">3. 키 입력</span>
              <span className="block">App ID / Secret을 환경 변수에 넣고 다시 연결</span>
            </li>
          </ol>
          <Link to="/connect" search={{ error: undefined, detail: undefined }} className="mt-6 inline-flex text-[13px] text-accent">
            설정 체크리스트 보기
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Overview() {
  const { home } = Route.useLoaderData();
  if (!home) return null;
  const stats = [
    ["오늘 댓글", home.stats.commentsToday],
    ["오늘 자동 답글", home.stats.publicRepliesToday],
    ["오늘 DM", home.stats.dmsToday],
    ["활성 룰", home.stats.activeRules],
  ] as const;
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">오버뷰</p>
          <h1 className="mt-2 font-display text-3xl tracking-tight">@{home.user.username}</h1>
          <p className="mt-1 text-[13px] tabular-nums text-muted">
            {formatCount(home.user.followersCount)} 팔로워
          </p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-surface p-4">
            <p className="text-[12px] text-muted">{label}</p>
            <p className="mt-2 font-display text-3xl tabular-nums">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-[13px] font-medium">최근 댓글</h2>
          {home.recentComments.length === 0 ? (
            <EmptyState title={copy.emptyComments} />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
              {home.recentComments.map((comment) => (
                <li key={comment.id} className="px-4 py-3">
                  <p className="text-[13px] font-medium">@{comment.igFromUsername}</p>
                  <p className="mt-1 text-[13px] text-fg/90">{comment.text}</p>
                  <p className="mt-1 text-[11px] tabular-nums text-subtle">
                    {relativeTime(comment.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-[13px] font-medium">최근 로그</h2>
          {home.recentLogs.length === 0 ? (
            <EmptyState title={copy.emptyLogs} />
          ) : (
            <LogTable logs={home.recentLogs} />
          )}
        </section>
      </div>
    </div>
  );
}
