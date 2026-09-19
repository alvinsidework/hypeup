import type { ReactNode } from "react";

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-border bg-surface px-6 py-12 text-center">
      <p className="text-[15px] font-medium text-fg">{title}</p>
      {body ? <p className="mt-2 max-w-sm text-[13px] leading-6 text-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
