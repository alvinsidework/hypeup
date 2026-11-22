import { useState, type ReactNode } from "react";
import { ArrowDown, Check, ShieldCheck } from "lucide-react";
import { Field, inputClass } from "@/components/lens-ui";
import { copy } from "@/lib/hypeup/copy";
import { getFollowerMessages } from "@/lib/hypeup/rule-messages";
import type { RuleItem } from "@/lib/hypeup/types";
import { matchRule } from "@/lib/instagram/engine";
import { cn } from "@/lib/utils";

function MessageStep({
  title,
  children,
  button,
}: {
  title: string;
  children: ReactNode;
  button?: string;
}) {
  return (
    <li className="lens-panel px-4 py-3.5">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 rounded-[18px] bg-surface-2 px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap [overflow-wrap:anywhere]">
        {children}
      </p>
      {button ? (
        <p className="mt-2 rounded-md border border-border px-3 py-2 text-center text-sm font-medium text-accent-ink">
          {button}
        </p>
      ) : null}
    </li>
  );
}

export function RuleDraftPreview({ rule }: { rule: RuleItem }) {
  const [sample, setSample] = useState(
    rule.matchMode === "EXACT"
      ? (rule.keywords[0] ?? "")
      : rule.matchMode === "CONTAINS" && rule.keywords[0]
        ? `${rule.keywords[0]} 알려주세요`
        : "",
  );
  const [test, setTest] = useState<"matched" | "unmatched" | "invalid" | null>(
    null,
  );
  const [knownFollower, setKnownFollower] = useState(false);
  const followerMessages = getFollowerMessages(rule);
  const hasReply = rule.publicReplies.length > 0;
  const hasActions = rule.hideComment || hasReply || Boolean(rule.dmMessage);
  const hasGate = rule.followersOnly && (hasReply || Boolean(rule.dmMessage));
  const showGate = hasGate && !knownFollower;

  function runTest() {
    const result = matchRule(
      [{ ...rule, enabled: true }],
      {
        id: "draft-preview",
        text: sample.trim(),
        mediaId: rule.mediaId ?? "draft-media",
      },
      { igUserId: "draft-preview-owner", username: "draft-preview-owner" },
    );
    setTest(
      result.skippedInvalidRegex
        ? "invalid"
        : result.rule
          ? "matched"
          : "unmatched",
    );
  }

  return (
    <div className="grid gap-6">
      <section className="lens-panel p-4 sm:p-5">
        <h3 className="font-semibold tracking-tight">댓글 테스트</h3>
        <p className="mt-1 text-sm leading-6 text-muted">
          저장하기 전의 설정으로 일치 여부를 확인할 수 있어요. 실제 답글이나
          DM은 발송되지 않습니다.
        </p>
        <Field label="예시 댓글">
          <input
            className={inputClass}
            value={sample}
            onChange={(event) => {
              setSample(event.target.value);
              setTest(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (sample.trim()) runTest();
            }}
            maxLength={500}
            placeholder="예: 가격 알려주세요"
          />
        </Field>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="lens-button lens-button-secondary"
            disabled={!sample.trim()}
            onClick={runTest}
          >
            조건 확인
          </button>
          {test ? (
            <p
              role="status"
              className={cn(
                "flex items-center gap-1.5 text-sm font-medium",
                test === "matched" ? "text-ok" : "text-muted",
              )}
            >
              {test === "matched" ? (
                <Check className="size-4" aria-hidden />
              ) : null}
              {test === "matched"
                ? "댓글 조건에 일치해요."
                : test === "invalid"
                  ? "정규식 형식을 확인해 주세요."
                  : "댓글 조건에 일치하지 않아요."}
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="draft-flow">
        <div className="mb-3">
          <h3 id="draft-flow" className="text-lg font-semibold tracking-tight">
            응답 순서
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            댓글 조건에 맞았을 때 방문자가 받는 안내입니다.
          </p>
          {!rule.enabled ? (
            <p className="mt-1 text-sm font-medium text-muted">
              이 룰은 일시정지 상태입니다.
            </p>
          ) : null}
        </div>

        {hasGate ? (
          <div
            className="mb-3 grid grid-cols-2 gap-1 rounded-md bg-surface-2 p-1"
            aria-label="방문자 상태"
          >
            {(
              [
                ["처음 보는 방문자", false],
                ["확인된 팔로워", true],
              ] as const
            ).map(([label, known]) => (
              <button
                key={label}
                type="button"
                aria-pressed={knownFollower === known}
                onClick={() => setKnownFollower(known)}
                className={cn(
                  "min-h-11 rounded-[11px] px-2 text-sm font-semibold transition-colors",
                  knownFollower === known
                    ? "bg-surface text-fg shadow-sm"
                    : "text-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {hasActions ? (
          <ol className="space-y-2">
            {rule.hideComment ? (
              <li className="lens-panel px-4 py-3.5 text-sm font-medium">
                댓글 숨김
              </li>
            ) : null}
            {showGate ? (
              <>
                <MessageStep
                  title="첫 안내 DM"
                  button={followerMessages.buttonLabel}
                >
                  {followerMessages.openingMessage}
                </MessageStep>
                <li className="rounded-md border border-border bg-surface-2 p-3.5 text-sm leading-6 text-muted">
                  <span className="flex items-center gap-2 font-semibold text-fg">
                    <ShieldCheck className="size-4 shrink-0" aria-hidden />{" "}
                    팔로워 확인
                  </span>
                  <p className="mt-1">
                    버튼을 누르면 확인하고, 아직 팔로우하지 않았다면 아래 안내를
                    보냅니다.
                  </p>
                  <p className="mt-2 rounded-md bg-surface px-3 py-2 whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {followerMessages.reminderMessage}
                  </p>
                </li>
                <li className="flex items-center gap-1.5 px-1 pt-1 text-sm font-medium text-muted">
                  <ArrowDown className="size-4 shrink-0" aria-hidden /> 팔로워로
                  확인되면
                </li>
              </>
            ) : hasGate ? (
              <li className="px-1 text-sm leading-6 text-muted">
                팔로우가 유지되면 아래 응답을 바로 보냅니다.
              </li>
            ) : null}
            {hasReply ? (
              <MessageStep
                title={
                  rule.publicReplies.length > 1
                    ? "공개 대댓글 · 예시 1개"
                    : "공개 대댓글"
                }
              >
                {rule.publicReplies[0]}
              </MessageStep>
            ) : null}
            {rule.dmMessage ? (
              <MessageStep title="최종 DM">{rule.dmMessage}</MessageStep>
            ) : showGate && hasReply ? (
              <MessageStep title="답글 완료 안내 DM">
                {copy.followerPublicOnly}
              </MessageStep>
            ) : null}
          </ol>
        ) : (
          <p className="lens-panel px-4 py-6 text-sm leading-6 text-muted">
            공개 대댓글, DM 또는 댓글 숨김을 설정하면 여기에 표시됩니다.
          </p>
        )}
      </section>
    </div>
  );
}
