import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { InboxView } from "@/components/inbox-view";
import { PageHeader } from "@/components/page-header";
import { RefreshButton } from "@/components/refresh-button";
import { copy } from "@/lib/hypeup/copy";
import { getInbox } from "@/lib/hypeup/api";
import type { CommentItem } from "@/lib/hypeup/types";
import { useInstagramSync } from "@/lib/hypeup/use-instagram-sync";

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
  const { comments: storedComments } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<CommentItem[] | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const comments = snapshot ?? storedComments;
  const { busy, refresh, error } = useInstagramSync(
    { scope: "inbox" },
    {
      accountId: user.id,
      onDone(event) {
        if (event.comments) setSnapshot(event.comments);
        const synced = event.report;
        const summary = `게시물 ${synced.media}개, 댓글 ${synced.comments}개, 룰 실행 ${synced.rulesRan}건`;
        if (synced.commentErrors.length) {
          setReport(`${summary}. 일부 댓글을 불러오지 못했어요.`);
        } else {
          toast.success(summary);
          setReport(summary);
        }
      },
    },
  );

  function refreshInbox() {
    setReport(null);
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="인박스"
        description="받은 댓글을 모아 보고, 공개 답글이나 DM을 보내세요."
        action={
          comments.length ? (
            <RefreshButton busy={busy} onRefresh={refreshInbox} />
          ) : null
        }
      />
      {error || report ? (
        <p
          role={error ? "alert" : "status"}
          className={`mb-4 rounded-md bg-surface-2 px-4 py-3 text-sm ${error ? "text-danger" : "text-muted"}`}
        >
          {error ?? report}
        </p>
      ) : null}
      {comments.length === 0 ? (
        <EmptyState
          title={copy.emptyComments}
          body="Instagram에서 새로고침을 누르면 최근 게시물의 댓글을 가져오고, 맞는 룰이 있으면 답글을 보냅니다."
          action={
            <RefreshButton busy={busy} onRefresh={refreshInbox} primary />
          }
        />
      ) : (
        <InboxView
          comments={comments}
          onRefresh={() => {
            setSnapshot(null);
            void router.invalidate();
          }}
        />
      )}
    </div>
  );
}
