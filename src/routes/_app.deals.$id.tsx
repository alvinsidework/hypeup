import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { primaryBtn } from "@/components/lens-ui";
import { exportLensRecord } from "@/lib/hypeup/lens-api";
import {
  FORMAT_LABEL,
  formatWon,
  proposalAddOnRows,
  statusLabel,
  usageLabel,
} from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/_app/deals/$id")({
  headers: () => ({ "Cache-Control": "private, no-store" }),
  staticData: { workspaceBack: { to: "/inquiries", label: "브랜드 문의" } },
  loader: async ({ params }) => {
    const record = await exportLensRecord({
      data: { dealId: params.id, save: false },
    });
    return { id: params.id, record };
  },
  component: DealRecordPage,
});

function DealRecordPage() {
  const data = Route.useLoaderData();
  const [record, setRecord] = useState(data.record);
  const [exporting, setExporting] = useState(false);
  if (!record.ok) {
    return <p className="text-[14px]">{record.error}</p>;
  }
  const { deal, influencer, brand, messages } = record.body;
  const addOns = proposalAddOnRows(deal.terms.addOns);

  return (
    <div className="max-w-3xl">
      <div className="print:hidden">
        <PageHeader
          title="협업 기록"
          description="인쇄 창에서 PDF로 저장할 수 있습니다."
          action={
            <button
              type="button"
              className={primaryBtn}
              disabled={exporting}
              onClick={async () => {
                setExporting(true);
                try {
                  const fresh = await exportLensRecord({
                    data: { dealId: data.id, save: true },
                  });
                  if (!fresh.ok) {
                    toast.error(fresh.error);
                    return;
                  }
                  setRecord(fresh);
                  requestAnimationFrame(() => window.print());
                } catch {
                  toast.error("기록을 내보내지 못했습니다.");
                } finally {
                  setExporting(false);
                }
              }}
            >
              <Download className="size-4" aria-hidden />{" "}
              {exporting ? "준비 중…" : "기록 내보내기"}
            </button>
          }
        />
        {deal.agreedAt ? (
          <Link
            to="/brand/contract/$id"
            params={{ id: data.id }}
            className="lens-button lens-button-secondary mb-4"
          >
            계약서 보기
          </Link>
        ) : null}
      </div>
      <article
        id="lens-record"
        className="lens-panel divide-y divide-border px-5 text-sm leading-relaxed [overflow-wrap:anywhere] sm:px-7 print:border-none print:bg-white print:p-0 print:text-black"
      >
        <header className="py-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {deal.title}
            </h2>
            <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">
              {statusLabel(deal.status)}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
            <dt className="text-muted">크리에이터</dt>
            <dd>
              {influencer.name} @{influencer.username}
            </dd>
            <dt className="text-muted">브랜드</dt>
            <dd>
              {brand.company} · {brand.contactName} · {brand.emailMasked} ·{" "}
              {brand.trustLabel}
            </dd>
          </dl>
        </header>
        <section className="space-y-1 py-4">
          <h3 className="text-base font-semibold">확정 조건</h3>
          <p>
            {FORMAT_LABEL[deal.terms.format]} ·{" "}
            {deal.terms.pricing.fixed_amount_krw != null
              ? formatWon(deal.terms.pricing.fixed_amount_krw)
              : "성과"}
            {deal.terms.pricing.performance_rate_bps
              ? ` · ${deal.terms.pricing.performance_rate_bps / 100}%`
              : ""}
            {" · "}수정 {deal.terms.revisions}회 ·{" "}
            {usageLabel(deal.terms.usage_rights_days)}
          </p>
          {deal.terms.deliverables.description ? (
            <p>{deal.terms.deliverables.description}</p>
          ) : null}
          {deal.terms.notes ? <p>{deal.terms.notes}</p> : null}
          {addOns.length ? (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 py-2">
              {addOns.map(({ id, label, details, amountKrw }) => (
                <div className="contents" key={id}>
                  <dt>{label}</dt>
                  <dd>
                    {[details, amountKrw == null ? "" : formatWon(amountKrw)]
                      .filter(Boolean)
                      .join(" · ") || "금액 협의"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {deal.agreedAt ? (
            <p className="text-muted">확정 {deal.agreedAt}</p>
          ) : null}
          {deal.postUrl ? (
            <div>
              <a
                href={deal.postUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-3"
              >
                {deal.postUrl}
                <ArrowUpRight className="size-4 shrink-0" aria-hidden />
              </a>
              {deal.postedOn || deal.postNote ? (
                <p className="text-muted">
                  {deal.postedOn} {deal.postNote}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
        {deal.settlements.length ? (
          <section className="py-4">
            <h3 className="text-base font-semibold">정산</h3>
            <ul className="mt-2 space-y-2">
              {deal.settlements.map((row, index) => (
                <li key={index}>
                  {formatWon(row.amountKrw)} ·{" "}
                  {row.status === "paid" ? "지급했다고 표시됨" : row.status}{" "}
                  {row.dueOn ?? ""} {row.note ?? ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {messages.length ? (
          <section className="py-4">
            <h3 className="text-base font-semibold">대화</h3>
            <ul className="mt-2 space-y-2">
              {messages.map((message, index) => (
                <li key={index} className="whitespace-pre-wrap">
                  <span className="font-medium text-muted">
                    {message.sender}
                  </span>{" "}
                  {message.body}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <footer className="py-4">
          <p className="text-muted">{String(record.body.platformNote ?? "")}</p>
          <p className="mt-2 break-all font-mono text-sm">{record.hash}</p>
        </footer>
      </article>
    </div>
  );
}
