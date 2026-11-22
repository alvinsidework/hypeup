import type { ReactElement } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";

export function LensConfirm({
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  destructive = true,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  children: ReactElement;
  destructive?: boolean;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{children}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="lens-overlay z-[70]" />
        <AlertDialog.Content className="lens-sheet fixed inset-0 z-[80] m-auto h-fit max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[420px] overflow-y-auto p-5 sm:p-6">
          <AlertDialog.Title className="text-xl font-bold tracking-tight">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-6 text-muted">
            {description}
          </AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="lens-button lens-button-secondary">
              취소
            </AlertDialog.Cancel>
            <AlertDialog.Action
              className={cn(
                "lens-button",
                destructive
                  ? "bg-danger text-bg hover:opacity-90"
                  : "lens-button-primary",
              )}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
