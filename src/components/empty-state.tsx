import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

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
    <div className="lens-panel flex min-h-[190px] flex-col items-center justify-center px-5 py-8 text-center">
      <span
        className="mb-3 grid size-11 place-items-center rounded-full bg-surface-2 text-muted"
        aria-hidden
      >
        <Inbox className="size-5" strokeWidth={1.75} />
      </span>
      <p className="text-base font-semibold text-fg">{title}</p>
      {body ? (
        <p className="mt-1 max-w-sm text-sm leading-6 text-muted">{body}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
