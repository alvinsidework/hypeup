import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <PublicLayout secondary>
      <main className="lens-reveal mx-auto w-full max-w-[792px] flex-1 px-5 pt-5 pb-16 sm:px-8 sm:pt-9 sm:pb-24">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm font-medium text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden /> Lens 홈
        </Link>
        <article className="lens-panel mt-3 rounded-[28px] p-5 sm:p-9">
          <h1 className="text-[clamp(1.875rem,4.5vw,2.5rem)] font-bold leading-[1.14] tracking-[-0.055em]">
            {title}
          </h1>
          <div className="legal-copy mt-6 space-y-5 text-[15px] leading-7 text-muted [overflow-wrap:anywhere] [&_section]:border-t [&_section]:border-border [&_section]:pt-5 [&_section>h2]:text-[17px] [&_section>h2]:font-semibold">
            {children}
          </div>
        </article>
      </main>
    </PublicLayout>
  );
}
