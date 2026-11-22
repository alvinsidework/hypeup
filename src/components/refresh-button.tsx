import { RefreshCw } from "lucide-react";
import { copy } from "@/lib/hypeup/copy";
import { cn } from "@/lib/utils";

export function RefreshButton({
  busy,
  onRefresh,
  primary,
}: {
  busy: boolean;
  onRefresh: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "lens-button",
        primary ? "lens-button-primary" : "lens-button-secondary",
      )}
      onClick={onRefresh}
    >
      <RefreshCw
        aria-hidden
        className={cn("size-4", busy && "motion-safe:animate-spin")}
      />
      {busy ? "불러오는 중" : copy.refreshFromIg}
    </button>
  );
}
