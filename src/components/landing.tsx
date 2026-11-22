import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CornerDownRight,
  Instagram,
  MessageCircle,
  Send,
} from "lucide-react";
import { AccessRequestDialog } from "@/components/access-request-dialog";
import { DemoEntryButton } from "@/components/demo-entry-button";
import { PublicLayout } from "@/components/public-layout";
import { copy } from "@/lib/hypeup/copy";

export function Landing({ demoMode }: { demoMode: boolean }) {
  return (
    <PublicLayout
      demoMode={demoMode}
      headerAction={
        <Link to="/brand" search={{}} className="lens-button lens-button-quiet">
          브랜드이신가요? <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      }
    >
      <main className="lens-reveal mx-auto grid w-full max-w-[1120px] flex-1 content-center items-center gap-10 px-5 py-9 sm:px-8 sm:py-14 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-18 lg:py-20">
        <section className="min-w-0" aria-labelledby="landing-heading">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium text-muted sm:mb-5">
            <Instagram className="size-[18px]" strokeWidth={1.75} aria-hidden />
            크리에이터 어시스턴트
          </p>
          <h1
            id="landing-heading"
            className="max-w-[14em] text-[clamp(2.25rem,5.4vw,3.625rem)] font-bold leading-[1.1] tracking-[-0.065em] [text-wrap:balance] [word-break:keep-all]"
          >
            {copy.tagline}
          </h1>
          <p className="mt-5 max-w-[28rem] text-[16px] leading-[1.65] text-muted [word-break:keep-all] sm:text-[17px]">
            {copy.landingBody}
          </p>
          <div className="mt-7 grid gap-2.5 min-[400px]:flex min-[400px]:flex-wrap sm:mt-9">
            <AccessRequestDialog />
            {demoMode ? (
              <DemoEntryButton />
            ) : (
              <Link
                to="/connect"
                search={{ error: undefined, detail: undefined }}
                className="lens-button lens-button-secondary"
              >
                {copy.alreadyTester}
              </Link>
            )}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted [word-break:keep-all]">
            {copy.applyHint}
          </p>
        </section>
        <AutomationExample />
      </main>
    </PublicLayout>
  );
}

function AutomationExample() {
  return (
    <figure
      className="min-w-0 rounded-[28px] bg-surface-2 p-4 sm:p-5 lg:p-6"
      aria-labelledby="automation-example-caption"
    >
      <figcaption
        id="automation-example-caption"
        className="mb-4 px-1.5 text-[17px] font-semibold tracking-tight"
      >
        자동화 예시
      </figcaption>
      <div className="lens-panel rounded-[22px] p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-fg">
            <MessageCircle
              className="size-[18px]"
              strokeWidth={1.75}
              aria-hidden
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted">새 댓글</p>
            <p className="mt-0.5 text-[16px] font-semibold leading-7 tracking-tight">
              <mark className="rounded-md bg-accent-soft px-1 py-0.5 text-accent-ink">
                가격
              </mark>
              이 궁금해요!
            </p>
          </div>
        </div>
        <div className="my-3.5 flex items-center gap-2 border-y border-border px-1 py-2 text-sm font-medium text-muted">
          <CornerDownRight
            className="size-4 text-accent-ink"
            strokeWidth={1.75}
            aria-hidden
          />
          키워드 ‘가격’에 대한 응답
        </div>
        <dl className="grid gap-3">
          <div className="rounded-[14px] bg-surface-2 px-3 py-2.5 sm:px-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-fg">
              <MessageCircle
                className="size-4"
                strokeWidth={1.75}
                aria-hidden
              />{" "}
              공개 답글
            </dt>
            <dd className="mt-1 text-sm leading-6 text-muted [word-break:keep-all]">
              가격 안내를 DM으로 보내드렸어요.
            </dd>
          </div>
          <div className="rounded-[14px] bg-accent-soft px-3 py-2.5 sm:px-4">
            <dt className="flex items-center gap-2 text-sm font-semibold text-accent-ink">
              <Send className="size-4" strokeWidth={1.75} aria-hidden /> DM
            </dt>
            <dd className="mt-1 text-sm leading-6 text-fg [word-break:keep-all]">
              안녕하세요! 문의하신 가격을 안내드려요.
            </dd>
          </div>
        </dl>
      </div>
    </figure>
  );
}
