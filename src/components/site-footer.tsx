import { Link } from "@tanstack/react-router";
import { legal } from "@/lib/hypeup/legal";

export function SiteFooter({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="space-y-1 px-2 text-[11px] leading-4 text-subtle">
        <p>{legal.company}</p>
        <div className="flex flex-wrap gap-x-2">
          <Link to="/privacy" className="hover:text-muted">
            개인정보처리방침
          </Link>
          <Link to="/terms" className="hover:text-muted">
            이용약관
          </Link>
        </div>
      </div>
    );
  }

  return (
    <footer className="border-t border-border px-4 py-8 text-[12px] leading-6 text-muted">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-fg">{legal.company}</p>
          <p className="mt-1">대표 {legal.ceo} · 사업자등록번호 {legal.bizNo}</p>
          <p>{legal.address}</p>
          <p>
            <a className="hover:text-fg" href={`mailto:${legal.email}`}>
              {legal.email}
            </a>
            {" · "}
            <a className="hover:text-fg" href={legal.phoneHref}>
              {legal.phoneDisplay}
            </a>
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1">
          <Link to="/privacy" className="hover:text-fg">
            개인정보처리방침
          </Link>
          <Link to="/terms" className="hover:text-fg">
            이용약관
          </Link>
          <Link to="/data-deletion" className="hover:text-fg">
            데이터 삭제 요청
          </Link>
        </nav>
      </div>
    </footer>
  );
}
