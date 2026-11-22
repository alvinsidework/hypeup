import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LOG_TYPE_LABELS, LogTable } from "@/components/log-table";
import { PageHeader } from "@/components/page-header";
import { copy } from "@/lib/hypeup/copy";
import { getLogsPage } from "@/lib/hypeup/api";
import type { EventLogItem } from "@/lib/hypeup/types";

export const Route = createFileRoute("/_app/logs")({
  loader: () => getLogsPage({ data: {} }),
  component: LogsPage,
});

function LogsPage() {
  const initial = Route.useLoaderData();
  const [type, setType] = useState("");
  const [logs, setLogs] = useState<EventLogItem[]>(initial.logs);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  async function load(next: string, append = false) {
    setLoading(true);
    try {
      const page = await getLogsPage({
        data: { type: next || undefined, offset: append ? logs.length : 0 },
      });
      setType(next);
      setLogs((current) => (append ? [...current, ...page.logs] : page.logs));
      setExhausted(page.logs.length === 0);
    } catch {
      toast.error(copy.genericError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="로그"
        description="자동화 매칭, 메시지 발송, 오류 기록을 확인하세요."
      />
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <label htmlFor="log-type" className="text-sm font-semibold">
          활동 유형
        </label>
        <select
          id="log-type"
          className="lens-field min-h-12 w-auto min-w-36 px-3 text-[15px]"
          value={type}
          disabled={loading}
          onChange={(event) => void load(event.target.value)}
        >
          <option value="">전체</option>
          {Object.entries(LOG_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {loading ? (
          <span role="status" className="text-sm text-muted">
            불러오는 중
          </span>
        ) : null}
      </div>
      {logs.length === 0 ? (
        <EmptyState title={copy.emptyLogs} />
      ) : (
        <div aria-busy={loading}>
          <LogTable logs={logs} />
          {!exhausted ? (
            <button
              type="button"
              className="lens-button lens-button-secondary mt-4"
              disabled={loading}
              onClick={() => void load(type, true)}
            >
              더 보기
            </button>
          ) : (
            <p className="mt-4 text-sm text-muted" role="status">
              마지막 기록입니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
