import { useRouterState } from "@tanstack/react-router";

export function RouteProgress() {
  const pending = useRouterState({
    select: (state) => state.isLoading || state.status === "pending",
  });
  if (!pending) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-bg/60 backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-10 py-8">
        <span
          className="size-16 animate-spin rounded-full border-[5px] border-white/15 border-t-fg"
          aria-hidden
        />
        <p className="text-[14px] font-medium tracking-wide text-fg">불러오는 중</p>
      </div>
    </div>
  );
}
