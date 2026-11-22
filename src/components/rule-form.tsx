import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { Field, inputClass } from "@/components/lens-ui";
import { copy } from "@/lib/hypeup/copy";
import type { MatchMode, MediaItem, RuleItem } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

export type RuleDraft = Omit<RuleItem, "updatedAt" | "sortOrder"> & {
  sortOrder?: number;
};

export const MATCH_LABELS: Record<MatchMode, string> = {
  ANY: "모든 댓글",
  CONTAINS: "키워드 포함",
  EXACT: "완전 일치",
  REGEX: "정규식",
};

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
  followersOnly: false,
};

function splitKeywords(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function RuleSwitch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full border transition-colors duration-200",
          checked
            ? "border-transparent bg-accent"
            : "border-border bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 size-[18px] rounded-full shadow-sm transition-transform duration-200",
            checked ? "translate-x-5 bg-accent-fg" : "bg-muted",
          )}
        />
      </span>
    </button>
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
  const [keywordText, setKeywordText] = useState(
    (initial?.keywords ?? []).join(", "),
  );
  const [excludeText, setExcludeText] = useState(
    (initial?.excludeKeywords ?? []).join(", "),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const keywords = splitKeywords(keywordText);
    const excludeKeywords = splitKeywords(excludeText);
    if (draft.matchMode !== "ANY" && keywords.length === 0) {
      setError("키워드를 쉼표로 구분해 입력하세요. 예: 가격, 얼마");
      return;
    }
    if (keywords.length > 20 || excludeKeywords.length > 20) {
      setError("키워드와 제외 키워드는 각각 20개까지 입력할 수 있습니다.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        keywords,
        excludeKeywords,
        publicReplies: draft.publicReplies
          .map((item) => item.trim())
          .filter(Boolean),
        dmMessage: draft.dmMessage?.trim() || null,
      });
    } catch {
      setError(copy.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6"
    >
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <section aria-labelledby="rule-conditions">
          <h3
            id="rule-conditions"
            className="text-lg font-semibold tracking-tight"
          >
            댓글 조건
          </h3>
          <Field label="룰 이름">
            <input
              required
              maxLength={80}
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder="예: 가격 안내"
              className={inputClass}
            />
          </Field>

          <div className="grid sm:grid-cols-2 sm:gap-x-3">
            <Field label="대상 게시물">
              <select
                value={
                  draft.scope === "MEDIA" ? (draft.mediaId ?? "MEDIA") : "ALL"
                }
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft({
                    ...draft,
                    scope: value === "ALL" ? "ALL" : "MEDIA",
                    mediaId: value === "ALL" ? null : value,
                  });
                }}
                className={inputClass}
              >
                <option value="ALL">모든 게시물</option>
                {draft.scope === "MEDIA" &&
                !media.some((item) => item.id === draft.mediaId) ? (
                  <option value={draft.mediaId ?? "MEDIA"}>
                    이전 선택 게시물
                  </option>
                ) : null}
                {media.map((item) => (
                  <option key={item.id} value={item.id}>
                    {(item.caption ?? item.id).slice(0, 40)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="일치 방식">
              <select
                value={draft.matchMode}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    matchMode: event.target.value as MatchMode,
                  })
                }
                className={inputClass}
              >
                {Object.entries(MATCH_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {draft.matchMode !== "ANY" ? (
            <Field label="키워드 (쉼표로 구분)">
              <input
                value={keywordText}
                onChange={(event) => setKeywordText(event.target.value)}
                placeholder="예: 가격, 얼마, 링크"
                className={inputClass}
              />
            </Field>
          ) : null}
          <Field label="제외 키워드 (선택)">
            <input
              value={excludeText}
              onChange={(event) => setExcludeText(event.target.value)}
              placeholder="쉼표로 구분"
              className={inputClass}
            />
          </Field>
        </section>

        <section
          aria-labelledby="rule-messages"
          className="border-t border-border pt-5"
        >
          <h3
            id="rule-messages"
            className="text-lg font-semibold tracking-tight"
          >
            응답 메시지
          </h3>
          <p className="mt-3 text-sm font-medium text-muted">공개 대댓글</p>
          <p className="mt-1 text-sm text-muted">
            여러 개를 입력하면 그중 하나를 골라 보냅니다.
          </p>
          {draft.publicReplies.map((line, index) => (
            <div key={index} className="mt-2 flex items-center gap-2">
              <input
                aria-label={`공개 대댓글 ${index + 1}`}
                value={line}
                onChange={(event) => {
                  const publicReplies = [...draft.publicReplies];
                  publicReplies[index] = event.target.value;
                  setDraft({ ...draft, publicReplies });
                }}
                className="lens-field"
              />
              <button
                type="button"
                aria-label={`공개 대댓글 ${index + 1} 지우기`}
                className="lens-icon-button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    publicReplies: draft.publicReplies.filter(
                      (_, current) => current !== index,
                    ),
                  })
                }
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ))}
          {draft.publicReplies.length < 5 ? (
            <button
              type="button"
              className="lens-button lens-button-quiet mt-1 min-h-11 px-1 text-accent-ink"
              onClick={() =>
                setDraft({
                  ...draft,
                  publicReplies: [...draft.publicReplies, ""],
                })
              }
            >
              <Plus aria-hidden className="size-4" /> 대댓글 추가
            </button>
          ) : null}
          <Field label="DM 본문 (선택)">
            <textarea
              value={draft.dmMessage ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, dmMessage: event.target.value })
              }
              rows={3}
              className={cn(inputClass, "block resize-y")}
            />
          </Field>
        </section>

        <div className="divide-y divide-border rounded-md bg-surface-2 px-3.5">
          <div className="flex min-h-14 items-center justify-between gap-4">
            <span className="text-sm font-semibold">댓글 숨김</span>
            <RuleSwitch
              label="댓글 숨김"
              checked={draft.hideComment}
              onChange={(hideComment) => setDraft({ ...draft, hideComment })}
            />
          </div>
          <div className="flex items-start justify-between gap-4 py-2">
            <div className="min-w-0 py-2">
              <p className="text-sm font-semibold">팔로워에게만</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                한 번 확인된 팔로워는 바로 받습니다. 처음 보는 사람은 안내 받기
                버튼을 누른 뒤 확인을 거칩니다.
              </p>
            </div>
            <RuleSwitch
              label="팔로워에게만"
              checked={draft.followersOnly}
              onChange={(followersOnly) =>
                setDraft({ ...draft, followersOnly })
              }
            />
          </div>
        </div>
      </fieldset>
      {error ? (
        <p className="mt-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="lens-button lens-button-secondary"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy || !draft.name.trim()}
          className="lens-button lens-button-primary"
        >
          {busy ? "저장 중" : "저장"}
        </button>
      </div>
    </form>
  );
}
