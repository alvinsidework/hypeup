import { ChevronRight } from "lucide-react";
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
  onSelect: (comment: CommentItem, trigger: HTMLButtonElement) => void;
}) {
  return (
    <ul className="lens-panel divide-y divide-border overflow-hidden">
      {comments.map((comment) => (
        <li key={comment.id}>
          <button
            type="button"
            onClick={(event) => onSelect(comment, event.currentTarget)}
            aria-pressed={selectedId === comment.id}
            className={cn(
              "flex w-full items-start gap-2.5 px-3.5 py-4 text-left transition-colors duration-200 focus-visible:-outline-offset-2 sm:gap-3 sm:px-4",
              selectedId === comment.id
                ? "bg-accent-soft"
                : "hover:bg-surface-2",
            )}
          >
            <span
              aria-hidden
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-muted"
            >
              {initial(comment.igFromUsername)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="min-w-0 break-all text-sm font-semibold">
                  @{comment.igFromUsername ?? "unknown"}
                </span>
                <time
                  dateTime={comment.timestamp ?? undefined}
                  className="text-sm text-muted tabular-nums"
                >
                  {relativeTime(comment.timestamp)}
                </time>
              </span>
              <span className="mt-1 block text-[15px] leading-6 break-words">
                {comment.text}
              </span>
              <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-muted empty:hidden">
                {comment.repliedPublic ? (
                  <span className="text-ok">공개 답글</span>
                ) : null}
                {comment.repliedPrivate ? (
                  <span className="text-ok">DM</span>
                ) : null}
                {comment.hidden ? (
                  <span className="text-danger">숨김</span>
                ) : null}
                {comment.media?.caption ? (
                  <span className="truncate">{comment.media.caption}</span>
                ) : null}
              </span>
            </span>
            {comment.media?.thumbnailUrl ? (
              <img
                src={comment.media.thumbnailUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-11 shrink-0 rounded-sm object-cover"
              />
            ) : null}
            <ChevronRight
              aria-hidden
              className="mt-1 size-4 shrink-0 self-center text-muted"
              strokeWidth={1.6}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
