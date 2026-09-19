import { copy } from "@/lib/hypeup/copy";

export function DemoBanner({ demoMode }: { demoMode: boolean }) {
  if (!demoMode) return null;
  return (
    <div className="border-b border-border bg-surface px-4 py-2 text-center text-[12px] tracking-wide text-accent">
      {copy.demoBanner}
    </div>
  );
}
