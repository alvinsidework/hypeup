import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Instagram, Search, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { mediaTypeLabel } from "@/components/media-grid";
import { MediaPreview } from "@/components/media-preview";
import { RefreshButton } from "@/components/refresh-button";
import type { MediaItem } from "@/lib/hypeup/types";

const batchSize = 18;

export function PortfolioMediaPicker({
  media,
  registered,
  canSync,
  syncing,
  error,
  disabled,
  hasOlder,
  onRefresh,
  onLoadOlder,
  onSelect,
  onSelectedClose,
}: {
  media: MediaItem[];
  registered: ReadonlySet<string>;
  canSync: boolean;
  syncing: boolean;
  error: string | null;
  disabled: boolean;
  hasOlder: boolean;
  onRefresh: () => void;
  onLoadOlder: () => void;
  onSelect: (media: MediaItem) => void;
  onSelectedClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(batchSize);
  const heading = useRef<HTMLHeadingElement>(null);
  const selected = useRef(false);
  const search = query.trim().toLowerCase();
  const matches = search
    ? media.filter((item) =>
        (item.caption ?? "").toLowerCase().includes(search),
      )
    : media;

  function changeOpen(next: boolean) {
    if (next) {
      selected.current = false;
      setQuery("");
      setLimit(batchSize);
      if (canSync && !syncing && media.length === 0) onRefresh();
    }
    setOpen(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="lens-button lens-button-primary"
          disabled={disabled}
        >
          <Instagram className="size-4" aria-hidden /> Instagram 게시물 선택
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="lens-overlay" />
        <Dialog.Content
          className="lens-sheet fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-h-[min(85dvh,47rem)] w-full max-w-2xl flex-col overflow-hidden rounded-b-none sm:inset-0 sm:m-auto sm:h-fit sm:w-[calc(100%-2rem)] sm:rounded-xl"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            heading.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            if (!selected.current) return;
            event.preventDefault();
            onSelectedClose();
          }}
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <Dialog.Title
                tabIndex={-1}
                ref={heading}
                className="text-xl font-semibold tracking-tight focus:outline-none"
              >
                Instagram 게시물 선택
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-5 text-muted">
                연결된 계정에서 추가할 게시물을 고르세요.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="lens-icon-button"
              aria-label="게시물 선택 닫기"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
            <div className="flex flex-wrap gap-2">
              {media.length ? (
                <label className="relative min-w-44 flex-1">
                  <span className="sr-only">게시물 캡션 검색</span>
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
                    aria-hidden
                  />
                  <input
                    type="search"
                    className="lens-field pl-10"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setLimit(batchSize);
                    }}
                    placeholder="게시물 캡션 검색"
                  />
                </label>
              ) : null}
              {canSync ? (
                <RefreshButton busy={syncing} onRefresh={onRefresh} />
              ) : (
                <Link
                  to="/connect"
                  search={{ error: undefined, detail: undefined }}
                  className="lens-button lens-button-secondary"
                >
                  Instagram 다시 연결
                </Link>
              )}
            </div>
            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-lg bg-surface-2 px-4 py-3 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}

            {matches.length ? (
              <ul
                className="mt-4 grid grid-cols-2 gap-2.5 min-[430px]:grid-cols-3 sm:gap-3"
                aria-label="Instagram 게시물"
              >
                {matches.slice(0, limit).map((item) => {
                  const caption = item.caption?.trim() || "캡션 없는 게시물";
                  const added = registered.has(item.id);

                  return (
                    <li key={item.id} className="min-w-0">
                      <button
                        type="button"
                        className="group flex h-full w-full flex-col overflow-hidden rounded-md border border-border bg-surface text-left transition-colors hover:border-accent hover:bg-surface-2"
                        onClick={() => {
                          selected.current = true;
                          onSelect(item);
                          setOpen(false);
                        }}
                      >
                        <span className="relative block w-full">
                          <MediaPreview media={item} />
                          {added ? (
                            <span className="absolute inset-x-1.5 bottom-1.5 ml-auto flex w-fit items-center gap-1 rounded-full bg-surface px-2 py-1 text-xs font-medium text-fg">
                              <Check
                                className="size-3.5 text-accent-ink"
                                aria-hidden
                              />{" "}
                              등록됨
                            </span>
                          ) : null}
                        </span>
                        <span className="block w-full px-3 py-2.5">
                          <span className="line-clamp-2 text-sm leading-5 font-semibold">
                            {caption}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">
                            {mediaTypeLabel(item.mediaType)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p
                className="my-5 px-1 py-4 text-center text-sm leading-6 text-muted"
                role={syncing ? "status" : undefined}
              >
                {syncing
                  ? "Instagram 게시물을 가져오고 있어요."
                  : search
                    ? "검색 결과가 없습니다."
                    : "가져온 게시물이 없습니다."}
              </p>
            )}
            {matches.length > limit ? (
              <button
                type="button"
                className="lens-button lens-button-secondary mt-4 w-full"
                onClick={() => setLimit((count) => count + batchSize)}
              >
                가져온 게시물 더 보기
              </button>
            ) : canSync && hasOlder ? (
              <button
                type="button"
                className="lens-button lens-button-secondary mt-4 w-full"
                disabled={syncing}
                aria-busy={syncing}
                onClick={() => {
                  setLimit((count) => count + batchSize);
                  onLoadOlder();
                }}
              >
                {syncing ? "불러오는 중" : "이전 게시물 가져오기"}
              </button>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
