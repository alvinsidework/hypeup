import { useRouterState } from "@tanstack/react-router";

export function RouteProgress() {
  const pending = useRouterState({
    select: (state) => state.isLoading || state.status === "pending",
  });
  if (!pending) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
      role="status"
      aria-live="polite"
    >
      <div
        className="lens-route-progress h-0.5 origin-left bg-accent"
        aria-hidden
      />
      <span className="sr-only">페이지 불러오는 중</span>
    </div>
  );
}
