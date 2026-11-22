import { useMemo, useState } from "react";
import { FlaskConical } from "lucide-react";
import { Field, inputClass } from "@/components/lens-ui";
import { getFollowerMessages } from "@/lib/hypeup/rule-messages";
import { matchRule } from "@/lib/instagram/engine";
import type { MediaItem, RuleItem } from "@/lib/hypeup/types";

export function RuleSimulator({
  rules,
  media,
  username,
  igUserId,
}: {
  rules: RuleItem[];
  media: MediaItem[];
  username: string;
  igUserId: string;
}) {
  const [text, setText] = useState("가격 알려주세요");
  const [mediaId, setMediaId] = useState(media[0]?.id ?? "");
  const preview = useMemo(
    () =>
      matchRule(
        rules,
        {
          id: "sim",
          text,
          mediaId,
          igFromId: "visitor",
          igFromUsername: "visitor",
        },
        { igUserId, username },
      ),
    [rules, text, mediaId, igUserId, username],
  );
  const matched = preview.rule;
  const followerRule = matched?.followersOnly
    ? rules.find((rule) => rule.id === matched.id)
    : undefined;

  return (
    <section className="lens-panel p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
          <FlaskConical aria-hidden className="size-[18px]" strokeWidth={1.7} />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">룰 테스트</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">
        예시 댓글을 입력하면 적용될 룰을 보여줍니다. 실제 메시지는 보내지
        않습니다.
      </p>
      <Field label="테스트 댓글">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          className={`${inputClass} block resize-y`}
        />
      </Field>
      {media.length ? (
        <Field label="게시물">
          <select
            value={mediaId}
            onChange={(event) => setMediaId(event.target.value)}
            className={inputClass}
          >
            {media.map((item) => (
              <option key={item.id} value={item.id}>
                {(item.caption ?? item.id).slice(0, 48)}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      <div
        className="mt-4 rounded-md bg-surface-2 p-3.5 text-sm leading-6 break-words"
        aria-live="polite"
      >
        {matched ? (
          <>
            <p className="font-semibold text-accent-ink">{matched.name}</p>
            <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
              <dt className="text-muted">대댓글</dt>
              <dd>{matched.publicReplies[0] ?? "없음"}</dd>
              <dt className="text-muted">DM</dt>
              <dd>{preview.dmMessage ?? "없음"}</dd>
            </dl>
            {matched.publicReplies.length > 1 ? (
              <p className="mt-2 text-muted">
                실제 발송 시 등록된 대댓글 중 하나를 골라 보냅니다.
              </p>
            ) : null}
            {followerRule ? (
              <p className="mt-2 text-muted">
                확인된 팔로워에게 바로 보내고, 처음 보는 방문자는 ‘
                {getFollowerMessages(followerRule).buttonLabel}’ 버튼을 누른 뒤
                확인합니다.
              </p>
            ) : null}
            {preview.hideComment ? (
              <p className="mt-2 text-danger">댓글을 숨깁니다.</p>
            ) : null}
          </>
        ) : (
          <p className="text-muted">일치하는 룰이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
