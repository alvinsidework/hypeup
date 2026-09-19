import { relativeTime } from "@/lib/hypeup/format";
import type { EventLogItem } from "@/lib/hypeup/types";

const TYPE_LABEL: Record<string, string> = {
  AUTH: "인증",
  WEBHOOK: "웹훅",
  MATCH: "매칭",
  PUBLIC_REPLY: "대댓글",
  PRIVATE_REPLY: "DM",
  HIDE: "숨김",
  DELETE: "삭제",
  ERROR: "오류",
};

export function LogTable({ logs }: { logs: EventLogItem[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-surface text-[11px] uppercase tracking-wide text-subtle">
          <tr>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium">유형</th>
            <th className="px-4 py-3 font-medium">메시지</th>
            <th className="px-4 py-3 font-medium">시간</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-surface">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-3">
                <span className={log.success ? "text-ok" : "text-danger"}>●</span>
              </td>
              <td className="px-4 py-3 text-muted">{TYPE_LABEL[log.type] ?? log.type}</td>
              <td className="px-4 py-3">{log.message}</td>
              <td className="px-4 py-3 tabular-nums text-subtle">{relativeTime(log.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
