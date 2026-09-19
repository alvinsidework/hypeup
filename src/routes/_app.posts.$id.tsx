import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { InboxView } from "@/components/inbox-view";
import { EmptyState } from "@/components/empty-state";
import { copy } from "@/lib/hypeup/copy";
import { getPostDetail } from "@/lib/hypeup/api";
import { relativeTime } from "@/lib/hypeup/format";

const TYPE_LABEL: Record<string, string> = {
  IMAGE: "사진",
  VIDEO: "영상",
  CAROUSEL_ALBUM: "캐러셀",
  REELS: "릴스",
};

export const Route = createFileRoute("/_app/posts/$id")({
  loader: ({ params }) => getPostDetail({ data: { id: params.id } }),
  pendingMs: 0,
  pendingComponent: PostDetailPending,
  component: PostDetailPage,
});

function PostDetailPending() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
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
  const image = media.thumbnailUrl || media.mediaUrl;
  return (
    <div>
      <Link to="/posts" className="text-[13px] text-muted">
        ← 게시물
      </Link>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          {image ? (
            <img src={image} alt="" className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-surface-2 text-[13px] text-muted">
              미리보기 없음
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-wide text-subtle">
            {TYPE_LABEL[media.mediaType] ?? media.mediaType}
            {media.timestamp ? ` · ${relativeTime(media.timestamp)}` : ""}
          </p>
          <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-fg/90">
            {media.caption || "캡션 없음"}
          </p>
          {media.permalink ? (
            <a
              href={media.permalink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-[13px] text-accent"
            >
              Instagram에서 보기
            </a>
          ) : null}
        </div>
      </div>
      <div className="mt-8">
        <h2 className="mb-4 text-[15px] font-medium">댓글 {comments.length}</h2>
        {comments.length === 0 ? (
          <EmptyState title={copy.emptyComments} />
        ) : (
          <InboxView comments={comments} onRefresh={() => void router.invalidate()} />
        )}
      </div>
    </div>
  );
}
