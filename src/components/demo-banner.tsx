import { copy } from "@/lib/hypeup/copy";

export function DemoBanner({ demoMode }: { demoMode: boolean }) {
  if (!demoMode) return null;
  return (
    <div className="bg-surface-2 px-4 py-2 text-center text-sm font-medium text-muted">
      {copy.demoBanner}
    </div>
  );
}
