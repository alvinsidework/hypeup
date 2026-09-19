import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { RefreshOverlay } from "@/components/refresh-overlay";
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
    <div>
      <PageHeader title="게시물" description="불러오는 중" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="aspect-square animate-pulse bg-surface-2" />
            <div className="h-10 animate-pulse bg-surface" />
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
      else toast.success(`게시물 ${result.report.media}개, 댓글 ${result.report.comments}개`);
      await router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="게시물"
        description="미디어를 선택하면 해당 댓글 스레드로 이동합니다."
        action={
          <button
            type="button"
            disabled={busy}
            className="h-11 rounded-md border border-border px-4 text-[13px] disabled:opacity-50"
            onClick={() => void refresh()}
          >
            {busy ? "불러오는 중" : copy.refreshFromIg}
          </button>
        }
      />
      {media.length === 0 ? <EmptyState title={copy.emptyPosts} /> : <MediaGrid media={media} />}
      <RefreshOverlay busy={busy} />
    </div>
  );
}
