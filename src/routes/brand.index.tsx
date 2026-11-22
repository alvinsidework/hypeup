import { useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { BookmarkMinus, ChevronRight, LogOut } from "lucide-react";
import { toast } from "sonner";
import { BrandContractForm } from "@/components/brand-contract-form";
import { BrandSignIn } from "@/components/brand-sign-in";
import { BrandTemplateManager } from "@/components/brand-template-manager";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PublicLayout } from "@/components/public-layout";
import { getBrandWorkspace, setBrandFavorite } from "@/lib/hypeup/brand-api";
import { getBrandAuthOptions } from "@/lib/hypeup/brand-auth-api";
import type {
  BrandFavorite,
  BrandInquirySummary,
} from "@/lib/hypeup/brand-types";
import { initial, relativeTime } from "@/lib/hypeup/format";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { key: "inquiries", label: "문의" },
  { key: "templates", label: "제안 템플릿" },
  { key: "favorites", label: "관심 목록" },
  { key: "details", label: "계약 정보" },
] as const;

type Section = (typeof SECTIONS)[number]["key"];

export const Route = createFileRoute("/brand/")({
  headers: () => ({ "Cache-Control": "private, no-store" }),
  validateSearch: (search: Record<string, unknown>): { section?: Section } => ({
    section: SECTIONS.find(({ key }) => key === search.section)?.key,
  }),
  head: () => ({
    meta: [
      { title: "브랜드 대시보드 · Lens" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async () => {
    const workspace = await getBrandWorkspace();
    const authOptions = workspace.account ? null : await getBrandAuthOptions();
    return { workspace, authOptions };
  },
  component: BrandDashboard,
});

function BrandDashboard() {
  const { workspace, authOptions } = Route.useLoaderData();
  const { section = "inquiries" } = Route.useSearch();
  const router = useRouter();
  const refresh = async () => {
    await router.invalidate();
  };

  if (!workspace.account) {
    return (
      <PublicLayout>
        <main className="lens-reveal mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10 sm:px-8 sm:py-16">
          <PageHeader
            title="브랜드 대시보드"
            description="로그인하면 크리에이터와 나눈 문의와 제안을 한곳에서 볼 수 있습니다."
          />
          {authOptions ? (
            <BrandSignIn
              returnTo={
                section === "inquiries" ? "/brand" : `/brand?section=${section}`
              }
              options={authOptions}
            />
          ) : null}
        </main>
      </PublicLayout>
    );
  }

  const { account, inquiries, favorites, templates, details } = workspace;
  const accountName = account.company || account.contactName || account.email;
  return (
    <PublicLayout
      headerAction={
        <form method="post" action="/api/auth/brand/logout">
          <input type="hidden" name="returnTo" value="/brand" />
          <button
            type="submit"
            className="lens-button lens-button-quiet !px-2 sm:!px-3"
          >
            <LogOut className="size-4 shrink-0" aria-hidden /> 로그아웃
          </button>
        </form>
      }
    >
      <main className="lens-reveal mx-auto w-full max-w-[1120px] flex-1 px-5 pt-6 pb-12 sm:px-8 sm:pt-10">
        <PageHeader title="브랜드 대시보드" />
        <div className="lens-panel mb-5 flex min-h-20 items-center gap-3 px-4 py-3 sm:mb-6 sm:px-5">
          <Avatar name={accountName} url={null} />
          <div className="min-w-0">
            <p className="font-semibold [overflow-wrap:anywhere]">
              {accountName}
            </p>
            {accountName !== account.email ? (
              <p className="text-sm text-muted [overflow-wrap:anywhere]">
                {account.email}
              </p>
            ) : null}
          </div>
        </div>
        <nav
          aria-label="브랜드 대시보드 메뉴"
          className="mb-6 grid w-full grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1 min-[380px]:grid-cols-4 sm:w-fit"
        >
          {SECTIONS.map(({ key, label }) => (
            <Link
              key={key}
              to="/brand"
              search={key === "inquiries" ? {} : { section: key }}
              activeOptions={{ exact: true }}
              resetScroll={false}
              aria-current={key === section ? "page" : undefined}
              className={cn(
                "grid min-h-11 place-items-center rounded-xl px-2 text-center text-sm font-semibold transition-colors sm:px-4",
                key === section
                  ? "bg-surface text-fg shadow-xs"
                  : "text-muted hover:text-fg",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        {section === "inquiries" ? <Inquiries inquiries={inquiries} /> : null}
        {section === "templates" ? (
          <BrandTemplateManager templates={templates} refresh={refresh} />
        ) : null}
        {section === "favorites" ? (
          <Favorites favorites={favorites} refresh={refresh} />
        ) : null}
        {section === "details" ? (
          <BrandContractForm details={details} refresh={refresh} />
        ) : null}
      </main>
    </PublicLayout>
  );
}

function Inquiries({ inquiries }: { inquiries: BrandInquirySummary[] }) {
  if (!inquiries.length) {
    return (
      <EmptyState
        title="아직 나눈 문의가 없습니다"
        body="크리에이터의 공개 페이지에서 브랜드 문의를 시작할 수 있습니다."
      />
    );
  }
  return (
    <ul
      aria-label="브랜드 문의 목록"
      className="lens-panel divide-y divide-border"
    >
      {inquiries.map((inquiry) => (
        <li key={inquiry.id} className="p-1.5">
          <Link
            to="/brand/inquiries/$id"
            params={{ id: inquiry.id }}
            className="group flex min-h-18 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2 sm:px-4"
          >
            <Avatar name={inquiry.name} url={inquiry.avatarUrl} muted />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <p className="font-semibold [overflow-wrap:anywhere]">
                  {inquiry.name}
                </p>
                {inquiry.lastAt ? (
                  <time
                    dateTime={inquiry.lastAt}
                    className="text-sm text-muted tabular-nums"
                  >
                    {relativeTime(inquiry.lastAt)}
                  </time>
                ) : null}
              </div>
              {inquiry.lastBody ? (
                <p className="mt-0.5 truncate text-sm text-muted">
                  {inquiry.lastBody}
                </p>
              ) : null}
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Favorites({
  favorites,
  refresh,
}: {
  favorites: BrandFavorite[];
  refresh: () => Promise<void>;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  async function remove(username: string) {
    if (removing) return;
    setRemoving(username);
    try {
      const result = await setBrandFavorite({
        data: { username, saved: false },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await refresh();
      toast.success("관심 목록에서 제거했습니다.");
    } catch {
      toast.error("관심 목록을 변경하지 못했습니다.");
    } finally {
      setRemoving(null);
    }
  }

  if (!favorites.length) {
    return (
      <EmptyState
        title="아직 관심 목록이 비어 있습니다"
        body="크리에이터의 공개 페이지에서 관심 목록에 추가할 수 있습니다."
      />
    );
  }
  return (
    <ul
      aria-label="관심 크리에이터"
      className="lens-panel divide-y divide-border"
    >
      {favorites.map((favorite) => (
        <li
          key={favorite.username}
          className="flex items-center gap-2 p-1.5 pr-3"
        >
          <Link
            to="/$username"
            params={{ username: favorite.username }}
            className="group flex min-h-18 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2 sm:px-4"
          >
            <Avatar name={favorite.name} url={favorite.avatarUrl} muted />
            <div className="min-w-0">
              <p className="font-semibold [overflow-wrap:anywhere]">
                {favorite.name}
              </p>
              <p className="truncate text-sm text-muted">
                {favorite.bio || `@${favorite.username}`}
              </p>
            </div>
          </Link>
          <button
            type="button"
            className="lens-icon-button"
            disabled={removing !== null}
            aria-busy={removing === favorite.username}
            aria-label={`${favorite.name} 관심 목록에서 제거`}
            onClick={() => void remove(favorite.username)}
          >
            <BookmarkMinus className="size-5" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

function Avatar({
  name,
  url,
  muted = false,
}: {
  name: string;
  url: string | null;
  muted?: boolean;
}) {
  return url ? (
    <img
      className="size-11 shrink-0 rounded-full object-cover"
      src={url}
      alt=""
      loading="lazy"
    />
  ) : (
    <span
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full text-base font-bold",
        muted
          ? "bg-surface-2 text-muted group-hover:bg-surface"
          : "bg-accent-soft text-accent-ink",
      )}
      aria-hidden
    >
      {initial(name)}
    </span>
  );
}
