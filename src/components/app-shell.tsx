import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BadgeDollarSign,
  FileText,
  House,
  Images,
  Inbox,
  LayoutGrid,
  Menu,
  MessageCircle,
  ScrollText,
  Settings,
  X,
  Zap,
} from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { LensTheme } from "@/components/lens-theme";
import { LogoMark, Wordmark } from "@/components/logo";
import { PwaInstallButton } from "@/components/pwa-install";
import { SiteFooter } from "@/components/site-footer";
import { copy } from "@/lib/hypeup/copy";
import { daysUntil, formatCount, initial } from "@/lib/hypeup/format";
import type { HypeupUser } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "인스타그램 운영",
    items: [
      { to: "/", label: "홈", icon: House },
      { to: "/posts", label: copy.nav.posts, icon: LayoutGrid },
      { to: "/inbox", label: "댓글 인박스", icon: Inbox },
      { to: "/automations", label: copy.nav.automations, icon: Zap },
      { to: "/logs", label: "활동 로그", icon: ScrollText },
    ],
  },
  {
    label: "크리에이터",
    items: [
      { to: "/page", label: "공개 페이지", icon: FileText },
      { to: "/portfolio", label: "포트폴리오", icon: Images },
      { to: "/rates", label: "단가", icon: BadgeDollarSign },
      { to: "/inquiries", label: "브랜드 문의", icon: MessageCircle },
    ],
  },
  {
    label: "계정",
    items: [{ to: "/settings", label: copy.nav.settings, icon: Settings }],
  },
] as const;

function DrawerNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Lens 메뉴" className="space-y-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="border-t border-border pt-2.5">
          <p className="mb-1 px-3 text-sm font-medium text-muted">
            {group.label}
          </p>
          {group.items.map(({ to, label, icon: Icon }) => {
            const active =
              pathname === to ||
              (to !== "/" && pathname.startsWith(`${to}/`)) ||
              (to === "/inquiries" && pathname.startsWith("/deals/"));

            return (
              <Dialog.Close key={to} asChild>
                <Link
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center justify-between gap-3 rounded-md px-3 py-2 text-[16px] font-semibold transition-colors duration-200",
                    active
                      ? "bg-accent-soft text-accent-ink"
                      : "text-fg hover:bg-surface-2",
                  )}
                >
                  <span>{label}</span>
                  <Icon
                    className="size-[18px] shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </Link>
              </Dialog.Close>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Avatar({ user }: { user: HypeupUser }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-fg text-base font-semibold text-bg">
      {user.profilePictureUrl ? (
        <img
          src={user.profilePictureUrl}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        initial(user.username)
      )}
    </span>
  );
}

export function TokenBanner({ user }: { user: HypeupUser }) {
  const days = daysUntil(user.tokenExpiresAt);
  if (days === null || days > 7) return null;
  return (
    <div className="border-b border-border bg-surface px-4 py-2 text-center text-sm text-danger">
      {days <= 0
        ? copy.tokenExpired
        : `Instagram 연결이 ${days}일 후 만료됩니다.`}{" "}
      <Link
        to="/settings"
        className="inline-flex min-h-8 items-center font-semibold underline"
      >
        연결 설정
      </Link>
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
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const swipeStart = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  function startSwipe(event: TouchEvent<HTMLElement>) {
    swipeStart.current = null;
    const touch = event.touches[0];
    if (
      event.touches.length !== 1 ||
      !touch ||
      touch.clientX < 24 ||
      touch.clientX > window.innerWidth - 24
    )
      return;
    if (
      !(event.target instanceof Element) ||
      !event.currentTarget.contains(event.target)
    )
      return;
    if (
      event.target.closest(
        "a, button, input, select, textarea, [contenteditable], [role='button'], [data-lens-swipe-ignore]",
      )
    )
      return;
    for (
      let node: Element | null = event.target;
      node && node !== event.currentTarget;
      node = node.parentElement
    ) {
      if (
        node.scrollWidth > node.clientWidth + 1 &&
        /auto|scroll/.test(getComputedStyle(node).overflowX)
      )
        return;
    }
    swipeStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: event.timeStamp,
    };
  }

  function finishSwipe(event: TouchEvent<HTMLElement>, open: boolean) {
    const start = swipeStart.current;
    swipeStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || event.timeStamp - start.time > 500) return;
    const distance = (touch.clientX - start.x) * (open ? -1 : 1);
    if (distance > 72 && distance > Math.abs(touch.clientY - start.y) * 1.8)
      setMenuOpen(open);
  }

  function cancelSwipe() {
    swipeStart.current = null;
  }

  return (
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <div
        className="lens-workspace min-h-dvh bg-bg text-fg"
        data-menu-open={menuOpen}
        onTouchStart={startSwipe}
        onTouchEnd={(event) => finishSwipe(event, true)}
        onTouchCancel={cancelSwipe}
      >
        <a
          href="#lens-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:p-3"
        >
          본문으로 이동
        </a>
        <header className="sticky top-0 z-30 border-b border-border bg-bg pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex min-h-[68px] max-w-[1152px] items-center justify-between gap-4 px-4 sm:px-8 lg:min-h-[76px]">
            <Link
              to="/"
              aria-label="Lens 홈"
              className="inline-flex min-h-11 items-center gap-2.5 rounded-md"
            >
              <LogoMark className="size-8" />
              <Wordmark />
            </Link>
            <div className="flex items-center gap-2">
              <PwaInstallButton />
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-full bg-surface-2 px-3 text-sm font-semibold transition-colors hover:bg-border sm:px-3.5"
                  aria-label="워크스페이스 메뉴 열기"
                >
                  <Menu
                    className="size-[19px]"
                    strokeWidth={1.85}
                    aria-hidden
                  />
                  <span>메뉴</span>
                </button>
              </Dialog.Trigger>
            </div>
          </div>
        </header>
        <DemoBanner demoMode={demoMode} />
        <TokenBanner user={user} />
        <main
          id="lens-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1152px] px-4 pt-7 pb-[calc(32px+env(safe-area-inset-bottom))] outline-none sm:px-8 sm:pt-10"
        >
          <div key={pathname} className="lens-reveal min-w-0">
            {children}
          </div>
        </main>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="lens-overlay" />
        <Dialog.Content
          className="lens-nav-drawer"
          onTouchStart={startSwipe}
          onTouchEnd={(event) => finishSwipe(event, false)}
          onTouchCancel={cancelSwipe}
        >
          <div className="flex min-h-full flex-col gap-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <Dialog.Title className="text-xl font-bold tracking-tight">
                메뉴
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="lens-icon-button"
                  aria-label="메뉴 닫기"
                >
                  <X className="size-5" strokeWidth={1.75} aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              Lens 화면 이동 및 화면 테마 설정
            </Dialog.Description>
            <div className="flex min-w-0 items-center gap-3 rounded-lg bg-surface-2 p-3">
              <Avatar user={user} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-semibold">
                  @{user.username}
                </p>
                <p className="text-sm text-muted">
                  {formatCount(user.followersCount)} 팔로워
                </p>
              </div>
              <Dialog.Close asChild>
                <Link
                  to="/page"
                  className="lens-icon-button bg-surface"
                  aria-label="공개 페이지 관리"
                >
                  <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </Dialog.Close>
            </div>
            <DrawerNav pathname={pathname} />
            <div className="mt-auto border-t border-border pt-4">
              <LensTheme />
            </div>
            <SiteFooter compact />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
