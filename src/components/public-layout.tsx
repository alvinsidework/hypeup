import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { DemoBanner } from "@/components/demo-banner";
import { LogoMark, Wordmark } from "@/components/logo";
import { PwaInstallButton } from "@/components/pwa-install";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

export function PublicLayout({
  children,
  headerAction,
  demoMode = false,
  secondary = false,
}: {
  children: ReactNode;
  headerAction?: ReactNode;
  demoMode?: boolean;
  secondary?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <div className="pt-[env(safe-area-inset-top)]">
        <DemoBanner demoMode={demoMode} />
        <header
          className={cn(
            "mx-auto flex min-h-[76px] w-full max-w-[1120px] items-center justify-between gap-2 px-5 sm:gap-4 sm:px-8",
            secondary && "lens-secondary-brand",
          )}
        >
          <Link
            to="/"
            className="inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-md"
          >
            <LogoMark className="size-9" />
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <PwaInstallButton />
            {headerAction}
          </div>
        </header>
      </div>
      {children}
      <SiteFooter />
    </div>
  );
}
