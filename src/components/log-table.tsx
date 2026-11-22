import { Check, X } from "lucide-react";
import { relativeTime } from "@/lib/hypeup/format";
import type { EventLogItem } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

export const LOG_TYPE_LABELS: Record<string, string> = {
  AUTH: "인증",
  WEBHOOK: "실시간 수신",
  MATCH: "룰 매칭",
  PUBLIC_REPLY: "공개 답글",
  PRIVATE_REPLY: "DM",
  HIDE: "숨김",
  DELETE: "삭제",
  ERROR: "오류",
};

export function LogTable({ logs }: { logs: EventLogItem[] }) {
  return (
    <ul className="lens-panel divide-y divide-border">
      {logs.map((log) => {
        const Status = log.success ? Check : X;
        return (
          <li key={log.id} className="flex items-start gap-3 px-4 py-3.5">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-full bg-surface-2",
                log.success ? "text-ok" : "text-danger",
              )}
            >
              <Status aria-hidden className="size-4" strokeWidth={2} />
              <span className="sr-only">{log.success ? "성공" : "실패"}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold">
                  {LOG_TYPE_LABELS[log.type] ?? log.type}
                </p>
                <time
                  dateTime={log.createdAt}
                  className="text-sm text-muted tabular-nums"
                >
                  {relativeTime(log.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-sm leading-6 break-words text-muted">
                {log.message}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
