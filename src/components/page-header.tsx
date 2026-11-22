import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
      <div className="min-w-0">
        <h1 className="text-[30px] leading-tight font-bold tracking-[-0.045em] sm:text-[36px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
