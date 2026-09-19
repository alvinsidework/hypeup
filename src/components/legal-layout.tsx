import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LogoMark, Wordmark } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";

export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex h-16 max-w-[800px] items-center gap-2 px-4">
        <Link to="/" className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <Wordmark />
        </Link>
      </header>
      <main className="mx-auto max-w-[800px] px-4 pb-16 pt-6">
        <h1 className="font-display text-4xl tracking-tight">{title}</h1>
        <div className="legal-copy mt-8 space-y-6 text-[14px] leading-7 text-muted">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
