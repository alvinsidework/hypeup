import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { RefreshButton } from "@/components/refresh-button";
import { copy } from "@/lib/hypeup/copy";
import { getPosts, refreshPosts } from "@/lib/hypeup/api";

export const Route = createFileRoute("/_app/posts/")({
  loader: () => getPosts(),
  pendingMs: 0,
  pendingComponent: PostsPending,
  component: PostsPage,
});

function PostsPending() {
  return (
    <div aria-busy="true">
      <PageHeader title="게시물" />
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
        aria-hidden
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="lens-panel overflow-hidden">
            <div className="aspect-square animate-pulse bg-surface-2" />
            <div className="m-3 h-4 w-3/4 animate-pulse rounded-full bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PostsPage() {
  const { media } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const result = await refreshPosts();
      if (!result.ok) toast.error(result.error);
      else
        toast.success(
          `게시물 ${result.report.media}개, 댓글 ${result.report.comments}개`,
        );
      await router.invalidate();
    } catch {
      toast.error(copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="게시물"
        description="게시물별로 댓글을 확인하고 답장을 보낼 수 있습니다."
        action={<RefreshButton busy={busy} onRefresh={() => void refresh()} />}
      />
      {media.length === 0 ? (
        <EmptyState title={copy.emptyPosts} />
      ) : (
        <MediaGrid media={media} />
      )}
    </div>
  );
}
