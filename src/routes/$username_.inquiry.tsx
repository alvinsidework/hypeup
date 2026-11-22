import { useRef, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LensChat } from "@/components/lens-chat";
import { Field, inputClass, primaryBtn } from "@/components/lens-ui";
import { LogoMark, Wordmark } from "@/components/logo";
import {
  actOnLensDeal,
  getLensInquiry,
  openLensInquiry,
  sendLensMessage,
} from "@/lib/hypeup/lens-api";
import { validateUsername } from "@/lib/hypeup/lens-rules";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";

export const Route = createFileRoute("/$username_/inquiry")({
  loader: async ({ params }) => {
    if (!validateUsername(params.username).ok) throw notFound();
    return getLensInquiry({ data: { username: params.username } });
  },
  component: InquiryPage,
});

type Inquiry = Extract<
  Awaited<ReturnType<typeof getLensInquiry>>,
  { ready: true }
>;
type Update = { ok: true; desk: ThreadDesk } | { ok: false; error: string };

function InquiryPage() {
  const data = Route.useLoaderData();
  if (!data.ready) {
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
  return <InquiryFlow key={data.username} data={data} />;
}

function InquiryFlow({ data }: { data: Inquiry }) {
  const [step, setStep] = useState<"gate" | "form">("gate");
  const [desk, setDesk] = useState<ThreadDesk | null>(data.desk);
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);
  const [form, setForm] = useState({
    contactName: "",
    company: "",
    email: "",
    instagramHandle: "",
    bizNo: "",
  });

  async function update(request: () => Promise<Update>) {
    if (requestPending.current) return false;
    requestPending.current = true;
    setBusy(true);
    try {
      const result = await request();
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      setDesk(result.desk);
      return true;
    } catch {
      toast.error("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return false;
    } finally {
      requestPending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="mx-auto grid min-h-16 max-w-5xl grid-cols-[44px_1fr_44px] items-center px-5 pt-[env(safe-area-inset-top)] sm:px-8">
        <Link
          to="/$username"
          params={{ username: data.username }}
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
        className={`mx-auto w-full px-5 pt-8 pb-[calc(40px+env(safe-area-inset-bottom))] sm:px-8 sm:pt-12 ${desk ? "max-w-5xl" : "max-w-xl"}`}
      >
        {desk ? (
          <div className="lens-reveal">
            <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
              {data.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              브랜드 문의 · 기록되는 대화
            </p>
            <div className="mt-6">
              <LensChat
                role="brand"
                desk={desk}
                busy={busy}
                onSend={(body) =>
                  update(() =>
                    sendLensMessage({
                      data: { role: "brand", threadId: desk.id, body },
                    }),
                  )
                }
                onAction={async (action) => {
                  await update(() =>
                    actOnLensDeal({
                      data: { role: "brand", threadId: desk.id, ...action },
                    }),
                  );
                }}
              />
            </div>
          </div>
        ) : step === "gate" ? (
          <section className="lens-panel lens-reveal p-5 sm:p-8">
            <div className="mb-5 grid size-12 place-items-center rounded-full bg-surface-2">
              <MessageCircle
                className="size-5"
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight [overflow-wrap:anywhere]">
              {data.name}에게 문의하기
            </h1>
            <p className="mt-3 text-base leading-relaxed text-muted">
              브랜드 협업 문의를 받고 있어요. 대화 내용은 양쪽에 기록으로
              남습니다.
            </p>
            <button
              type="button"
              className={`${primaryBtn} mt-7 w-full`}
              onClick={() => setStep("form")}
            >
              브랜드로 대화 시작 <ArrowRight className="size-4" aria-hidden />
            </button>
          </section>
        ) : (
          <form
            className="lens-panel lens-reveal p-5 sm:p-8"
            onSubmit={(event) => {
              event.preventDefault();
              void update(() =>
                openLensInquiry({ data: { username: data.username, ...form } }),
              );
            }}
          >
            <h1 className="text-3xl font-semibold tracking-tight">
              담당자 정보
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              이 브라우저에서 대화를 이어갈 수 있습니다. 크리에이터에게는
              마스킹된 이메일 주소와 메일 종류가 표시됩니다.
            </p>
            <div className="mt-4 space-y-1">
              <Field label="담당자 이름">
                <input
                  className={inputClass}
                  value={form.contactName}
                  autoComplete="name"
                  maxLength={40}
                  required
                  onChange={(event) =>
                    setForm({ ...form, contactName: event.target.value })
                  }
                />
              </Field>
              <Field label="브랜드명">
                <input
                  className={inputClass}
                  value={form.company}
                  autoComplete="organization"
                  maxLength={60}
                  required
                  onChange={(event) =>
                    setForm({ ...form, company: event.target.value })
                  }
                />
              </Field>
              <Field label="이메일">
                <input
                  className={inputClass}
                  type="email"
                  value={form.email}
                  autoComplete="email"
                  maxLength={120}
                  required
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </Field>
              <Field label="브랜드 인스타그램 (선택)">
                <input
                  className={inputClass}
                  value={form.instagramHandle}
                  autoCapitalize="none"
                  maxLength={40}
                  onChange={(event) =>
                    setForm({ ...form, instagramHandle: event.target.value })
                  }
                />
              </Field>
              <Field label="사업자등록번호 (선택)">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={form.bizNo}
                  onChange={(event) =>
                    setForm({ ...form, bizNo: event.target.value })
                  }
                />
              </Field>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="lens-button lens-button-quiet"
                onClick={() => setStep("gate")}
                disabled={busy}
              >
                이전
              </button>
              <button
                className={`${primaryBtn} flex-1`}
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
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
