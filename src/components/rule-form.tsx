import { useState } from "react";
import type { MediaItem, RuleItem } from "@/lib/hypeup/types";

export type RuleDraft = Omit<RuleItem, "updatedAt" | "sortOrder"> & { sortOrder?: number };

const EMPTY: RuleDraft = {
  id: "",
  name: "",
  enabled: true,
  scope: "ALL",
  mediaId: null,
  matchMode: "CONTAINS",
  keywords: [],
  excludeKeywords: [],
  publicReplies: [""],
  dmMessage: "",
  hideComment: false,
};

function ChipInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const value = draft.trim();
    if (!value || values.includes(value)) return;
    onChange([...values, value]);
    setDraft("");
  }
  return (
    <label className="block space-y-2">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            className="rounded-sm border border-border px-2 py-1 text-[12px]"
            onClick={() => onChange(values.filter((item) => item !== value))}
          >
            {value} ×
          </button>
        ))}
      </div>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
        className="h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px] outline-none focus-visible:border-accent"
      />
    </label>
  );
}

export function RuleForm({
  initial,
  media,
  onCancel,
  onSave,
}: {
  initial?: RuleItem | null;
  media: MediaItem[];
  onCancel: () => void;
  onSave: (draft: RuleDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<RuleDraft>(initial ?? EMPTY);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        void onSave({
          ...draft,
          publicReplies: draft.publicReplies.map((item) => item.trim()).filter(Boolean),
          dmMessage: draft.dmMessage?.trim() ? draft.dmMessage.trim() : null,
        }).finally(() => setBusy(false));
      }}
    >
      <label className="block space-y-2">
        <span className="text-[12px] text-muted">이름</span>
        <input
          required
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px] outline-none focus-visible:border-accent"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-[12px] text-muted">대상</span>
        <select
          value={draft.scope === "MEDIA" ? draft.mediaId ?? "MEDIA" : "ALL"}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "ALL") setDraft({ ...draft, scope: "ALL", mediaId: null });
            else setDraft({ ...draft, scope: "MEDIA", mediaId: value });
          }}
          className="h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px]"
        >
          <option value="ALL">모든 게시물</option>
          {media.map((item) => (
            <option key={item.id} value={item.id}>
              {(item.caption ?? item.id).slice(0, 40)}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2">
        <span className="text-[12px] text-muted">매칭</span>
        <select
          value={draft.matchMode}
          onChange={(event) =>
            setDraft({ ...draft, matchMode: event.target.value as RuleDraft["matchMode"] })
          }
          className="h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px]"
        >
          <option value="ANY">모든 댓글</option>
          <option value="CONTAINS">키워드 포함</option>
          <option value="EXACT">완전 일치</option>
          <option value="REGEX">정규식</option>
        </select>
      </label>

      {draft.matchMode !== "ANY" ? (
        <ChipInput
          label="키워드"
          values={draft.keywords}
          onChange={(keywords) => setDraft({ ...draft, keywords })}
          placeholder="Enter로 추가"
        />
      ) : null}

      <ChipInput
        label="제외 키워드"
        values={draft.excludeKeywords}
        onChange={(excludeKeywords) => setDraft({ ...draft, excludeKeywords })}
        placeholder="Enter로 추가"
      />

      <div className="space-y-2">
        <p className="text-[12px] text-muted">공개 대댓글 (줄마다 하나, 랜덤 발송)</p>
        {draft.publicReplies.map((line, index) => (
          <input
            key={index}
            value={line}
            onChange={(event) => {
              const publicReplies = [...draft.publicReplies];
              publicReplies[index] = event.target.value;
              setDraft({ ...draft, publicReplies });
            }}
            className="h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px]"
          />
        ))}
        {draft.publicReplies.length < 5 ? (
          <button
            type="button"
            className="text-[12px] text-muted"
            onClick={() => setDraft({ ...draft, publicReplies: [...draft.publicReplies, ""] })}
          >
            대댓글 추가
          </button>
        ) : null}
      </div>

      <label className="block space-y-2">
        <span className="text-[12px] text-muted">DM 본문 (비우면 DM 안 함)</span>
        <textarea
          value={draft.dmMessage ?? ""}
          onChange={(event) => setDraft({ ...draft, dmMessage: event.target.value })}
          rows={4}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px]"
        />
      </label>

      <label className="flex h-11 items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          checked={draft.hideComment}
          onChange={(event) => setDraft({ ...draft, hideComment: event.target.checked })}
        />
        댓글 숨김
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-md border border-border text-[13px]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy || !draft.name.trim()}
          className="h-11 flex-1 rounded-md bg-fg text-[13px] font-medium text-bg disabled:opacity-50"
        >
          {busy ? "저장 중" : "저장"}
        </button>
      </div>
    </form>
  );
}
