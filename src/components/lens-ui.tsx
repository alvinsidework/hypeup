import type { ReactNode } from "react";

export const inputClass =
  "mt-1 h-11 w-full rounded-md border border-border bg-bg px-3 text-[13px] text-fg outline-none";
export const primaryBtn =
  "inline-flex h-11 items-center justify-center rounded-md bg-fg px-4 text-[13px] font-medium text-bg disabled:opacity-50";
export const ghostBtn =
  "inline-flex h-11 items-center justify-center rounded-md border border-border px-4 text-[13px] disabled:opacity-50";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-3 block text-[12px] text-muted">
      {label}
      {children}
    </label>
  );
}
