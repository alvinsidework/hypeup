import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { InboxView } from "@/components/inbox-view";
import { EmptyState } from "@/components/empty-state";
import { copy } from "@/lib/hypeup/copy";
import { getPostDetail } from "@/lib/hypeup/api";

export const Route = createFileRoute("/_app/posts/$id")({
  loader: ({ params }) => getPostDetail({ data: { id: params.id } }),
  component: PostDetailPage,
});

function PostDetailPage() {
  const { media, comments } = Route.useLoaderData();
  const router = useRouter();
  if (!media) {
    return <EmptyState title="게시물을 찾을 수 없습니다" />;
  }
  return (
    <div>
      <Link to="/posts" className="text-[13px] text-muted">
        ← 게시물
      </Link>
      <h1 className="mt-3 max-w-2xl font-display text-3xl tracking-tight">
        {media.caption || "캡션 없음"}
      </h1>
      <p className="mt-2 text-[13px] text-muted">{media.mediaType}</p>
      <div className="mt-6">
        {comments.length === 0 ? (
          <EmptyState title={copy.emptyComments} />
        ) : (
          <InboxView comments={comments} onRefresh={() => void router.invalidate()} />
        )}
      </div>
    </div>
  );
}
