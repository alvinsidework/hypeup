import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { InboxView } from "@/components/inbox-view";
import { PageHeader } from "@/components/page-header";
import { RefreshButton } from "@/components/refresh-button";
import { copy } from "@/lib/hypeup/copy";
import { getInbox, refreshPosts } from "@/lib/hypeup/api";

export const Route = createFileRoute("/_app/inbox")({
  loader: () => getInbox(),
  pendingMs: 0,
  pendingComponent: InboxPending,
  component: InboxPage,
});

function InboxPending() {
  return (
    <div aria-busy="true">
      <PageHeader title="인박스" />
      <div className="lens-panel divide-y divide-border" aria-hidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-4">
            <div className="size-10 shrink-0 animate-pulse rounded-full bg-surface-2" />
            <div className="grid flex-1 gap-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-surface-2" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InboxPage() {
  const { comments } = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setReport(null);
    try {
      const result = await refreshPosts();
      if (!result.ok) {
        toast.error(result.error);
        setReport(result.error ?? copy.genericError);
        return;
      }
      const synced = result.report;
      const summary = `게시물 ${synced.media}개, 댓글 ${synced.comments}개, 룰 실행 ${synced.rulesRan}건`;
      toast.success(summary);
      setReport(
        synced.commentErrors.length
          ? `${summary}. 일부 실패: ${synced.commentErrors[0]}`
          : summary,
      );
      await router.invalidate();
    } catch {
      toast.error(copy.genericError);
      setReport(copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="인박스"
        description="받은 댓글을 모아 보고, 공개 답글이나 DM을 보내세요."
        action={
          comments.length ? (
            <RefreshButton busy={busy} onRefresh={() => void refresh()} />
          ) : null
        }
      />
      {report ? (
        <p
          role="status"
          className="mb-4 rounded-md bg-surface-2 px-4 py-3 text-sm text-muted"
        >
          {report}
        </p>
      ) : null}
      {comments.length === 0 ? (
        <EmptyState
          title={copy.emptyComments}
          body="Instagram에서 새로고침을 누르면 최근 게시물의 댓글을 가져오고, 맞는 룰이 있으면 답글을 보냅니다."
          action={
            <RefreshButton
              busy={busy}
              onRefresh={() => void refresh()}
              primary
            />
          }
        />
      ) : (
        <InboxView
          comments={comments}
          onRefresh={() => void router.invalidate()}
        />
      )}
    </div>
  );
}
