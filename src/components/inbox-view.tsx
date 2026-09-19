import { useMemo, useState } from "react";
import { CommentList } from "@/components/comment-list";
import { CommentThread } from "@/components/comment-thread";
import { EmptyState } from "@/components/empty-state";
import { copy } from "@/lib/hypeup/copy";
import type { CommentItem } from "@/lib/hypeup/types";

export function InboxView({
  comments,
  onRefresh,
}: {
  comments: CommentItem[];
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return comments.filter((comment) => {
      if (filter === "unreplied" && (comment.repliedPublic || comment.repliedPrivate)) return false;
      if (filter === "hidden" && !comment.hidden) return false;
      if (query && !`${comment.text} ${comment.igFromUsername ?? ""}`.includes(query)) return false;
      return true;
    });
  }, [comments, filter, query]);

  const selected = selectedId ? (filtered.find((item) => item.id === selectedId) ?? null) : null;
  const thread = selected
    ? comments.filter((item) => item.id === selected.id || item.parentId === selected.id || selected.parentId === item.id)
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "전체"],
            ["unreplied", "미답글"],
            ["hidden", "숨김"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`h-10 rounded-md px-3 text-[13px] ${filter === value ? "bg-fg text-bg" : "border border-border"}`}
            >
              {label}
            </button>
          ))}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="키워드 검색"
            className="h-10 min-w-[160px] flex-1 rounded-md border border-border bg-bg px-3 text-[13px]"
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState title={copy.emptyComments} />
        ) : (
          <CommentList
            comments={filtered.filter((item) => !item.parentId)}
            selectedId={selected?.id}
            onSelect={(comment) => setSelectedId(comment.id)}
          />
        )}
      </div>
      <aside className="hidden overflow-hidden rounded-lg border border-border bg-surface lg:block">
        {selected ? (
          <CommentThread idPrefix="desk" comment={selected} thread={thread} onChanged={onRefresh} />
        ) : (
          <div className="p-6 text-[13px] text-muted">댓글을 선택하세요</div>
        )}
      </aside>
      {selected ? (
        <div className="fixed inset-0 z-40 bg-bg/80 lg:hidden">
          <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-xl border-t border-border bg-surface">
            <CommentThread
              idPrefix="mob"
              comment={selected}
              thread={thread}
              onChanged={onRefresh}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
