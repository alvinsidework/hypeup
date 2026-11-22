import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { primaryBtn } from "@/components/lens-ui";
import { exportLensRecord } from "@/lib/hypeup/lens-api";
import { FORMAT_LABEL, formatWon, statusLabel, usageLabel, type DealStatus } from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/_app/deals/$id")({
  loader: async ({ params }) => {
    const record = await exportLensRecord({ data: { dealId: params.id, save: false } });
    return { id: params.id, record };
  },
  component: DealRecordPage,
});

function DealRecordPage() {
  const data = Route.useLoaderData();
  const [record, setRecord] = useState(data.record);
  if (!record.ok) {
    return <p className="text-[14px]">{record.error}</p>;
  }
  const deal = record.body.deal as {
    title: string;
    status: DealStatus;
    terms: {
      title: string;
      format: "reel";
      deal_type: string;
      pricing: { fixed_amount_krw: number | null; performance_rate_bps: number | null };
      revisions: number;
      usage_rights_days: number;
      deliverables: { description: string };
      notes: string;
    };
    postUrl: string | null;
    postedOn: string | null;
    postNote: string | null;
    agreedAt: string | null;
    settlements: { amountKrw: number; status: string; note: string | null; dueOn: string | null }[];
  };
  const influencer = record.body.influencer as { name: string; username: string };
  const brand = record.body.brand as { company: string; contactName: string; emailMasked: string; trustLabel: string };
  const messages = record.body.messages as { sender: string; body: string; createdAt: string }[];

  return (
    <div className="max-w-2xl">
      <PageHeader title="기록" description="이 화면을 인쇄하면 PDF로 저장할 수 있습니다." action={<Link to="/inquiries" className="text-[13px] underline">문의</Link>} />
      <article id="lens-record" className="rounded-lg border border-border bg-surface p-5 text-[13px] leading-6">
        <h2 className="font-display text-2xl">{deal.title}</h2>
        <p className="mt-1">{statusLabel(deal.status)}</p>
        <p className="mt-4">{influencer.name} @{influencer.username}</p>
        <p>{brand.company} · {brand.contactName} · {brand.emailMasked} · {brand.trustLabel}</p>
        <p className="mt-4">
          {FORMAT_LABEL[deal.terms.format]} · {deal.terms.pricing.fixed_amount_krw != null ? formatWon(deal.terms.pricing.fixed_amount_krw) : "성과"}
          {deal.terms.pricing.performance_rate_bps ? ` · ${deal.terms.pricing.performance_rate_bps / 100}%` : ""}
          {" · "}수정 {deal.terms.revisions}회 · {usageLabel(deal.terms.usage_rights_days)}
        </p>
        {deal.terms.deliverables.description ? <p>{deal.terms.deliverables.description}</p> : null}
        {deal.terms.notes ? <p>{deal.terms.notes}</p> : null}
        {deal.agreedAt ? <p className="mt-2">확정 {deal.agreedAt}</p> : null}
        {deal.postUrl ? <p>게시 {deal.postUrl} {deal.postedOn ?? ""} {deal.postNote ?? ""}</p> : null}
        <div className="mt-4">
          {deal.settlements.map((row, index) => (
            <p key={index}>{formatWon(row.amountKrw)} · {row.status} · {row.dueOn ?? ""} {row.note ?? ""}</p>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {messages.map((message, index) => (
            <p key={index}><span className="text-muted">{message.sender}</span> {message.body}</p>
          ))}
        </div>
        <p className="mt-4 text-muted">{String(record.body.platformNote ?? "")}</p>
        <p className="mt-2 break-all font-mono text-[11px]">{record.hash}</p>
      </article>
      <button
        type="button"
        className={`${primaryBtn} mt-4`}
        onClick={async () => {
          const fresh = await exportLensRecord({ data: { dealId: data.id, save: true } });
          if (!fresh.ok) {
            toast.error(fresh.error);
            return;
          }
          setRecord(fresh);
          window.print();
        }}
      >
        기록 내보내기
      </button>
    </div>
  );
}
