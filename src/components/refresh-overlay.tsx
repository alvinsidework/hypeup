export function RefreshOverlay({ busy, label = "Instagram에서 불러오는 중" }: { busy: boolean; label?: string }) {
  if (!busy) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-bg/55 px-4 backdrop-blur-[2px]">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-5 py-4 text-[13px]">
        <span className="size-4 animate-spin rounded-full border border-accent border-t-transparent" />
        {label}
      </div>
    </div>
  );
}
