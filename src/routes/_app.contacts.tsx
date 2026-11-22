import { useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, ChevronRight, Search, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { getInbox } from "@/lib/hypeup/api";
import { initial, relativeTime } from "@/lib/hypeup/format";
import type { CommentItem, HypeupUser } from "@/lib/hypeup/types";
import { normalizeInstagramUsername } from "@/lib/instagram/follow-parse";

export const Route = createFileRoute("/_app/contacts")({
  loader: () => getInbox(),
  component: ContactsPage,
});

type Contact = {
  username: string;
  latest: CommentItem;
  comments: CommentItem[];
  publicReplies: number;
  privateReplies: number;
};

function groupContacts(
  comments: CommentItem[],
  user: Pick<HypeupUser, "username" | "igUserId">,
) {
  const contacts = new Map<string, Contact>();
  const ownUsername = normalizeInstagramUsername(user.username);

  // getInbox returns the newest comment first, with undated entries last.
  for (const comment of comments) {
    const username = normalizeInstagramUsername(comment.igFromUsername);
    if (
      comment.parentId ||
      !username ||
      username === ownUsername ||
      comment.igFromId === user.igUserId
    ) {
      continue;
    }

    let contact = contacts.get(username);
    if (!contact) {
      contact = {
        username,
        latest: comment,
        comments: [],
        publicReplies: 0,
        privateReplies: 0,
      };
      contacts.set(username, contact);
    }

    contact.comments.push(comment);
    contact.publicReplies += Number(comment.repliedPublic);
    contact.privateReplies += Number(comment.repliedPrivate);
  }

  return contacts;
}

function ContactAvatar({ username }: { username: string }) {
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-base font-semibold text-accent-ink"
    >
      {initial(username)}
    </span>
  );
}

function ContactActivity({ comment }: { comment: CommentItem }) {
  const time = relativeTime(comment.timestamp);

  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
        {time ? (
          <time dateTime={comment.timestamp ?? undefined}>{time}</time>
        ) : null}
        {comment.repliedPublic ? <span>공개 답글</span> : null}
        {comment.repliedPrivate ? (
          <span className="text-accent-ink">DM 발송</span>
        ) : null}
        {comment.hidden ? <span>숨김</span> : null}
      </div>
      <p className="mt-1 text-sm leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">
        {comment.text || "텍스트 없는 댓글"}
      </p>
      {comment.media ? (
        <Link
          to="/posts/$id"
          params={{ id: comment.mediaId }}
          className="-ml-1.5 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-sm px-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
        >
          <span className="truncate">
            {comment.media.caption || "게시물 보기"}
          </span>
          <ArrowUpRight aria-hidden className="size-3.5 shrink-0" />
        </Link>
      ) : null}
    </li>
  );
}

function ContactDetails({ contact }: { contact: Contact }) {
  const metrics = [
    { label: "댓글", value: contact.comments.length },
    { label: "공개 답글", value: contact.publicReplies },
    { label: "DM 발송 댓글", value: contact.privateReplies },
  ];

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface px-4 py-3.5 sm:px-6 sm:py-4">
        <ContactAvatar username={contact.username} />
        <div className="min-w-0 flex-1">
          <Dialog.Title className="text-xl font-bold tracking-tight [overflow-wrap:anywhere]">
            @{contact.username}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-muted">
            Instagram 댓글 활동
          </Dialog.Description>
        </div>
        <Dialog.Close className="lens-icon-button" aria-label="계정 상세 닫기">
          <X aria-hidden className="size-5" strokeWidth={1.75} />
        </Dialog.Close>
      </div>
      <div className="px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-5 sm:pb-6">
        <dl className="grid grid-cols-3 divide-x divide-border rounded-md bg-surface-2">
          {metrics.map(({ label, value }) => (
            <div
              key={label}
              className="space-y-1 px-2 py-3 text-center sm:px-3"
            >
              <dt className="text-xs font-medium text-muted">{label}</dt>
              <dd className="text-xl leading-tight font-semibold tabular-nums">
                {value.toLocaleString("ko-KR")}
              </dd>
            </div>
          ))}
        </dl>
        {contact.privateReplies > 0 ? (
          <p className="mt-2 text-xs leading-5 text-muted">
            DM 발송에는 댓글에서 보낸 팔로우 안내도 포함돼요.
          </p>
        ) : null}
        <h2 className="mt-5 text-base font-semibold">댓글 기록</h2>
        <ul className="mt-1 divide-y divide-border">
          {contact.comments.map((comment) => (
            <ContactActivity key={comment.id} comment={comment} />
          ))}
        </ul>
      </div>
    </>
  );
}

