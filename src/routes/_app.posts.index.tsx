import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/empty-state";
import { MediaGrid, MediaGridSkeleton } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { RefreshButton } from "@/components/refresh-button";
import { getPosts } from "@/lib/hypeup/api";
import type { MediaItem } from "@/lib/hypeup/types";
import { useInstagramSync } from "@/lib/hypeup/use-instagram-sync";

const description = "게시물별로 댓글을 확인하고 답장을 보낼 수 있습니다.";

export const Route = createFileRoute("/_app/posts/")({
  loader: () => getPosts(),
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: PostsPending,
  component: PostsPage,
});

function PostsPending() {
  return (
    <div aria-busy="true">
      <PageHeader
        title="게시물"
        description={description}
        action={<RefreshButton busy onRefresh={() => undefined} />}
      />
      <MediaGridSkeleton />
    </div>
  );
}

function PostsPage() {
  const { media } = Route.useLoaderData();
  const { user, demoMode } = Route.useRouteContext();
  const [refreshedMedia, setRefreshedMedia] = useState<MediaItem[] | null>(
    null,
  );
  const canSync = user.hasToken || demoMode;
  const { refresh, busy, settled, error } = useInstagramSync(
    { scope: "posts" },
    { accountId: user.id, auto: canSync, onMedia: setRefreshedMedia },
  );
  const posts = refreshedMedia ?? media;
  const loading = canSync && (busy || !settled);

  return (
    <div>
      <PageHeader
        title="게시물"
        description={description}
        action={
          canSync ? (
            <RefreshButton busy={loading} onRefresh={refresh} />
          ) : (
            <Link
              to="/connect"
              search={{ error: undefined, detail: undefined }}
              className="lens-button lens-button-secondary"
            >
              Instagram 다시 연결
            </Link>
          )
        }
      />
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-md bg-surface-2 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      {posts.length > 0 ? (
        <MediaGrid media={posts} />
      ) : loading ? (
        <div aria-busy="true" aria-label="게시물 불러오는 중">
          <MediaGridSkeleton />
        </div>
      ) : (
        <EmptyState
          title={
            error ? "게시물을 불러오지 못했습니다" : "아직 게시물이 없습니다"
          }
          body={
            canSync
              ? undefined
              : "Instagram에 다시 연결하면 게시물을 가져올 수 있습니다."
          }
        />
      )}
    </div>
  );
}
