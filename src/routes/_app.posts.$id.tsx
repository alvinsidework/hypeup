import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { InboxView } from "@/components/inbox-view";
import { EmptyState } from "@/components/empty-state";
import { mediaTypeLabel } from "@/components/media-grid";
import { MediaPlaceholder, MediaPreview } from "@/components/media-preview";
import { RefreshButton } from "@/components/refresh-button";
import { copy } from "@/lib/hypeup/copy";
import { getPostDetail } from "@/lib/hypeup/api";
import { relativeTime } from "@/lib/hypeup/format";
import type { CommentItem } from "@/lib/hypeup/types";
import { useInstagramSync } from "@/lib/hypeup/use-instagram-sync";

export const Route = createFileRoute("/_app/posts/$id")({
  staticData: { workspaceBack: { to: "/posts", label: "게시물 목록" } },
  loader: ({ params }) => getPostDetail({ data: { id: params.id } }),
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: PostDetailPending,
  component: PostDetailPage,
});

function CommentsSkeleton() {
  return (
    <div className="lens-panel divide-y divide-border" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex items-center gap-3 p-4 motion-safe:animate-pulse"
        >
          <div className="size-10 shrink-0 rounded-full bg-surface-2" />
          <div className="grid flex-1 gap-2">
            <div className="h-3 w-24 rounded-full bg-surface-2" />
            <div className="h-3 w-2/3 rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PostDetailPending() {
  return (
    <div>
      <div
        className="lens-panel grid gap-5 p-3.5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-6 sm:p-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]"
        aria-busy="true"
      >
        <div
          className="relative aspect-square overflow-hidden rounded-md"
          aria-hidden
        >
          <MediaPlaceholder crossed />
        </div>
        <div
          className="space-y-3 p-1 sm:py-3 motion-safe:animate-pulse"
          aria-hidden
        >
          <div className="h-5 w-24 rounded-sm bg-surface-2" />
          <div className="h-4 w-40 rounded-sm bg-surface-2" />
          <div className="h-4 w-3/4 rounded-sm bg-surface-2" />
        </div>
      </div>
      <div className="mt-8" aria-busy="true">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">댓글</h2>
        <CommentsSkeleton />
      </div>
    </div>
  );
}

function PostDetailPage() {
  const { media, comments } = Route.useLoaderData();
  const { id } = Route.useParams();
  const { user, demoMode } = Route.useRouteContext();
  const router = useRouter();
  const [refreshedComments, setRefreshedComments] = useState<
    CommentItem[] | null
  >(null);
  const [partialError, setPartialError] = useState<string | null>(null);
  const canSync = user.hasToken || demoMode;
  const { refresh, busy, settled, error } = useInstagramSync(
    { scope: "post", mediaId: id },
    {
      accountId: user.id,
      auto: Boolean(media) && canSync,
      onDone: (event) => {
        if (event.comments) setRefreshedComments(event.comments);
        setPartialError(event.report.commentErrors[0] ?? null);
      },
    },
  );
  if (!media) return <EmptyState title="게시물을 찾을 수 없습니다" />;

  const published = relativeTime(media.timestamp);
  const displayedComments = refreshedComments ?? comments;
  const loading = canSync && (busy || !settled);
  const warning = error ?? (!loading ? partialError : null);

  function reloadSavedComments() {
    void router
      .invalidate({ filter: (match) => match.routeId === Route.id })
      .then(() => setRefreshedComments(null));
  }

  return (
    <div>
      <div className="lens-panel grid items-start gap-5 p-3.5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-6 sm:p-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <MediaPreview media={media} eager allowVideo className="rounded-md" />
        <div className="min-w-0 p-1 sm:py-3">
          <h1 className="text-xl font-semibold tracking-tight">게시물</h1>
          <p className="mt-1 text-sm text-muted">
            {mediaTypeLabel(media.mediaType)}
            {published ? ` · ${published}` : ""}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 break-words">
            {media.caption || "캡션 없음"}
          </p>
          {media.permalink ? (
            <a
              href={media.permalink}
              target="_blank"
              rel="noreferrer"
              className="lens-button lens-button-secondary mt-4"
            >
              Instagram에서 보기 <ArrowUpRight aria-hidden className="size-4" />
            </a>
          ) : null}
        </div>
      </div>

      <section className="mt-8" aria-labelledby="post-comments">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2
            id="post-comments"
            className="text-xl font-semibold tracking-tight"
          >
            댓글
            {displayedComments.length > 0 || !loading
              ? ` ${displayedComments.length}`
              : ""}
          </h2>
          {canSync ? (
            <RefreshButton busy={loading} onRefresh={refresh} />
          ) : null}
        </div>
        {warning ? (
          <p
            role="alert"
            className="mb-4 rounded-md bg-surface-2 px-4 py-3 text-sm text-danger"
          >
            {warning}
          </p>
        ) : null}
        {displayedComments.length > 0 ? (
          <InboxView
            comments={displayedComments}
            onRefresh={reloadSavedComments}
          />
        ) : loading ? (
          <div aria-busy="true" aria-label="댓글 불러오는 중">
            <CommentsSkeleton />
          </div>
        ) : (
          <EmptyState
            title={warning ? "댓글을 불러오지 못했습니다" : copy.emptyComments}
          />
        )}
      </section>
    </div>
  );
}
