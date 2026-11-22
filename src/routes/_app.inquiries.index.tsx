import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Archive,
  ChevronRight,
  Copy,
  Link2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { getLensInquiries } from "@/lib/hypeup/lens-api";
import { initial, relativeTime } from "@/lib/hypeup/format";
import { statusLabel } from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/_app/inquiries/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { archived?: boolean } => ({
    archived: search.archived === true ? true : undefined,
  }),
  loaderDeps: ({ search }) => ({ archived: search.archived === true }),
  loader: ({ deps }) => getLensInquiries({ data: deps }),
  component: InquiryList,
});

function InquiryList() {
  const data = Route.useLoaderData();
  const archived = Route.useSearch({
    select: (search) => search.archived === true,
  });

  async function copyPublicLink() {
    try {
      await navigator.clipboard.writeText(
        new URL(data.publicPath, window.location.origin).href,
      );
      toast.success("링크를 복사했습니다.");
    } catch {
      toast.error("링크를 복사하지 못했습니다.");
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="브랜드 문의"
        description="공개 페이지로 들어온 협업 문의와 대화를 관리합니다."
        action={
          data.publicPath ? (
            <button
              type="button"
              className="lens-button lens-button-secondary"
              onClick={() => void copyPublicLink()}
            >
              <Copy className="size-4" aria-hidden /> 공개 링크 복사
            </button>
          ) : null
        }
      />
      <nav
        aria-label="문의 분류"
        className="mb-5 inline-flex items-center gap-1 rounded-2xl bg-surface-2 p-1"
      >
        <Link
          to="/inquiries"
          search={{}}
          activeOptions={{ exact: true }}
          aria-current={archived ? undefined : "page"}
          className={`grid min-h-11 min-w-20 place-items-center rounded-xl px-4 text-sm font-semibold transition-colors ${archived ? "text-muted hover:text-fg" : "bg-surface text-fg shadow-xs"}`}
        >
          진행
        </Link>
        <Link
          to="/inquiries"
          search={{ archived: true }}
          activeOptions={{ exact: true }}
          aria-current={archived ? "page" : undefined}
          className={`grid min-h-11 min-w-20 place-items-center rounded-xl px-4 text-sm font-semibold transition-colors ${archived ? "bg-surface text-fg shadow-xs" : "text-muted hover:text-fg"}`}
        >
          보관
        </Link>
      </nav>
      {data.items.length === 0 ? (
        <div className="lens-panel px-5 py-10 text-center sm:py-14">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
            {archived ? (
              <Archive className="size-5" aria-hidden />
            ) : (
              <MessageCircle className="size-5" aria-hidden />
            )}
          </span>
          <h2 className="text-lg font-semibold">
            {archived ? "보관한 문의가 없습니다" : "아직 받은 문의가 없습니다"}
          </h2>
          {!archived ? (
            <>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
                공개 페이지 링크를 인스타그램 바이오에 추가해 브랜드의 협업
                문의를 받아보세요.
              </p>
              {!data.publicPath ? (
                <Link
                  to="/page"
                  className="lens-button lens-button-secondary mt-5"
                >
                  <Link2 className="size-4" aria-hidden /> 공개 페이지 설정
                </Link>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <ul className="lens-panel divide-y divide-border">
          {data.items.map((item) => (
            <li key={item.id}>
              <Link
                to="/inquiries/$id"
                params={{ id: item.id }}
                className="group flex min-h-20 items-center gap-3 rounded-lg px-3.5 py-3 transition-colors hover:bg-surface-2 sm:gap-4 sm:px-5"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-semibold group-hover:bg-surface"
                  aria-hidden
                >
                  {initial(item.company)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-base font-semibold [overflow-wrap:anywhere]">
                      {item.company}
                    </p>
                    <p className="text-sm text-muted">{item.trustLabel}</p>
                  </div>
                  {item.lastBody ? (
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {item.lastBody}
                    </p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                    {item.dealStatus ? (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 group-hover:bg-surface">
                        {statusLabel(item.dealStatus)}
                      </span>
                    ) : null}
                    {item.lastAt ? (
                      <time dateTime={item.lastAt}>
                        {relativeTime(item.lastAt)}
                      </time>
                    ) : null}
                  </div>
                </div>
                {item.unread > 0 ? (
                  <span
                    className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-accent-soft px-1.5 text-sm font-semibold text-accent-ink tabular-nums"
                    aria-label={`읽지 않은 메시지 ${item.unread}개`}
                  >
                    {item.unread}
                  </span>
                ) : null}
                <ChevronRight
                  className="size-4 shrink-0 text-muted"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
