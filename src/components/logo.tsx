import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("text-accent", className)} aria-hidden>
      <circle cx="12" cy="14" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20.5" cy="19.5" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[18px] italic leading-none tracking-tight", className)}>
      Hypeup
    </span>
  );
}
