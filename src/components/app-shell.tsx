import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Inbox, LayoutGrid, ScrollText, Settings, Wand2 } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { LogoMark, Wordmark } from "@/components/logo";
import { copy } from "@/lib/hypeup/copy";
import { daysUntil, formatCount, initial } from "@/lib/hypeup/format";
import type { HypeupUser } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: copy.nav.overview, icon: Home, desktopOnly: true, mobileLabel: copy.nav.overview },
  { to: "/posts", label: copy.nav.posts, icon: LayoutGrid, desktopOnly: false, mobileLabel: copy.nav.posts },
  { to: "/inbox", label: copy.nav.inbox, icon: Inbox, desktopOnly: false, mobileLabel: copy.nav.inbox },
  { to: "/automations", label: copy.nav.automations, icon: Wand2, desktopOnly: false, mobileLabel: "자동화" },
  { to: "/logs", label: copy.nav.logs, icon: ScrollText, desktopOnly: false, mobileLabel: copy.nav.logs },
  { to: "/settings", label: copy.nav.settings, icon: Settings, desktopOnly: false, mobileLabel: "더보기" },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  compact,
}: {
  to: string;
  label: string;
  icon: typeof Inbox;
  compact?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 text-[13px] transition-colors duration-200",
        compact ? "h-12 flex-col justify-center gap-1 px-0 text-[11px]" : "h-10",
        active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg",
      )}
    >
      <Icon className="size-4" strokeWidth={1.5} />
      {label}
    </Link>
  );
}

export function TokenBanner({ user }: { user: HypeupUser }) {
  const days = daysUntil(user.tokenExpiresAt);
  if (days === null || days > 7) return null;
  return (
    <div className="border-b border-border bg-surface px-4 py-2 text-center text-[12px] text-danger">
      {days <= 0 ? copy.tokenExpired : `토큰 ${days}일 후 만료. 다시 연결하세요.`}
    </div>
  );
}

export function AppShell({
  user,
  demoMode,
  children,
}: {
  user: HypeupUser;
  demoMode: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <DemoBanner demoMode={demoMode} />
      <TokenBanner user={user} />
      <div className="mx-auto flex min-h-dvh max-w-[1440px]">
        <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-border px-4 py-6 md:flex">
          <Link to="/" className="flex items-center gap-2.5 px-2">
            <LogoMark className="size-7" />
            <Wordmark />
          </Link>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV.filter((item) => item.to !== "/settings").map((item) => (
              <NavLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
            ))}
          </nav>
          <div className="mt-auto space-y-3">
            <NavLink to="/settings" label={copy.nav.settings} icon={Settings} />
            <SiteFooter compact />
            <div className="flex items-center gap-2.5 rounded-md border border-border bg-surface px-3 py-2.5">
              <div className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-[12px]">
                {user.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt=""
                    className="size-8 rounded-full object-cover"
                  />
                ) : (
                  initial(user.username)
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium">@{user.username}</p>
                <p className="text-[11px] tabular-nums text-muted">
                  {formatCount(user.followersCount)} 팔로워
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b border-border px-4 md:hidden">
            <LogoMark className="size-6" />
            <Wordmark className="text-[16px]" />
            <span className="ml-auto truncate text-[12px] text-muted">@{user.username}</span>
          </header>
          <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-8 lg:px-10 lg:pt-8">
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.filter((item) => !item.desktopOnly).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            label={item.mobileLabel}
            icon={item.icon}
            compact
          />
        ))}
      </nav>
    </div>
  );
}
