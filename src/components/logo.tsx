import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("shrink-0 text-fg", className)}
      aria-hidden
    >
      <rect width="40" height="40" rx="13" fill="currentColor" />
      <g
        className="text-bg"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.65"
      >
        <circle cx="16.25" cy="18.3" r="6.3" />
        <circle cx="23.75" cy="22.15" r="5.05" />
      </g>
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[22px] font-bold leading-none tracking-[-0.055em]",
        className,
      )}
    >
      Lens
    </span>
  );
}
