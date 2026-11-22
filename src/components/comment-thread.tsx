import { useId, useState, type FormEvent } from "react";
import { Eye, EyeOff, LoaderCircle, Send, Trash2, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { LensConfirm } from "@/components/lens-confirm";
import { copy } from "@/lib/hypeup/copy";
import { initial, relativeTime } from "@/lib/hypeup/format";
import {
  deleteCommentFn,
  hideCommentFn,
  replyPublicFn,
  runRuleFn,
  sendDmFn,
} from "@/lib/hypeup/api";
import type { CommentItem } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

type Channel = "reply" | "dm";

const channels: [Channel, string][] = [
  ["reply", "공개 답글"],
  ["dm", "DM"],
];

export function CommentThread({
  comment,
  thread,
  onChanged,
  onClose,
}: {
  comment: CommentItem;
  thread: CommentItem[];
  onChanged: () => void;
  onClose?: () => void;
}) {
  const inputId = useId();
  const [channel, setChannel] = useState<Channel>("reply");
  const [drafts, setDrafts] = useState({ reply: "", dm: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const isDm = channel === "dm";
  const hasDm = isDm && comment.repliedPrivate;
  const sendLabel = isDm ? copy.sendDm : copy.replyPublic;
  const commentId = comment.id;

  async function run(
    label: string,
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
    onSuccess?: () => void,
  ) {
    setBusy(label);
    try {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? copy.genericError);
        return;
      }
      toast.success(result.message ?? "완료했습니다.");
      onSuccess?.();
      onChanged();
    } catch {
      toast.error(copy.genericError);
    } finally {
      setBusy(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = drafts[channel].trim();
    if (busy || !message || hasDm) return;
    const send = isDm ? sendDmFn : replyPublicFn;
    void run(
      channel,
      () => send({ data: { commentId, message } }),
      () => {
        setDrafts((current) => ({ ...current, [channel]: "" }));
      },
    );
  }

  return (
    <div className="min-w-0">
      <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 lg:static lg:rounded-t-lg">
        <div className="min-w-0">
          <p className="text-base font-semibold break-all">
            @{comment.igFromUsername ?? "unknown"}
          </p>
          <time
            dateTime={comment.timestamp ?? undefined}
            className="text-sm text-muted tabular-nums"
          >
            {relativeTime(comment.timestamp)}
          </time>
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="댓글 상세 닫기"
            className="lens-icon-button shrink-0"
            onClick={onClose}
          >
            <X aria-hidden className="size-5" />
          </button>
        ) : null}
      </div>

      <ul className="space-y-4 px-4 py-4 lg:max-h-72 lg:overflow-y-auto lg:overscroll-contain">
        {thread.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5">
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-muted"
            >
              {initial(item.igFromUsername)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium break-all text-muted">
                @{item.igFromUsername ?? "unknown"}
              </p>
              <p className="mt-0.5 text-[15px] leading-6 whitespace-pre-wrap break-words">
                {item.text}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <form className="space-y-3 border-t border-border p-4" onSubmit={submit}>
        <div
          className="grid grid-cols-2 rounded-full bg-surface-2 p-1"
          role="group"
          aria-label="응답 방식"
        >
          {channels.map(([value, label]) => (
            <button
              key={value}
              type="button"
              disabled={busy !== null}
              aria-pressed={channel === value}
              className={cn(
                "min-h-11 rounded-full text-sm font-semibold transition-colors duration-200",
                channel === value
                  ? "bg-surface text-fg shadow-sm"
                  : "text-muted hover:text-fg",
              )}
              onClick={() => setChannel(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {hasDm ? (
          <p className="rounded-md bg-surface-2 px-3 py-3 text-sm text-muted">
            {copy.dmDuplicate}
          </p>
        ) : (
          <>
            <label className="sr-only" htmlFor={inputId}>
              {sendLabel}
            </label>
            <textarea
              id={inputId}
              value={drafts[channel]}
              onChange={(event) =>
                setDrafts({ ...drafts, [channel]: event.target.value })
              }
              disabled={busy !== null}
              maxLength={1000}
              rows={3}
              placeholder={isDm ? "DM을 입력하세요" : "공개 답글을 입력하세요"}
              className="lens-field block w-full resize-y px-3.5 py-3 text-[16px]"
            />
            <button
              type="submit"
              disabled={busy !== null || !drafts[channel].trim()}
              className="lens-button lens-button-primary w-full"
            >
              {busy === channel ? (
                <LoaderCircle
                  aria-hidden
                  className="size-4 motion-safe:animate-spin"
                />
              ) : (
                <Send aria-hidden className="size-4" />
              )}
              {busy === channel ? "보내는 중" : sendLabel}
            </button>
          </>
        )}
      </form>

      <div className="flex flex-wrap gap-2 px-4 pb-4">
        <button
          type="button"
          className="lens-button lens-button-secondary flex-1"
          disabled={busy !== null}
          onClick={() =>
            void run("hide", () =>
              hideCommentFn({ data: { commentId, hidden: !comment.hidden } }),
            )
          }
        >
          {comment.hidden ? (
            <Eye aria-hidden className="size-4" />
          ) : (
            <EyeOff aria-hidden className="size-4" />
          )}
          {comment.hidden ? copy.unhide : copy.hide}
        </button>
        <LensConfirm
          title="댓글을 삭제할까요?"
          description="이 댓글을 Instagram에서도 삭제합니다."
          confirmLabel="댓글 삭제"
          onConfirm={() =>
            void run("delete", () => deleteCommentFn({ data: { commentId } }))
          }
        >
          <button
            type="button"
            className="lens-button lens-button-secondary flex-1 text-danger"
            disabled={busy !== null}
          >
            <Trash2 aria-hidden className="size-4" />
            {copy.delete}
          </button>
        </LensConfirm>
        <button
          type="button"
          className="lens-button lens-button-secondary basis-full"
          disabled={busy !== null}
          onClick={() =>
            void run("rule", () => runRuleFn({ data: { commentId } }))
          }
        >
          <Zap aria-hidden className="size-4" />
          {copy.runRule}
        </button>
      </div>
    </div>
  );
}
