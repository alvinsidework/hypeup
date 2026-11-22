import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Check, ImageIcon, Link2, Plus, X } from "lucide-react";
import { Field, inputClass } from "@/components/lens-ui";
import { mediaTypeLabel } from "@/components/media-grid";
import { MediaPreview } from "@/components/media-preview";
import { RuleDraftPreview } from "@/components/rule-draft-preview";
import { copy } from "@/lib/hypeup/copy";
import {
  DM_TEXT_LIMIT,
  FOLLOW_BUTTON_LABEL_LIMIT,
  dmTextBytes,
  getFollowerMessages,
} from "@/lib/hypeup/rule-messages";
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

const keywordPresets = ["가격", "링크", "구매", "문의"];
const recentMediaCount = 4;
const tabClass =
  "min-h-11 rounded-[11px] px-2 text-sm font-semibold text-muted transition-colors data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-sm";

function splitKeywords(value: string): string[] {
  return value
    .split(/[,，\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeMessage(value?: string | null, original?: string | null) {
  return value && value === original ? original : value?.trim() || null;
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

function MediaChooser({
  media,
  selectedId,
  onSelect,
}: {
  media: MediaItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const selected = selectedId
    ? media.find((item) => item.id === selectedId)
    : undefined;
  const recentMedia = media.slice(0, recentMediaCount);
  if (!showAll && selected && !recentMedia.includes(selected)) {
    recentMedia[recentMedia.length - 1] = selected;
  }
  const search = query.trim().toLowerCase();
  const visibleMedia = showAll
    ? media.filter((item) =>
        (item.caption ?? "").toLowerCase().includes(search),
      )
    : recentMedia;

  return (
    <div className="mt-3">
      {selectedId && !selected ? (
        <p className="mb-2.5 flex min-h-12 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-sm font-medium text-muted">
          <ImageIcon className="size-4 shrink-0" aria-hidden /> 이전에 선택한
          게시물
        </p>
      ) : null}
      {showAll ? (
        <Field label="게시물 검색">
          <input
            type="search"
            className={inputClass}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="캡션으로 검색"
          />
        </Field>
      ) : null}
      {visibleMedia.length ? (
        <div
          className={cn(
            "grid grid-cols-2 gap-2.5 sm:grid-cols-4",
            showAll && "mt-3",
          )}
          role="group"
          aria-label="게시물 선택"
        >
          {visibleMedia.map((item) => {
            const isSelected = item.id === selectedId;
            const caption = item.caption?.trim() || "캡션 없는 게시물";
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                className={cn(
                  "relative min-w-0 rounded-md border p-1.5 text-left transition-colors",
                  isSelected
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-surface hover:bg-surface-2",
                )}
                onClick={() => onSelect(item.id)}
              >
                <span className="relative block overflow-hidden rounded-lg">
                  <MediaPreview media={item} />
                  {isSelected ? (
                    <span
                      className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-fg"
                      aria-hidden
                    >
                      <Check className="size-3.5" />
                    </span>
                  ) : null}
                </span>
                <span
                  className="mt-1.5 block truncate px-0.5 text-sm font-medium"
                  title={caption}
                >
                  {caption}
                </span>
                <span className="block px-0.5 text-sm text-muted">
                  {mediaTypeLabel(item.mediaType)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md bg-surface-2 px-3 py-3 text-sm leading-6 text-muted">
          {search
            ? "검색 결과가 없어요."
            : "게시물 화면에서 Instagram 게시물을 먼저 가져와 주세요."}
        </p>
      )}
      {media.length > recentMediaCount ? (
        <button
          type="button"
          className="lens-button lens-button-quiet mt-1"
          aria-expanded={showAll}
          onClick={() => {
            setShowAll(!showAll);
            setQuery("");
          }}
        >
          {showAll
            ? "최근 게시물만 보기"
            : `게시물 전체 보기 (${media.length})`}
        </button>
      ) : null}
    </div>
  );
}

function TogglePanel({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-3.5 sm:px-4">
      <div className="flex min-h-14 items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <RuleSwitch label={label} checked={checked} onChange={onChange} />
      </div>
      {checked ? (
        <div className="border-t border-border pb-3.5">{children}</div>
      ) : null}
    </div>
  );
}

function MessageField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const id = useId();
  const bytes = dmTextBytes(value);
  const overLimit = bytes > DM_TEXT_LIMIT;
  return (
    <div className="mt-3.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-describedby={`${id}-count`}
        className={cn(
          inputClass,
          "block resize-y",
          overLimit && "border-danger",
        )}
      />
      <div
        id={`${id}-count`}
        className="mt-1.5 flex flex-wrap justify-end gap-x-3 gap-y-0.5 text-sm"
      >
        {hint ? <span className="mr-auto text-muted">{hint}</span> : null}
        <span className={overLimit ? "text-danger" : "text-muted"}>
          {bytes.toLocaleString("ko-KR")} /{" "}
          {DM_TEXT_LIMIT.toLocaleString("ko-KR")}바이트
        </span>
      </div>
    </div>
  );
}

function LinkComposer({ onInsert }: { onInsert: (text: string) => void }) {
  const [address, setAddress] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState(false);
  const addressInput = useRef<HTMLInputElement>(null);

  function insert() {
    try {
      const url = new URL(address.trim());
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      ) {
        setError(true);
        return;
      }
      onInsert([label.trim(), url.href].filter(Boolean).join("\n"));
      setAddress("");
      setLabel("");
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <details className="mt-2.5 rounded-md bg-surface-2 px-3 pb-1">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <Link2 className="size-4" aria-hidden /> 본문에 링크 추가
      </summary>
      <div className="space-y-2.5 border-t border-border pb-2.5">
        <Field label="링크 이름 (선택)">
          <input
            className={inputClass}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
              event.preventDefault();
              addressInput.current?.focus();
            }}
            maxLength={80}
            placeholder="예: 상품 보기"
          />
        </Field>
        <Field label="링크 주소">
          <input
            ref={addressInput}
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className={inputClass}
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                insert();
              }
            }}
            placeholder="https://"
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            http:// 또는 https://로 시작하는 주소를 입력해 주세요.
          </p>
        ) : null}
        <button
          type="button"
          disabled={!address.trim()}
          className="lens-button lens-button-secondary bg-surface"
          onClick={insert}
        >
          DM 본문에 넣기
        </button>
      </div>
    </details>
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
  const [tab, setTab] = useState("edit");
  const [keywordText, setKeywordText] = useState(
    initial?.matchMode === "REGEX" ? "" : (initial?.keywords ?? []).join(", "),
  );
  const [regexText, setRegexText] = useState(
    initial?.matchMode === "REGEX" ? (initial.keywords[0] ?? "") : "",
  );
  const [excludeText, setExcludeText] = useState(
    (initial?.excludeKeywords ?? []).join(", "),
  );
  const [replyEnabled, setReplyEnabled] = useState(() =>
    Boolean(initial?.publicReplies.some((item) => item.trim())),
  );
  const [dmEnabled, setDmEnabled] = useState(() =>
    Boolean(initial?.dmMessage?.trim()),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inProgress = useRef(false);
  const selectedKeywords = splitKeywords(keywordText);
  const keywords =
    draft.matchMode === "REGEX"
      ? [regexText.trim()].filter(Boolean)
      : selectedKeywords;
  const excludeKeywords = splitKeywords(excludeText);
  const followerMessages = getFollowerMessages(draft);
  const normalized: RuleDraft = {
    ...draft,
    name: draft.name.trim(),
    mediaId: draft.scope === "ALL" ? null : draft.mediaId,
    keywords,
    excludeKeywords,
    publicReplies: replyEnabled
      ? draft.publicReplies.map((item) => item.trim()).filter(Boolean)
      : [],
    dmMessage: dmEnabled
      ? normalizeMessage(draft.dmMessage, initial?.dmMessage)
      : null,
    followOpeningMessage: normalizeMessage(
      draft.followOpeningMessage,
      initial?.followOpeningMessage,
    ),
    followReminderMessage: normalizeMessage(
      draft.followReminderMessage,
      initial?.followReminderMessage,
    ),
    followButtonLabel: draft.followButtonLabel?.trim() || null,
  };

  function patch(value: Partial<RuleDraft>) {
    setDraft((current) => ({ ...current, ...value }));
    if (error) setError(null);
  }

  function invalid(message: string) {
    setTab("edit");
    setError(message);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inProgress.current) return;
    if (normalized.scope === "MEDIA" && !normalized.mediaId) {
      invalid("자동화를 적용할 게시물을 선택하세요.");
      return;
    }
    if (draft.matchMode !== "ANY" && !keywords.length) {
      invalid(
        draft.matchMode === "REGEX"
          ? "정규식을 입력하세요."
          : "키워드를 한 개 이상 입력하세요.",
      );
      return;
    }
    if (keywords.length > 20 || excludeKeywords.length > 20) {
      invalid("키워드와 제외 키워드는 각각 20개까지 입력할 수 있습니다.");
      return;
    }
    if (draft.matchMode === "REGEX") {
      try {
        new RegExp(keywords[0], "i");
      } catch {
        invalid("정규식 형식을 확인해 주세요.");
        return;
      }
    }
    if (replyEnabled && !normalized.publicReplies.length) {
      invalid("보낼 공개 대댓글을 입력하세요.");
      return;
    }
    if (dmEnabled && !normalized.dmMessage) {
      invalid("보낼 DM 본문을 입력하세요.");
      return;
    }
    const messageFields = [
      [normalized.dmMessage, initial?.dmMessage],
      [normalized.followOpeningMessage, initial?.followOpeningMessage],
      [normalized.followReminderMessage, initial?.followReminderMessage],
    ] as const;
    if (
      messageFields.some(
        ([next, previous]) =>
          next && next !== previous && dmTextBytes(next) > DM_TEXT_LIMIT,
      )
    ) {
      invalid(
        `DM 본문은 ${DM_TEXT_LIMIT.toLocaleString("ko-KR")}바이트까지 입력할 수 있습니다.`,
      );
      return;
    }
    setError(null);
    setBusy(true);
    inProgress.current = true;
    try {
      await onSave(normalized);
    } catch {
      setError(copy.genericError);
    } finally {
      inProgress.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex min-h-0 flex-1 flex-col"
      aria-busy={busy}
    >
      <Tabs.Root
        value={tab}
        onValueChange={setTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        <Tabs.List
          className="grid shrink-0 grid-cols-2 gap-1.5 border-b border-border px-4 py-2.5 sm:px-6"
          aria-label="자동화 편집 화면"
        >
          <div className="col-span-2 grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
            <Tabs.Trigger value="edit" className={tabClass}>
              설정
            </Tabs.Trigger>
            <Tabs.Trigger value="preview" className={tabClass}>
              미리보기
            </Tabs.Trigger>
          </div>
        </Tabs.List>
        <Tabs.Content
          value="edit"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
        >
          <fieldset disabled={busy} className="min-w-0 space-y-6">
            <section aria-labelledby="rule-conditions">
              <h3
                id="rule-conditions"
                className="text-lg font-semibold tracking-tight"
              >
                댓글이 달리는 곳
              </h3>
              <Field label="룰 이름">
                <input
                  required
                  maxLength={80}
                  value={draft.name}
                  onChange={(event) => patch({ name: event.target.value })}
                  placeholder="예: 가격 안내"
                  className={inputClass}
                />
              </Field>
              <div className="mt-4">
                <p className="text-sm font-medium text-muted">대상 게시물</p>
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1">
                  {(
                    [
                      ["ALL", "모든 게시물"],
                      ["MEDIA", "특정 게시물"],
                    ] as const
                  ).map(([scope, label]) => (
                    <button
                      key={scope}
                      type="button"
                      aria-pressed={draft.scope === scope}
                      className={cn(
                        "min-h-11 rounded-[11px] px-2 text-sm font-semibold transition-colors",
                        draft.scope === scope
                          ? "bg-surface text-fg shadow-sm"
                          : "text-muted",
                      )}
                      onClick={() => patch({ scope })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {draft.scope === "MEDIA" ? (
                  <MediaChooser
                    media={media}
                    selectedId={draft.mediaId}
                    onSelect={(mediaId) => patch({ mediaId })}
                  />
                ) : null}
              </div>
            </section>

            <section
              aria-labelledby="rule-keywords"
              className="border-t border-border pt-5"
            >
              <h3
                id="rule-keywords"
                className="text-lg font-semibold tracking-tight"
              >
                어떤 댓글에 응답할까요?
              </h3>
              <Field label="일치 방식">
                <select
                  value={draft.matchMode}
                  onChange={(event) =>
                    patch({ matchMode: event.target.value as MatchMode })
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
              {draft.matchMode === "REGEX" ? (
                <Field label="정규식 패턴">
                  <input
                    value={regexText}
                    onChange={(event) => {
                      setRegexText(event.target.value);
                      setError(null);
                    }}
                    placeholder="예: ^링크\\s?주세요$"
                    className={inputClass}
                  />
                </Field>
              ) : draft.matchMode !== "ANY" ? (
                <>
                  <Field label="키워드 (쉼표로 구분)">
                    <input
                      value={keywordText}
                      onChange={(event) => {
                        setKeywordText(event.target.value);
                        setError(null);
                      }}
                      placeholder="예: 가격, 링크"
                      className={inputClass}
                    />
                  </Field>
                  <div
                    className="mt-2 flex flex-wrap gap-1.5"
                    aria-label="키워드 예시"
                  >
                    {keywordPresets.map((keyword) => {
                      const present = selectedKeywords.includes(keyword);
                      return (
                        <button
                          key={keyword}
                          type="button"
                          className={cn(
                            "lens-button min-h-11 rounded-full px-3",
                            present
                              ? "bg-accent-soft text-accent-ink"
                              : "lens-button-secondary",
                          )}
                          disabled={present || selectedKeywords.length >= 20}
                          onClick={() => {
                            setKeywordText(
                              [...selectedKeywords, keyword].join(", "),
                            );
                            setError(null);
                          }}
                        >
                          {present ? (
                            <Check aria-hidden className="size-3.5" />
                          ) : (
                            <Plus aria-hidden className="size-3.5" />
                          )}
                          {keyword}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}
              <Field label="제외 키워드 (선택)">
                <input
                  value={excludeText}
                  onChange={(event) => {
                    setExcludeText(event.target.value);
                    setError(null);
                  }}
                  placeholder="쉼표로 구분"
                  className={inputClass}
                />
              </Field>
            </section>

            <section
              aria-labelledby="rule-messages"
              className="space-y-2.5 border-t border-border pt-5"
            >
              <h3
                id="rule-messages"
                className="mb-3 text-lg font-semibold tracking-tight"
              >
                무엇을 보낼까요?
              </h3>
              <TogglePanel
                label="공개 대댓글 보내기"
                checked={replyEnabled}
                onChange={(checked) => {
                  setReplyEnabled(checked);
                  setError(null);
                  if (checked && !draft.publicReplies.length)
                    patch({ publicReplies: [""] });
                }}
              >
                <p className="mt-3 text-sm leading-6 text-muted">
                  여러 개를 입력하면 보낼 때 하나를 골라요.
                </p>
                {draft.publicReplies.map((line, index) => (
                  <div key={index} className="mt-2 flex items-center gap-2">
                    <input
                      aria-label={`공개 대댓글 ${index + 1}`}
                      value={line}
                      onChange={(event) =>
                        patch({
                          publicReplies: draft.publicReplies.map(
                            (current, row) =>
                              row === index ? event.target.value : current,
                          ),
                        })
                      }
                      className="lens-field"
                    />
                    <button
                      type="button"
                      aria-label={`공개 대댓글 ${index + 1} 지우기`}
                      className="lens-icon-button"
                      onClick={() =>
                        patch({
                          publicReplies: draft.publicReplies.filter(
                            (_, row) => row !== index,
                          ),
                        })
                      }
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </div>
                ))}
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  {draft.publicReplies.length < 5 ? (
                    <button
                      type="button"
                      className="lens-button lens-button-quiet min-h-11 px-1 text-accent-ink"
                      onClick={() =>
                        patch({ publicReplies: [...draft.publicReplies, ""] })
                      }
                    >
                      <Plus aria-hidden className="size-4" /> 대댓글 추가
                    </button>
                  ) : null}
                  <p className="ml-auto text-sm text-muted">
                    {draft.publicReplies.length} / 5개
                  </p>
                </div>
              </TogglePanel>

              <TogglePanel
                label="팔로워에게만"
                checked={draft.followersOnly}
                onChange={(followersOnly) => patch({ followersOnly })}
              >
                <p className="mt-3 text-sm leading-6 text-muted">
                  확인된 팔로워에게는 바로 응답합니다. 처음 보는 방문자는 첫
                  안내 DM의 버튼을 눌러 확인할 수 있어요.
                </p>
                <MessageField
                  label="첫 안내 DM"
                  value={draft.followOpeningMessage ?? ""}
                  onChange={(followOpeningMessage) =>
                    patch({ followOpeningMessage })
                  }
                  placeholder={followerMessages.openingMessage}
                  hint="비워두면 기본 안내를 보냅니다."
                />
                <Field label="팔로워 확인 버튼 문구">
                  <input
                    value={draft.followButtonLabel ?? ""}
                    onChange={(event) =>
                      patch({ followButtonLabel: event.target.value })
                    }
                    maxLength={FOLLOW_BUTTON_LABEL_LIMIT}
                    className={inputClass}
                    placeholder={copy.followerButton}
                  />
                </Field>
                <p className="mt-1.5 text-right text-sm text-muted">
                  {draft.followButtonLabel?.length ?? 0} /{" "}
                  {FOLLOW_BUTTON_LABEL_LIMIT}자
                </p>
                <MessageField
                  label="팔로우가 확인되지 않았을 때"
                  value={draft.followReminderMessage ?? ""}
                  onChange={(followReminderMessage) =>
                    patch({ followReminderMessage })
                  }
                  placeholder={followerMessages.reminderMessage}
                  hint="비워두면 기본 안내를 보냅니다."
                />
              </TogglePanel>

              <TogglePanel
                label="최종 DM 보내기"
                checked={dmEnabled}
                onChange={(checked) => {
                  setDmEnabled(checked);
                  setError(null);
                }}
              >
                <MessageField
                  label="보낼 메시지"
                  value={draft.dmMessage ?? ""}
                  onChange={(dmMessage) => patch({ dmMessage })}
                  placeholder="예: 요청하신 링크를 보내드려요."
                />
                <LinkComposer
                  onInsert={(text) => {
                    patch({
                      dmMessage: [draft.dmMessage?.trim(), text]
                        .filter(Boolean)
                        .join("\n\n"),
                    });
                  }}
                />
              </TogglePanel>

              <div className="flex min-h-14 items-center justify-between gap-3 rounded-md bg-surface-2 px-3.5">
                <span className="text-sm font-semibold">댓글 숨김</span>
                <RuleSwitch
                  label="댓글 숨김"
                  checked={draft.hideComment}
                  onChange={(hideComment) => patch({ hideComment })}
                />
              </div>
            </section>
          </fieldset>
        </Tabs.Content>
        <Tabs.Content
          value="preview"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
        >
          <RuleDraftPreview
            rule={{
              ...normalized,
              updatedAt: initial?.updatedAt ?? "",
              sortOrder: normalized.sortOrder ?? 0,
            }}
          />
        </Tabs.Content>
      </Tabs.Root>
      <div className="shrink-0 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        {error ? (
          <p className="mb-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="grid grid-cols-[1fr_1.5fr] gap-2">
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
            disabled={busy || !normalized.name}
            className="lens-button lens-button-primary"
          >
            {busy ? "저장 중" : "저장"}
          </button>
        </div>
      </div>
    </form>
  );
}