function ContactsPage() {
  const { comments } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const [query, setQuery] = useState("");
  const [activeContact, setActiveContact] = useState<{
    username: string;
    open: boolean;
  } | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const contacts = useMemo(
    () => groupContacts(comments, user),
    [comments, user],
  );
  const search = normalizeInstagramUsername(query);
  const results = [...contacts.values()].filter(
    (contact) => !search || contact.username.includes(search),
  );
  const selected = activeContact
    ? contacts.get(activeContact.username)
    : undefined;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="상호작용 계정"
        description="동기화한 Instagram 댓글과 응답 기록을 계정별로 확인하세요."
      />
      {contacts.size === 0 ? (
        <EmptyState
          title="댓글을 남긴 계정이 아직 없습니다"
          body="댓글 인박스에서 Instagram 댓글을 가져오면 여기에 계정이 표시됩니다."
          action={
            <Link className="lens-button lens-button-secondary" to="/inbox">
              댓글 인박스 열기
            </Link>
          }
        />
      ) : (
        <section aria-label="댓글을 남긴 계정">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:max-w-72">
              <label className="block">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
                />
                <span className="sr-only">Instagram 계정 검색</span>
                <input
                  ref={searchInput}
                  type="search"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Instagram 계정 검색"
                  className="lens-field pr-12 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
                />
              </label>
              {query ? (
                <button
                  type="button"
                  aria-label="검색 지우기"
                  className="lens-icon-button absolute top-1/2 right-1 size-11 -translate-y-1/2 bg-transparent text-muted focus-visible:outline-offset-0"
                  onClick={() => {
                    setQuery("");
                    searchInput.current?.focus();
                  }}
                >
                  <X aria-hidden className="size-4" />
                </button>
              ) : null}
            </div>
            <p
              role="status"
              className="text-sm font-medium text-muted sm:ml-auto"
            >
              <span className="sr-only">{search ? "검색 결과 " : "전체 "}</span>
              {results.length.toLocaleString("ko-KR")}개 계정
            </p>
          </div>
          {results.length === 0 ? (
            <EmptyState title="검색 결과가 없습니다" />
          ) : (
            <ul className="lens-panel divide-y divide-border p-1.5">
              {results.map((contact) => {
                const time = relativeTime(contact.latest.timestamp);

                return (
                  <li key={contact.username}>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        trigger.current = event.currentTarget;
                        setActiveContact({
                          username: contact.username,
                          open: true,
                        });
                      }}
                      className="group flex w-full items-center gap-3 rounded-md px-2.5 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-offset-0 sm:px-3.5"
                    >
                      <ContactAvatar username={contact.username} />
                      <span className="grid min-w-0 flex-1 gap-0.5">
                        <span className="truncate font-semibold">
                          @{contact.username}
                        </span>
                        <span className="truncate text-sm text-muted">
                          {contact.latest.text || "텍스트 없는 댓글"}
                        </span>
                      </span>
                      <span className="grid shrink-0 justify-items-end gap-0.5 text-xs text-muted tabular-nums">
                        {time ? (
                          <time
                            dateTime={contact.latest.timestamp ?? undefined}
                          >
                            {time}
                          </time>
                        ) : null}
                        <span>{`댓글 ${contact.comments.length.toLocaleString("ko-KR")}개`}</span>
                        {contact.privateReplies ? (
                          <span className="text-accent-ink">DM 발송</span>
                        ) : null}
                      </span>
                      <ChevronRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted transition-colors group-hover:text-fg"
                        strokeWidth={1.75}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      <Dialog.Root
        open={Boolean(selected && activeContact?.open)}
        onOpenChange={(open) => {
          setActiveContact((contact) => contact && { ...contact, open });
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="lens-overlay" />
          <Dialog.Content
            className="lens-sheet fixed inset-x-0 bottom-0 z-[55] max-h-[calc(100dvh_-_max(1rem,env(safe-area-inset-top)))] overflow-y-auto overscroll-contain rounded-b-none outline-none sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[calc(100dvh-3rem)] sm:w-[min(calc(100%_-_3rem),36rem)] sm:rounded-xl"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = trigger.current?.isConnected
                ? trigger.current
                : searchInput.current;
              target?.focus({ preventScroll: true });
            }}
          >
            {selected ? <ContactDetails contact={selected} /> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
