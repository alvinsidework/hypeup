import { useState, useTransition } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { enterDemo } from "@/lib/hypeup/bootstrap";
import { copy } from "@/lib/hypeup/copy";
import { cn } from "@/lib/utils";

export function DemoEntryButton({ primary = false }: { primary?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className={cn(
          "lens-button w-full",
          primary ? "lens-button-primary" : "lens-button-secondary",
        )}
        disabled={pending}
        aria-busy={pending}
        onClick={() => {
          setError(false);
          startTransition(async () => {
            try {
              await enterDemo();
              await router.invalidate();
              await router.navigate({ to: "/" });
            } catch {
              setError(true);
            }
          });
        }}
      >
        {pending ? "데모 여는 중" : copy.browseDemo}
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
      </button>
      {error ? (
        <p className="mt-2 max-w-[18rem] text-sm text-danger" role="alert">
          {copy.genericError}
        </p>
      ) : null}
    </div>
  );
}
