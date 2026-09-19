import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { InboxView } from "@/components/inbox-view";
import { PageHeader } from "@/components/page-header";
import { copy } from "@/lib/hypeup/copy";
import { getInbox, refreshPosts } from "@/lib/hypeup/api";

export const Route = createFileRoute("/_app/inbox")({
  loader: () => getInbox(),
  component: InboxPage,
});

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
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="인박스"
        description="다른 계정이 단 댓글은 새로고침해야 들어옵니다. 웹훅이 없으면 실시간 알림은 없습니다."
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
      {report ? <p className="mb-4 text-[13px] text-muted">{report}</p> : null}
      {comments.length === 0 ? (
        <EmptyState
          title={copy.emptyComments}
          body="Instagram에서 새로고침을 누르면 최근 게시물의 댓글을 가져오고, 맞는 룰이 있으면 답글을 보냅니다."
          action={
            <button
              type="button"
              disabled={busy}
              className="h-11 rounded-md bg-fg px-4 text-[13px] text-bg disabled:opacity-50"
              onClick={() => void refresh()}
            >
              {busy ? "불러오는 중" : copy.refreshFromIg}
            </button>
          }
        />
      ) : (
        <InboxView comments={comments} onRefresh={() => void router.invalidate()} />
      )}
    </div>
  );
}
