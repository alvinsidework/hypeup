import type { ReactNode } from "react";

export const inputClass = "lens-field mt-2";
export const primaryBtn = "lens-button lens-button-primary";
export const ghostBtn = "lens-button lens-button-secondary";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="mt-4 block text-sm font-medium text-muted">
      {label}
      {children}
    </label>
  );
}
