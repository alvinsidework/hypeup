import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  Inbox,
  MessageCircle,
  Send,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Landing } from "@/components/landing";
import { LogTable } from "@/components/log-table";
import { getBootstrap } from "@/lib/hypeup/bootstrap";
import { copy } from "@/lib/hypeup/copy";
import { formatCount, initial, relativeTime } from "@/lib/hypeup/format";

const SHORTCUTS = [
  { to: "/inbox", label: "댓글 인박스", icon: Inbox },
  { to: "/automations", label: "자동화", icon: Zap },
  { to: "/page", label: "공개 페이지", icon: FileText },
  { to: "/inquiries", label: "브랜드 문의", icon: MessageCircle },
] as const;

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

function Overview() {
  const { home } = Route.useLoaderData();
  if (!home) return null;
  const stats = [
    {
      label: "오늘 댓글",
      value: home.stats.commentsToday,
      icon: MessageCircle,
    },
    {
      label: "오늘 자동 답글",
      value: home.stats.publicRepliesToday,
      icon: ArrowUpRight,
    },
    { label: "오늘 DM", value: home.stats.dmsToday, icon: Send },
    { label: "활성 규칙", value: home.stats.activeRules, icon: Zap },
  ] as const;
  return (
    <div className="space-y-8 sm:space-y-10">
      <section aria-labelledby="overview-title">
        <div className="flex items-center gap-4">
          <span className="grid size-[58px] shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-xl font-semibold sm:size-[66px]">
            {home.user.profilePictureUrl ? (
              <img
                src={home.user.profilePictureUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              initial(home.user.username)
            )}
          </span>
          <div className="min-w-0">
            <h1
              id="overview-title"
              className="text-[clamp(1.7rem,5vw,2.65rem)] leading-tight font-bold tracking-[-0.05em] [overflow-wrap:anywhere]"
            >
              @{home.user.username}
            </h1>
            <p className="mt-0.5 text-sm tabular-nums text-muted sm:text-[15px]">
              {formatCount(home.user.followersCount)} 팔로워
            </p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-7 sm:grid-cols-4 sm:gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="lens-panel p-3.5 sm:p-5">
              <dt className="flex items-center gap-2 text-sm font-medium text-muted">
                <Icon
                  className="size-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden
                />
                {label}
              </dt>
              <dd className="mt-2 text-[28px] leading-none font-semibold tracking-[-0.055em] tabular-nums sm:mt-3 sm:text-[36px]">
                {value.toLocaleString("ko-KR")}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-label="바로 가기"
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3"
      >
        {SHORTCUTS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="lens-button lens-button-secondary justify-start gap-2 px-3 sm:px-4"
          >
            <Icon
              className="size-[17px] shrink-0"
              strokeWidth={1.75}
              aria-hidden
            />
            <span>{label}</span>
            <ArrowRight
              className="ml-auto hidden size-4 shrink-0 text-muted min-[365px]:block"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        ))}
      </section>
      <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-5">
        <section className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold tracking-tight">최근 댓글</h2>
            <Link
              to="/inbox"
              className="lens-button lens-button-quiet min-h-11 px-2"
            >
              전체 댓글 <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {home.recentComments.length === 0 ? (
            <EmptyState title={copy.emptyComments} />
          ) : (
            <ul className="lens-panel divide-y divide-border px-4">
              {home.recentComments.map((comment) => (
                <li
                  key={comment.id}
                  className="flex min-w-0 items-start gap-3 py-3.5"
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-muted"
                  >
                    {initial(comment.igFromUsername)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="min-w-0 font-semibold [overflow-wrap:anywhere]">
                        @{comment.igFromUsername}
                      </p>
                      {comment.timestamp ? (
                        <time
                          dateTime={comment.timestamp}
                          className="text-sm tabular-nums text-muted"
                        >
                          {relativeTime(comment.timestamp)}
                        </time>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{comment.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold tracking-tight">최근 로그</h2>
            <Link
              to="/logs"
              className="lens-button lens-button-quiet min-h-11 px-2"
            >
              전체 로그 <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
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
