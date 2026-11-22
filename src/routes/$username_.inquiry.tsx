import { useRef, useState } from "react";
import {
  Link,
  createFileRoute,
  notFound,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BrandSignIn } from "@/components/brand-sign-in";
import { BrandThreadChat } from "@/components/brand-thread-chat";
import { Field, inputClass, primaryBtn } from "@/components/lens-ui";
import { LogoMark, Wordmark } from "@/components/logo";
import { getBrandAuthOptions } from "@/lib/hypeup/brand-auth-api";
import { getLensInquiry, openLensInquiry } from "@/lib/hypeup/lens-api";
import { validateUsername } from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/$username_/inquiry")({
  headers: () => ({ "Cache-Control": "private, no-store" }),
  loader: async ({ params }) => {
    if (!validateUsername(params.username).ok) throw notFound();
    const inquiry = await getLensInquiry({
      data: { username: params.username },
    });
    return {
      inquiry,
      authOptions:
        inquiry.ready && !inquiry.account ? await getBrandAuthOptions() : null,
    };
  },
  component: InquiryPage,
});

type Inquiry = Extract<
  Awaited<ReturnType<typeof getLensInquiry>>,
  { ready: true }
>;

function InquiryPage() {
  const { inquiry, authOptions } = Route.useLoaderData();
  if (!inquiry.ready) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
        <LogoMark className="lens-secondary-brand size-12" />
        <h1 className="text-2xl font-semibold tracking-tight">
          페이지를 준비 중이에요
        </h1>
        <Link to="/" className="lens-button lens-button-secondary">
          Lens 홈
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto grid min-h-16 max-w-5xl grid-cols-[44px_1fr_44px] items-center px-5 pt-[env(safe-area-inset-top)] sm:px-8">
        <Link
          to="/$username"
          params={{ username: inquiry.username }}
          className="lens-icon-button"
          aria-label="공개 페이지로 돌아가기"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Link
          to="/"
          aria-label="Lens 홈"
          className="lens-secondary-brand flex min-h-11 items-center justify-self-center gap-2.5 rounded-full"
        >
          <LogoMark className="size-6" />
          <Wordmark />
        </Link>
      </header>
      <main
        className={`lens-reveal mx-auto w-full px-5 pt-8 pb-[calc(40px+env(safe-area-inset-bottom))] sm:px-8 sm:pt-12 ${inquiry.desk ? "max-w-5xl" : "max-w-xl"}`}
      >
        {inquiry.desk ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
                {inquiry.name}
              </h1>
              <Link
                to="/brand"
                search={{}}
                className="lens-button lens-button-quiet"
              >
                내 문의
              </Link>
            </div>
            <BrandThreadChat
              key={inquiry.desk.id}
              initial={inquiry.desk}
              savedTemplates={inquiry.templates}
            />
          </>
        ) : (
          <section className="lens-panel p-5 sm:p-8">
            <div className="mb-5 grid size-12 place-items-center rounded-full bg-surface-2">
              <MessageCircle
                className="size-5"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
              {inquiry.name}에게 문의하기
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              협업 문의와 답변은 브랜드 대시보드에서 이어볼 수 있어요.
            </p>
            {inquiry.account ? (
              <InquiryForm
                key={inquiry.username}
                inquiry={inquiry}
                account={inquiry.account}
              />
            ) : authOptions ? (
              <div className="mt-5">
                <BrandSignIn
                  returnTo={`/${inquiry.username}/inquiry`}
                  options={authOptions}
                />
              </div>
            ) : null}
          </section>
        )}
      </main>
    </div>
  );
}

function InquiryForm({
  inquiry,
  account,
}: {
  inquiry: Inquiry;
  account: NonNullable<Inquiry["account"]>;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [contactName, setContactName] = useState(account.contactName);
  const [company, setCompany] = useState(account.company);

  async function openConversation() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const result = await openLensInquiry({
        data: { username: inquiry.username, contactName, company },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await navigate({
        to: "/brand/inquiries/$id",
        params: { id: result.desk.id },
      });
    } catch {
      toast.error("대화를 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void openConversation();
      }}
    >
      <p className="mb-4 text-sm text-muted [overflow-wrap:anywhere]">
        {account.email}
      </p>
      <div className="space-y-1">
        <Field label="담당자 이름">
          <input
            className={inputClass}
            value={contactName}
            autoComplete="name"
            maxLength={40}
            required
            onChange={(event) => setContactName(event.target.value)}
          />
        </Field>
        <Field label="브랜드명">
          <input
            className={inputClass}
            value={company}
            autoComplete="organization"
            maxLength={60}
            required
            onChange={(event) => setCompany(event.target.value)}
          />
        </Field>
      </div>
      <button
        className={`${primaryBtn} mt-6 w-full`}
        disabled={busy}
        aria-busy={busy}
        type="submit"
      >
        {busy ? (
          <LoaderCircle
            className="size-4 shrink-0 motion-safe:animate-spin"
            aria-hidden
          />
        ) : null}
        {busy ? "대화를 여는 중…" : "대화 시작"}
        {busy ? null : <ArrowRight className="size-4" aria-hidden />}
      </button>
    </form>
  );
}
