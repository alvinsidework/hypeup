import { Link } from "@tanstack/react-router";
import { legal } from "@/lib/hypeup/legal";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="space-y-1 px-2 text-sm leading-5 text-muted">
        <p>{legal.company}</p>
        <nav aria-label="서비스 정책" className="flex flex-wrap gap-x-3">
          <Link
            to="/privacy"
            className="inline-flex min-h-11 items-center transition-colors hover:text-fg"
          >
            개인정보처리방침
          </Link>
          <Link
            to="/terms"
            className="inline-flex min-h-11 items-center transition-colors hover:text-fg"
          >
            이용약관
          </Link>
        </nav>
      </div>
    );
  }

  return (
    <footer className="border-t border-border text-sm leading-6 text-muted">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-5 pt-5 pb-[calc(1.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:pt-7">
        <div>
          <p className="font-semibold text-fg">{legal.company}</p>
          <p className="mt-1">
            대표 {legal.ceo} · 사업자등록번호 {legal.bizNo}
          </p>
          <p>{legal.address}</p>
          <p>
            <a
              className="transition-colors hover:text-fg"
              href={`mailto:${legal.email}`}
            >
              {legal.email}
            </a>
            {" · "}
            <a
              className="transition-colors hover:text-fg"
              href={legal.phoneHref}
            >
              {legal.phoneDisplay}
            </a>
          </p>
        </div>
        <nav
          aria-label="서비스 정책"
          className="flex flex-wrap items-center gap-x-4 gap-y-1"
        >
          <Link
            to="/privacy"
            className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-fg"
          >
            개인정보처리방침
          </Link>
          <Link
            to="/terms"
            className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-fg"
          >
            이용약관
          </Link>
          <Link
            to="/data-deletion"
            className="inline-flex min-h-11 items-center rounded-sm transition-colors hover:text-fg"
          >
            데이터 삭제 요청
          </Link>
        </nav>
      </div>
    </footer>
  );
}
