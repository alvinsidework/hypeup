import { useState } from "react";
import { toast } from "sonner";
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

export function CommentThread({
  comment,
  thread,
  onChanged,
  onClose,
  idPrefix = "thread",
}: {
  comment: CommentItem;
  thread: CommentItem[];
  onChanged: () => void;
  onClose?: () => void;
  idPrefix?: string;
}) {
  const [reply, setReply] = useState("");
  const [dm, setDm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(label);
    try {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.error ?? copy.genericError);
        return;
      }
      toast.success("완료");
      onChanged();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div>
          <p className="text-[13px] font-medium">@{comment.igFromUsername ?? "unknown"}</p>
          <p className="mt-1 text-[12px] tabular-nums text-subtle">{relativeTime(comment.timestamp)}</p>
        </div>
        {onClose ? (
          <button type="button" className="h-10 px-2 text-[13px] text-muted" onClick={onClose}>
            닫기
          </button>
        ) : null}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {thread.map((item) => (
          <div key={item.id} className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px]">
              {initial(item.igFromUsername)}
            </span>
            <div>
              <p className="text-[12px] text-muted">@{item.igFromUsername ?? "unknown"}</p>
              <p className="mt-1 text-[14px] leading-6">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      <form
        className="space-y-3 border-t border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!reply.trim()) return;
          void run("reply", () => replyPublicFn({ data: { commentId: comment.id, message: reply.trim() } }));
        }}
      >
        <label className="block text-[12px] text-muted" htmlFor={`${idPrefix}-reply`}>
          {copy.replyPublic}
        </label>
        <textarea
          id={`${idPrefix}-reply`}
          value={reply}
          onChange={(event) => setReply(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] outline-none focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={busy !== null || !reply.trim()}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-fg text-[13px] font-medium text-bg transition-transform duration-200 active:scale-[0.99] disabled:opacity-50"
        >
          {busy === "reply" ? "보내는 중" : copy.replyPublic}
        </button>
      </form>

      <form
        className="space-y-3 px-4 pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!dm.trim()) return;
          void run("dm", () => sendDmFn({ data: { commentId: comment.id, message: dm.trim() } }));
        }}
      >
        <label className="block text-[12px] text-muted" htmlFor={`${idPrefix}-dm`}>
          {copy.sendDm}
        </label>
        <textarea
          id={`${idPrefix}-dm`}
          value={dm}
          onChange={(event) => setDm(event.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px] outline-none focus-visible:border-accent"
        />
        <button
          type="submit"
          disabled={busy !== null || !dm.trim() || comment.repliedPrivate}
          className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border text-[13px] font-medium transition-colors duration-200 hover:bg-surface-2 disabled:opacity-50"
        >
          {comment.repliedPrivate ? copy.dmDuplicate : busy === "dm" ? "보내는 중" : copy.sendDm}
        </button>
      </form>

      <div className="grid grid-cols-2 gap-2 px-4 pb-5">
        <button
          type="button"
          className="h-11 rounded-md border border-border text-[13px]"
          disabled={busy !== null}
          onClick={() =>
            void run("hide", () => hideCommentFn({ data: { commentId: comment.id, hidden: !comment.hidden } }))
          }
        >
          {comment.hidden ? copy.unhide : copy.hide}
        </button>
        <button
          type="button"
          className="h-11 rounded-md border border-border text-[13px] text-danger"
          disabled={busy !== null}
          onClick={() => {
            if (!window.confirm("이 댓글을 Instagram에서 삭제할까요?")) return;
            void run("delete", () => deleteCommentFn({ data: { commentId: comment.id } }));
          }}
        >
          {copy.delete}
        </button>
        <button
          type="button"
          className="col-span-2 h-11 rounded-md border border-border text-[13px]"
          disabled={busy !== null}
          onClick={() => void run("rule", () => runRuleFn({ data: { commentId: comment.id } }))}
        >
          {copy.runRule}
        </button>
      </div>
    </div>
  );
}
