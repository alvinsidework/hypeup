import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, List, X } from "lucide-react";
import { MarkdownDoc } from "@/components/markdown-doc";
import { cn, extractToc, type TocItem } from "@/lib/utils";

const STARTER_PROMPT = `LUMEN_GROK_DEV_SPEC.md (또는 AGENTS.md)를 처음부터 끝까지 읽고 절대 규칙을 따른 뒤,
Phase 0부터 순서대로 구현해. 질문은 진짜 막히기 전에만.
가짜 Instagram 로그인으로 Phase 1을 건너뛰지 마.
UI는 지시서 12장의 디자인 시스템을 그대로 적용해.`;

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="12" cy="14" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="20.5" cy="19.5" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function useCopied(ms = 1600) {
  const [copied, setCopied] = useState(false);
  function copy(text: string) {
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), ms);
    };
    void navigator.clipboard.writeText(text).then(done).catch(() => {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
      done();
    });
  }
  return { copied, copy };
}

function TocNav({
  items,
  activeId,
  onJump,
}: {
  items: TocItem[];
  activeId: string;
  onJump: (id: string) => void;
}) {
  return (
    <nav aria-label="목차" className="space-y-0.5">
      {items.map((item) => (
        <a
          key={item.id + item.level}
          href={`#${item.id}`}
          onClick={(event) => {
            event.preventDefault();
            onJump(item.id);
          }}
          className={cn(
            "block rounded-sm py-1.5 text-[13px] leading-5 transition-colors duration-150",
            item.level === 2 && "font-medium text-muted hover:text-fg",
            item.level >= 3 && "pl-3 text-subtle hover:text-fg",
            activeId === item.id && "text-fg",
          )}
        >
          {item.text}
        </a>
      ))}
    </nav>
  );
}

export function SpecShell({ source }: { source: string }) {
  const displaySource = useMemo(() => source.replace(/^# [^\n]+\n+/, ""), [source]);
  const toc = useMemo(
    () => extractToc(source).filter((item) => item.level >= 2),
    [source],
  );
  const [activeId, setActiveId] = useState(toc[0]?.id ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const specCopy = useCopied();
  const promptCopy = useCopied();

  useEffect(() => {
    const headings = toc
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 1] },
    );
    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [toc]);

  function jump(id: string) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  }

  function download() {
    const blob = new Blob([source], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "LUMEN_GROK_DEV_SPEC.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-fg md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="목차 열기"
          >
            <List className="size-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark className="size-7 shrink-0 text-accent" />
            <div className="min-w-0">
              <p className="font-display text-[17px] italic leading-none tracking-tight">Lumen</p>
              <p className="mt-0.5 truncate text-[11px] text-muted">개발 지시서 · VS Code + Grok</p>
            </div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => specCopy.copy(source)}
              className="hidden h-10 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium text-fg transition-colors duration-150 hover:bg-surface sm:inline-flex"
            >
              {specCopy.copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {specCopy.copied ? "복사됨" : "전체 복사"}
            </button>
            <button
              type="button"
              onClick={download}
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-fg px-3.5 text-[13px] font-medium text-bg transition-transform duration-150 active:scale-[0.98]"
            >
              <Download className="size-3.5" />
              MD 받기
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)_240px]">
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] overflow-y-auto border-r border-border px-4 py-8 md:block">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">목차</p>
          <TocNav items={toc} activeId={activeId} onJump={jump} />
        </aside>

        <main className="min-w-0 px-4 py-10 sm:px-8 lg:px-12">
          <section className="max-w-3xl">
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-accent">Spec 1.0</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
              Instagram 댓글 데스크를
              <span className="italic text-muted"> 직접 </span>
              붙이는 지시서
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted">
              본인 인스타그램으로 로그인하고, 공식 API로 댓글·대댓글·DM 자동화를 구현하는
              순서입니다. 파일을 받아 VS Code Grok 채팅에 붙여 넣으면 됩니다.
            </p>

            <div className="mt-8 rounded-xl border border-border bg-surface p-5 sm:p-6">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-subtle">
                VS Code 첫 메시지
              </p>
              <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12.5px] leading-6 text-fg/85">
                {STARTER_PROMPT}
              </pre>
              <button
                type="button"
                onClick={() => promptCopy.copy(STARTER_PROMPT)}
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium transition-colors duration-150 hover:bg-surface-2"
              >
                {promptCopy.copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {promptCopy.copied ? "복사됨" : "첫 프롬프트 복사"}
              </button>
            </div>
          </section>

          <article className="prose-spec mt-12 max-w-3xl min-w-0 pb-24 [overflow-wrap:anywhere]">
            <MarkdownDoc source={displaySource} />
          </article>
        </main>

        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] overflow-y-auto border-l border-border px-5 py-8 lg:block">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle">사용 순서</p>
          <ol className="mt-4 space-y-4 text-[13px] leading-5 text-muted">
            <li>
              <span className="block font-medium text-fg">1. MD 받기</span>
              프로젝트 루트에 AGENTS.md로 저장
            </li>
            <li>
              <span className="block font-medium text-fg">2. Phase 0</span>
              골격·디자인 토큰만 먼저
            </li>
            <li>
              <span className="block font-medium text-fg">3. Meta 앱</span>
              Instagram App ID/Secret을 env에
            </li>
            <li>
              <span className="block font-medium text-fg">4. Phase 1</span>
              본인 계정으로 실제 로그인
            </li>
            <li>
              <span className="block font-medium text-fg">5. 이후 페이즈</span>
              읽기 → 수동 답글 → 자동화
            </li>
          </ol>
        </aside>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-bg/70"
            aria-label="닫기"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-surface shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-[13px] font-medium">목차</span>
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded-md"
                onClick={() => setMenuOpen(false)}
                aria-label="목차 닫기"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <TocNav items={toc} activeId={activeId} onJump={jump} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
