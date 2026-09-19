import { useRouterState } from "@tanstack/react-router";

export function RouteProgress() {
  const pending = useRouterState({
    select: (state) => state.isLoading || state.status === "pending",
  });
  if (!pending) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden bg-border">
      <div className="hypeup-progress h-full w-1/3 bg-accent" />
    </div>
  );
}
