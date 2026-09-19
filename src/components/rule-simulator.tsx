import { useMemo, useState } from "react";
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
        { id: "sim", text, mediaId, igFromId: "visitor", igFromUsername: "visitor" },
        { igUserId, username },
      ),
    [rules, text, mediaId, igUserId, username],
  );

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="text-[13px] font-medium">시뮬레이터</h2>
      <p className="mt-1 text-[12px] text-muted">API를 호출하지 않고 어떤 룰이 매칭되는지 봅니다.</p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
        className="mt-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-[13px]"
      />
      {media.length > 0 ? (
        <select
          value={mediaId}
          onChange={(event) => setMediaId(event.target.value)}
          className="mt-2 h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px]"
        >
          {media.map((item) => (
            <option key={item.id} value={item.id}>
              {(item.caption ?? item.id).slice(0, 48)}
            </option>
          ))}
        </select>
      ) : null}
      <div className="mt-4 space-y-1 text-[13px]">
        {preview.rule ? (
          <>
            <p>
              매칭: <span className="text-ok">{preview.rule.name}</span>
            </p>
            <p className="text-muted">대댓글: {preview.publicReply ?? "없음"}</p>
            <p className="text-muted">DM: {preview.dmMessage ?? "없음"}</p>
            {preview.hideComment ? <p className="text-danger">댓글을 숨깁니다</p> : null}
          </>
        ) : (
          <p className="text-muted">매칭된 룰이 없습니다</p>
        )}
      </div>
    </section>
  );
}
