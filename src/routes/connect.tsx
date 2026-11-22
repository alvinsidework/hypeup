import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, ArrowUpRight, Instagram } from "lucide-react";
import { DemoEntryButton } from "@/components/demo-entry-button";
import {
  InstagramConnectLink,
  InstagramTesterInviteLink,
} from "@/components/instagram-connect-link";
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
  const checkInvite = error === "not_tester" || error === "token_exchange";

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
                {checkInvite ? (
                  <p className="mt-1 text-muted [word-break:keep-all]">
                    Instagram 웹사이트 권한의 테스터 탭에서 초대 수락 여부를
                    확인해 주세요. 초대가 보이지 않으면 초대받은 계정으로
                    로그인했는지 확인해 주세요.
                  </p>
                ) : null}
                {detail ? (
                  <p className="mt-1 [overflow-wrap:anywhere] text-muted">
                    {detail}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <ol
            aria-label="Instagram 연결 순서"
            className="mt-7 divide-y divide-border border-y border-border"
          >
            <li className="py-4 sm:py-5">
              <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-sm text-accent-ink"
                  aria-hidden
                >
                  1
                </span>
                Instagram에서 테스터 초대 수락
              </h2>
              <p className="mt-2.5 text-sm leading-6 text-muted [word-break:keep-all]">
                초대받은 계정으로 Instagram 웹에 로그인하세요.{" "}
                <strong className="font-semibold text-fg">
                  앱 및 웹사이트
                </strong>{" "}
                화면에서{" "}
                <strong className="font-semibold text-fg">
                  테스터(테스터 초대)
                </strong>{" "}
                탭을 열고 Lens용 앱 초대를 수락해 주세요.
              </p>
              <InstagramTesterInviteLink className="lens-button lens-button-primary mt-3 w-full">
                Instagram 웹사이트 권한 열기
                <ArrowUpRight className="size-4 shrink-0" aria-hidden />
              </InstagramTesterInviteLink>
            </li>
            <li className="py-4 sm:py-5">
              <h2 className="flex items-center gap-2.5 text-base font-semibold tracking-tight">
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-sm"
                  aria-hidden
                >
                  2
                </span>
                Lens에 Instagram 계정 연결
              </h2>
              <p className="mt-2.5 text-sm leading-6 text-muted [word-break:keep-all]">
                초대를 수락한 뒤 이 화면으로 돌아와 같은 계정으로 연결하세요.
                이미 수락했다면 바로 연결하고 Instagram 권한 화면에서 허용을
                눌러 주세요.
              </p>
              {boot.demoMode ? (
                <button
                  type="button"
                  className="lens-button lens-button-secondary mt-3 w-full"
                  disabled
                >
                  {copy.continueWithInstagram}
                </button>
              ) : (
                <InstagramConnectLink className="lens-button lens-button-secondary mt-3 w-full">
                  {copy.continueWithInstagram}
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </InstagramConnectLink>
              )}
            </li>
          </ol>

          {boot.demoMode ? (
            <div className="mt-5 grid gap-2">
              <p className="text-sm leading-6 text-muted">
                데모에서는 인스타그램을 연결할 수 없어요.
              </p>
              <DemoEntryButton primary />
            </div>
          ) : null}
        </section>
      </main>
    </PublicLayout>
  );
}
