import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Instagram,
  MailCheck,
  UserRound,
} from "lucide-react";
import { DemoEntryButton } from "@/components/demo-entry-button";
import { InstagramConnectLink } from "@/components/instagram-connect-link";
import { PublicLayout } from "@/components/public-layout";
import { getBootstrap } from "@/lib/hypeup/bootstrap";
import { copy, oauthErrorCopy } from "@/lib/hypeup/copy";

export const Route = createFileRoute("/connect")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search.error === "string" ? search.error : undefined,
    detail: typeof search.detail === "string" ? search.detail : undefined,
  }),
  loader: () => getBootstrap(),
  component: ConnectPage,
});

function ConnectPage() {
  const boot = Route.useLoaderData();
  const { error, detail } = Route.useSearch();
  const errorText = error ? (oauthErrorCopy[error] ?? copy.genericError) : null;

  return (
    <PublicLayout demoMode={boot.demoMode}>
      <main className="lens-reveal mx-auto w-full max-w-[600px] flex-1 px-5 pt-8 pb-16 sm:px-8 sm:pt-15 sm:pb-24">
        <section className="lens-panel rounded-[28px] p-5 sm:p-9">
          <div className="grid size-13 place-items-center rounded-[18px] bg-accent-soft text-accent-ink">
            <Instagram className="size-6" strokeWidth={1.75} aria-hidden />
          </div>
          <h1 className="mt-5 text-[clamp(1.875rem,4vw,2.75rem)] font-bold leading-[1.16] tracking-[-0.05em] [text-wrap:balance] [word-break:keep-all]">
            {copy.connectHeadline}
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-muted [word-break:keep-all]">
            {copy.connectBody}
          </p>

          {errorText ? (
            <div
              className="mt-5 flex gap-2.5 rounded-[16px] bg-surface-2 px-4 py-3 text-sm leading-6 text-danger"
              role="alert"
            >
              <AlertCircle
                className="mt-0.5 size-5 shrink-0"
                strokeWidth={1.75}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="[word-break:keep-all]">{errorText}</p>
                {detail ? (
                  <p className="mt-1 [overflow-wrap:anywhere] text-muted">
                    {detail}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-2.5">
            {boot.demoMode ? (
              <>
                <button
                  type="button"
                  className="lens-button lens-button-secondary w-full"
                  disabled
                >
                  {copy.continueWithInstagram}
                </button>
                <DemoEntryButton primary />
                <p className="mt-1 text-sm leading-6 text-muted">
                  데모에서는 인스타그램을 연결할 수 없어요.
                </p>
              </>
            ) : (
              <InstagramConnectLink className="lens-button lens-button-primary w-full">
                {copy.continueWithInstagram}{" "}
                <ArrowRight className="size-4" aria-hidden />
              </InstagramConnectLink>
            )}
          </div>
        </section>

        <section
          aria-labelledby="connect-requirements"
          className="mt-7 px-1 sm:mt-9"
        >
          <h2
            id="connect-requirements"
            className="text-[17px] font-semibold tracking-tight"
          >
            연결 전 확인해 주세요
          </h2>
          <ul className="mt-2 divide-y divide-border">
            <li className="flex items-start gap-3 py-3.5">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
                <UserRound
                  className="size-[18px]"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">프로페셔널 계정</h3>
                <p className="mt-0.5 text-sm leading-6 text-muted [word-break:keep-all]">
                  인스타그램에서 비즈니스 또는 크리에이터 계정으로 전환해
                  주세요.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 py-3.5">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
                <MailCheck
                  className="size-[18px]"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">테스터 초대 수락</h3>
                <p className="mt-0.5 text-sm leading-6 text-muted [word-break:keep-all]">
                  신청 후 받은 초대를 인스타그램에서 수락한 계정으로 연결해
                  주세요.
                </p>
              </div>
            </li>
          </ul>
        </section>
      </main>
    </PublicLayout>
  );
}
