import { useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { toast } from "sonner";
import { LensChat, type LensAction } from "@/components/lens-chat";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { actOnLensDeal, getLensInquiry, openLensInquiry, sendLensMessage } from "@/lib/hypeup/lens-api";
import { validateUsername } from "@/lib/hypeup/lens-rules";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";

export const Route = createFileRoute("/$username_/inquiry")({
  loader: async ({ params }) => {
    if (!validateUsername(params.username).ok) throw notFound();
    return getLensInquiry({ data: { username: params.username } });
  },
  component: InquiryPage,
});

function InquiryPage() {
  const data = Route.useLoaderData();
  const [step, setStep] = useState<"gate" | "form">(data.desk ? "form" : "gate");
  const [desk, setDesk] = useState<ThreadDesk | null>(data.desk);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ contactName: "", company: "", email: "", instagramHandle: "", bizNo: "" });
  if (!data.ready) {
    return <main className="mx-auto flex min-h-dvh max-w-[440px] items-center px-5 text-[15px]">페이지를 준비 중이에요</main>;
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] px-5 py-8">
      <Link to="/$username" params={{ username: data.username }} className="text-[13px] text-muted">페이지로 돌아가기</Link>
      {desk ? (
        <div className="mt-4">
          <h1 className="font-display text-3xl">{data.name}</h1>
          <p className="mt-1 text-[12px] text-muted">기록되는 대화</p>
          <div className="mt-4">
            <LensChat
              role="brand"
              desk={desk}
              busy={busy}
              onSend={async (body) => {
                setBusy(true);
                const result = await sendLensMessage({ data: { role: "brand", threadId: desk.id, body } });
                setBusy(false);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                setDesk(result.desk);
              }}
              onAction={async (action: LensAction) => {
                setBusy(true);
                const result = await actOnLensDeal({ data: { role: "brand", threadId: desk.id, ...action } });
                setBusy(false);
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                setDesk(result.desk);
              }}
            />
          </div>
        </div>
      ) : step === "gate" ? (
        <section className="mt-8">
          <h1 className="font-display text-3xl tracking-tight">{data.name}에게 문의하기</h1>
          <p className="mt-3 text-[14px] leading-6 text-muted">브랜드 협업 문의만 이 채널로 받고 있어요. 대화 내용은 양쪽 기록으로 남습니다.</p>
          <button type="button" className={`${primaryBtn} mt-6 w-full`} onClick={() => setStep("form")}>브랜드로 대화 시작</button>
          <Link to="/$username" params={{ username: data.username }} className={`${ghostBtn} mt-2 w-full`}>페이지로 돌아가기</Link>
        </section>
      ) : (
        <form
          className="mt-8"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            const result = await openLensInquiry({ data: { username: data.username, ...form } });
            setBusy(false);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setDesk(result.desk);
          }}
        >
          <h1 className="font-display text-3xl">담당자 정보</h1>
          <p className="mt-2 text-[13px] leading-5 text-muted">이 브라우저에서 대화가 이어집니다. 메일함 인증은 아직 하지 않으며, 인플루언서에게는 메일 종류만 표시됩니다.</p>
          <Field label="담당자 이름"><input className={inputClass} value={form.contactName} maxLength={40} onChange={(event) => setForm({ ...form, contactName: event.target.value })} /></Field>
          <Field label="브랜드명"><input className={inputClass} value={form.company} maxLength={60} onChange={(event) => setForm({ ...form, company: event.target.value })} /></Field>
          <Field label="이메일"><input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="브랜드 인스타그램 (선택)"><input className={inputClass} value={form.instagramHandle} onChange={(event) => setForm({ ...form, instagramHandle: event.target.value })} /></Field>
          <Field label="사업자등록번호 (선택)"><input className={inputClass} inputMode="numeric" value={form.bizNo} onChange={(event) => setForm({ ...form, bizNo: event.target.value })} /></Field>
          <button className={`${primaryBtn} mt-4 w-full`} disabled={busy} type="submit">대화 시작</button>
        </form>
      )}
    </main>
  );
}
