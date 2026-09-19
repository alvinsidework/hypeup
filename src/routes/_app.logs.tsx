import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EmptyState } from "@/components/empty-state";
import { LogTable } from "@/components/log-table";
import { PageHeader } from "@/components/page-header";
import { copy } from "@/lib/hypeup/copy";
import { getLogsPage } from "@/lib/hypeup/api";
import type { EventLogItem } from "@/lib/hypeup/types";

const TYPES = ["", "AUTH", "WEBHOOK", "MATCH", "PUBLIC_REPLY", "PRIVATE_REPLY", "HIDE", "ERROR"];

export const Route = createFileRoute("/_app/logs")({
  loader: () => getLogsPage({ data: {} }),
  component: LogsPage,
});

function LogsPage() {
  const initial = Route.useLoaderData();
  const [type, setType] = useState("");
  const [logs, setLogs] = useState<EventLogItem[]>(initial.logs);
  const [offset, setOffset] = useState(initial.logs.length);

  async function applyType(next: string) {
    setType(next);
    const page = await getLogsPage({ data: { type: next || undefined, offset: 0 } });
    setLogs(page.logs);
    setOffset(page.logs.length);
  }

  return (
    <div>
      <PageHeader title="로그" description="발송·매칭·오류 기록입니다." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TYPES.map((value) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => void applyType(value)}
            className={`h-10 rounded-md px-3 text-[12px] ${type === value ? "bg-fg text-bg" : "border border-border"}`}
          >
            {value || "전체"}
          </button>
        ))}
      </div>
      {logs.length === 0 ? (
        <EmptyState title={copy.emptyLogs} />
      ) : (
        <>
          <LogTable logs={logs} />
          <button
            type="button"
            className="mt-4 h-11 rounded-md border border-border px-4 text-[13px]"
            onClick={async () => {
              const page = await getLogsPage({ data: { type: type || undefined, offset } });
              setLogs((current) => [...current, ...page.logs]);
              setOffset((value) => value + page.logs.length);
            }}
          >
            더 보기
          </button>
        </>
      )}
    </div>
  );
}
