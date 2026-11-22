import { useRef, useState, useSyncExternalStore } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { MessageCircle, Search } from "lucide-react";
import { CommentList } from "@/components/comment-list";
import { CommentThread } from "@/components/comment-thread";
import { EmptyState } from "@/components/empty-state";
import { copy } from "@/lib/hypeup/copy";
import type { CommentItem } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

const filters = [
  ["all", "전체"],
  ["unreplied", "미답글"],
  ["dm-sent", "DM 발송"],
  ["hidden", "숨김"],
] as const;

const desktopQuery = "(min-width: 64rem)";

function subscribeDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export function InboxView({
  comments,
  onRefresh,
}: {
  comments: CommentItem[];
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number][0]>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const firstFilter = useRef<HTMLButtonElement>(null);
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  );

  const search = query.trim().toLowerCase();
  const filtered = comments.filter((comment) => {
    if (comment.parentId) return false;
    if (
      filter === "unreplied" &&
      (comment.repliedPublic || comment.repliedPrivate)
    )
      return false;
    if (filter === "dm-sent" && !comment.repliedPrivate) return false;
    if (filter === "hidden" && !comment.hidden) return false;
    return (
      !search ||
      `${comment.text} ${comment.igFromUsername ?? ""}`
        .toLowerCase()
        .includes(search)
    );
  });

  const selected = filtered.find((item) => item.id === selectedId) ?? null;
  const thread = selected
    ? [selected, ...comments.filter((item) => item.parentId === selected.id)]
    : [];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] xl:gap-6">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-full bg-surface-2 p-1"
            aria-label="댓글 필터"
            role="group"
          >
            {filters.map(([value, label]) => (
              <button
                ref={value === "all" ? firstFilter : undefined}
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "min-h-11 rounded-full px-3.5 text-sm font-semibold transition-colors duration-200",
                  filter === value
                    ? "bg-surface text-fg shadow-sm"
                    : "text-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative min-w-40 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
            />
            <span className="sr-only">댓글 또는 계정 검색</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="댓글·계정 검색"
              className="lens-field min-h-12 w-full pr-3 pl-10 text-[16px]"
            />
          </label>
        </div>
        {filter === "dm-sent" ? (
          <p className="text-sm text-muted">
            댓글에서 보낸 DM을 모아 봅니다. 팔로우 안내도 포함돼요.
          </p>
        ) : null}
        {filtered.length === 0 ? (
          <EmptyState
            title={
              search
                ? "검색 결과가 없습니다"
                : filter === "all"
                  ? copy.emptyComments
                  : "해당하는 댓글이 없습니다"
            }
          />
        ) : (
          <CommentList
            comments={filtered}
            selectedId={selected?.id}
            onSelect={(comment, button) => {
              trigger.current = button;
              setSelectedId(comment.id);
            }}
          />
        )}
      </div>
      <aside
        className="lens-panel hidden min-w-0 lg:block"
        aria-label="댓글 상세"
      >
        {selected && isDesktop ? (
          <CommentThread
            key={selected.id}
            comment={selected}
            thread={thread}
            onChanged={onRefresh}
          />
        ) : (
          <div className="grid min-h-56 place-content-center justify-items-center gap-3 p-6 text-center text-sm text-muted">
            <span className="grid size-12 place-items-center rounded-full bg-surface-2">
              <MessageCircle aria-hidden className="size-5" strokeWidth={1.6} />
            </span>
            상세를 보려면 댓글을 선택하세요.
          </div>
        )}
      </aside>
      <Dialog.Root
        open={Boolean(selected) && !isDesktop}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="lens-overlay" />
          <Dialog.Content
            aria-describedby={undefined}
            className="lens-sheet fixed inset-x-0 bottom-0 z-[55] max-h-[calc(100dvh_-_max(1rem,env(safe-area-inset-top)))] overflow-y-auto overscroll-contain rounded-b-none bg-surface pb-[env(safe-area-inset-bottom)] outline-none"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = trigger.current?.isConnected
                ? trigger.current
                : firstFilter.current;
              target?.focus({ preventScroll: true });
            }}
          >
            <Dialog.Title className="sr-only">댓글 상세</Dialog.Title>
            {selected ? (
              <CommentThread
                key={selected.id}
                comment={selected}
                thread={thread}
                onChanged={onRefresh}
                onClose={() => setSelectedId(null)}
              />
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
