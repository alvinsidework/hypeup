import { initial, relativeTime } from "@/lib/hypeup/format";
import type { CommentItem } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

export function CommentList({
  comments,
  selectedId,
  onSelect,
}: {
  comments: CommentItem[];
  selectedId?: string | null;
  onSelect: (comment: CommentItem) => void;
}) {
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {comments.map((comment, index) => (
        <li key={comment.id}>
          <button
            type="button"
            onClick={() => onSelect(comment)}
            className={cn(
              "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-surface-2",
              selectedId === comment.id && "bg-surface-2",
            )}
            style={{ animationDelay: `${Math.min(index, 7) * 40}ms` }}
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-bg text-[12px] text-muted">
              {initial(comment.igFromUsername)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium">
                  @{comment.igFromUsername ?? "unknown"}
                </span>
                <span className="ml-auto shrink-0 text-[11px] tabular-nums text-subtle">
                  {relativeTime(comment.timestamp)}
                </span>
              </span>
              <span className="mt-1 block text-[13px] leading-5 text-fg/90">{comment.text}</span>
              <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-subtle">
                {comment.repliedPublic ? <span className="text-ok">공개 답글</span> : null}
                {comment.repliedPrivate ? <span className="text-ok">DM</span> : null}
                {comment.hidden ? <span className="text-danger">숨김</span> : null}
                {comment.media?.caption ? (
                  <span className="truncate">{comment.media.caption}</span>
                ) : null}
              </span>
            </span>
            {comment.media?.thumbnailUrl ? (
              <img
                src={comment.media.thumbnailUrl}
                alt=""
                className="size-12 shrink-0 rounded-sm object-cover"
              />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
