import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { copy } from "@/lib/hypeup/copy";
import { getPosts, refreshPosts } from "@/lib/hypeup/api";

export const Route = createFileRoute("/_app/posts")({
  loader: () => getPosts(),
  component: PostsPage,
});

function PostsPage() {
  const { media } = Route.useLoaderData();
  const router = useRouter();
  return (
    <div>
      <PageHeader
        title="게시물"
        description="미디어를 선택하면 해당 댓글 스레드로 이동합니다."
        action={
          <button
            type="button"
            className="h-11 rounded-md border border-border px-4 text-[13px]"
            onClick={async () => {
              const result = await refreshPosts();
              if (!result.ok) toast.error(result.error);
              else {
                toast.success(
                  `게시물 ${result.report.media}개, 댓글 ${result.report.comments}개`,
                );
              }
              await router.invalidate();
            }}
          >
            {copy.refreshFromIg}
          </button>
        }
      />
      {media.length === 0 ? <EmptyState title={copy.emptyPosts} /> : <MediaGrid media={media} />}
    </div>
  );
}
