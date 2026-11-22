import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { PublicLayout } from "@/components/public-layout";
import { getLensContract } from "@/lib/hypeup/lens-api";
import {
  formatDay,
  FORMAT_LABEL,
  formatWon,
  priceLabel,
  proposalAddOnRows,
  todaySeoul,
  usageLabel,
} from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/brand/contract/$id")({
  headers: () => ({ "Cache-Control": "private, no-store" }),
  head: () => ({
    meta: [
      { title: "협업 계약서 · Lens" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params }) => {
    if (!z.uuid().safeParse(params.id).success) throw notFound();
    return getLensContract({ data: { dealId: params.id } });
  },
  component: ContractPage,
});

function ContractPage() {
  const contract = Route.useLoaderData();
  if (!contract) {
    return (
      <PublicLayout secondary>
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
          <PageHeader
            title="계약서를 열 수 없습니다"
            description="합의에 참여한 계정으로 로그인해 주세요."
          />
          <Link
            to="/brand"
            search={{}}
            className="lens-button lens-button-secondary"
          >
            브랜드 대시보드
          </Link>
        </main>
      </PublicLayout>
    );
  }

  const { deal } = contract;
  const { terms, brandContract } = deal;
  const rows = proposalAddOnRows(terms.addOns);
  const fields = [
    {
      label: "콘텐츠",
      value: `${FORMAT_LABEL[terms.format]} · ${terms.deliverables.count}건`,
    },
    {
      label: "기본 제안 금액",
      value: priceLabel({
        model: terms.deal_type,
        amountKrw: terms.pricing.fixed_amount_krw,
        rateBps: terms.pricing.performance_rate_bps,
      }),
    },
    {
      label: "제작 기간 / 수정",
      value: `${terms.turnaround_days}일 / ${terms.revisions}회`,
    },
    { label: "기본 활용 범위", value: usageLabel(terms.usage_rights_days) },
    {
      label: "유료 광고",
      value: terms.paid_ads_allowed ? "허용" : "허용 안 함",
    },
    { label: "원본 파일", value: terms.raw_files_included ? "제공" : "미포함" },
    {
      label: "독점 조건",
      value: terms.exclusivity.enabled
        ? `${terms.exclusivity.days}일 · ${terms.exclusivity.category ?? ""}`
        : "",
    },
    {
      label: "잔금 지급",
      value: `게시 후 ${terms.payment_terms.balance_due_days_after_post}일 이내`,
    },
    { label: "제작 범위", value: terms.deliverables.description },
    { label: "메모", value: terms.notes },
  ];
  const brandFields = brandContract
    ? [
        {
          label: brandContract.kind === "company" ? "법인명" : "이름",
          value: brandContract.legalName,
        },
        { label: "사업자등록번호", value: brandContract.registrationNumber },
        {
          label: "생년월일",
          value: brandContract.birthDate
            ? formatDay(brandContract.birthDate)
            : "",
        },
        { label: "전화번호", value: brandContract.phone },
        { label: "주소", value: brandContract.address },
      ]
    : [];

  return (
    <main className="lens-reveal mx-auto min-h-dvh w-full max-w-3xl px-5 py-7 sm:px-8 sm:py-10 print:min-h-0 print:max-w-none print:p-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 print:hidden">
        {contract.role === "brand" ? (
          <Link
            to="/brand/inquiries/$id"
            params={{ id: contract.threadId }}
            className="lens-button lens-button-quiet"
          >
            <ArrowLeft className="size-4" aria-hidden /> 문의로 돌아가기
          </Link>
        ) : (
          <Link
            to="/inquiries/$id"
            params={{ id: contract.threadId }}
            className="lens-button lens-button-quiet"
          >
            <ArrowLeft className="size-4" aria-hidden /> 문의로 돌아가기
          </Link>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="lens-button lens-button-primary"
        >
          <Printer className="size-4" aria-hidden /> 인쇄 / PDF 저장
        </button>
      </div>
      <article className="lens-panel divide-y divide-border px-5 text-sm leading-relaxed [overflow-wrap:anywhere] sm:px-8 print:border-none print:bg-white print:p-0 print:text-black">
        <header className="py-6">
          <h1 className="text-2xl font-semibold tracking-tight">협업 계약서</h1>
          <p className="mt-2 text-lg font-medium">{deal.title}</p>
          <p className="mt-1 text-muted">
            합의일{" "}
            {deal.agreedAt
              ? formatDay(todaySeoul(new Date(deal.agreedAt)))
              : ""}
          </p>
        </header>
        <section className="py-5">
          <h2 className="mb-3 text-base font-semibold">계약 당사자</h2>
          <ContractFields
            fields={[
              { label: "크리에이터", value: contract.creatorName },
              {
                label: "브랜드",
                value: [contract.company, contract.contactName]
                  .filter(Boolean)
                  .join(" · "),
              },
              ...brandFields,
            ]}
          />
        </section>
        <section className="py-5">
          <h2 className="mb-3 text-base font-semibold">확정 조건</h2>
          <ContractFields fields={fields} />
        </section>
        {rows.length ? (
          <section className="py-5">
            <h2 className="mb-3 text-base font-semibold">추가 조건</h2>
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-2 py-2 [break-inside:avoid]"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{row.label}</div>
                    {row.details ? (
                      <div className="whitespace-pre-wrap text-muted">
                        {row.details}
                      </div>
                    ) : null}
                  </div>
                  {row.amountKrw == null ? null : (
                    <strong className="shrink-0">
                      {formatWon(row.amountKrw)}
                    </strong>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {brandContract?.signature ? (
          <section className="py-5 [break-inside:avoid]">
            <h2 className="mb-3 text-base font-semibold">브랜드 서명</h2>
            <img
              src={brandContract.signature}
              alt="브랜드가 등록한 서명"
              className="max-h-32 max-w-full rounded-md bg-white object-contain"
            />
          </section>
        ) : null}
      </article>
    </main>
  );
}

function ContractFields({
  fields,
}: {
  fields: { label: string; value: string }[];
}) {
  return (
    <dl className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-3 gap-y-2">
      {fields
        .filter(({ value }) => value)
        .map(({ label, value }) => (
          <div className="contents" key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ))}
    </dl>
  );
}
