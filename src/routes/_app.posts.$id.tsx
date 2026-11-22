import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight, ImageIcon } from "lucide-react";
import { InboxView } from "@/components/inbox-view";
import { EmptyState } from "@/components/empty-state";
import { mediaTypeLabel } from "@/components/media-grid";
import { copy } from "@/lib/hypeup/copy";
import { getPostDetail } from "@/lib/hypeup/api";
import { relativeTime } from "@/lib/hypeup/format";

export const Route = createFileRoute("/_app/posts/$id")({
  loader: ({ params }) => getPostDetail({ data: { id: params.id } }),
  pendingMs: 0,
  pendingComponent: PostDetailPending,
  component: PostDetailPage,
});

function PostDetailPending() {
  return (
    <div
      className="grid gap-6 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]"
      aria-busy="true"
    >
      <div className="aspect-square animate-pulse rounded-lg bg-surface-2" />
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded-sm bg-surface-2" />
        <div className="h-24 animate-pulse rounded-md bg-surface-2" />
        <div className="h-40 animate-pulse rounded-lg bg-surface-2" />
      </div>
    </div>
  );
}

function PostDetailPage() {
  const { media, comments } = Route.useLoaderData();
  const router = useRouter();
  if (!media) {
    return <EmptyState title="게시물을 찾을 수 없습니다" />;
  }
  const isVideo = media.mediaType === "VIDEO" || media.mediaType === "REELS";
  const image = media.thumbnailUrl || (!isVideo ? media.mediaUrl : null);
  const published = relativeTime(media.timestamp);
  return (
    <div>
      <Link to="/posts" className="lens-button lens-button-quiet mb-3">
        <ArrowLeft aria-hidden className="size-4" />
        게시물 목록
      </Link>
      <div className="lens-panel grid items-start gap-5 p-3.5 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:gap-6 sm:p-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-md bg-surface-2">
          {image ? (
            <img
              src={image}
              alt=""
              className="aspect-square w-full object-cover"
            />
          ) : isVideo && media.mediaUrl ? (
            <video
              className="aspect-square w-full"
              src={media.mediaUrl}
              controls
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="flex aspect-square flex-col items-center justify-center gap-2 text-sm text-muted">
              <ImageIcon aria-hidden className="size-6" strokeWidth={1.5} />
              미리보기 없음
            </div>
          )}
        </div>
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
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          댓글 {comments.length}
        </h2>
        {comments.length === 0 ? (
          <EmptyState title={copy.emptyComments} />
        ) : (
          <InboxView
            comments={comments}
            onRefresh={() => void router.invalidate()}
          />
        )}
      </div>
    </div>
  );
}
