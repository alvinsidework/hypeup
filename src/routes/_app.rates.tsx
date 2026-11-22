import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { deleteLensRate, getLensDesk, moveLensRate, saveLensRate } from "@/lib/hypeup/lens-api";
import { FORMAT_LABEL, FORMATS, MODELS, priceLabel, usageLabel, type DealFormat, type DealModel, type RateTemplate } from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/_app/rates")({
  loader: () => getLensDesk(),
  component: RatesPage,
});

const MODEL_LABEL: Record<DealModel, string> = { fixed: "고정비", performance: "성과", hybrid: "혼합" };

type Draft = {
  id?: string;
  title: string;
  format: DealFormat;
  model: DealModel;
  amountKrw: string;
  ratePercent: string;
  deliverableCount: string;
  description: string;
  revisions: string;
  turnaroundDays: string;
  usageDays: string;
  paidAds: boolean;
  rawFiles: boolean;
  exclusivityEnabled: boolean;
  exclusivityDays: string;
  exclusivityCategory: string;
  priceHidden: boolean;
  isPublic: boolean;
};

const empty = (): Draft => ({
  title: "",
  format: "reel",
  model: "fixed",
  amountKrw: "",
  ratePercent: "",
  deliverableCount: "1",
  description: "",
  revisions: "1",
  turnaroundDays: "7",
  usageDays: "90",
  paidAds: false,
  rawFiles: false,
  exclusivityEnabled: false,
  exclusivityDays: "30",
  exclusivityCategory: "",
  priceHidden: false,
  isPublic: true,
});

function fromRate(rate: RateTemplate): Draft {
  return {
    id: rate.id,
    title: rate.title,
    format: rate.format,
    model: rate.model,
    amountKrw: rate.amountKrw == null ? "" : String(rate.amountKrw),
    ratePercent: rate.rateBps == null ? "" : String(rate.rateBps / 100),
    deliverableCount: String(rate.deliverableCount),
    description: rate.description,
    revisions: String(rate.revisions),
    turnaroundDays: String(rate.turnaroundDays),
    usageDays: String(rate.usageDays),
    paidAds: rate.paidAds,
    rawFiles: rate.rawFiles,
    exclusivityEnabled: rate.exclusivityDays > 0,
    exclusivityDays: String(rate.exclusivityDays || 30),
    exclusivityCategory: rate.exclusivityCategory ?? "",
    priceHidden: rate.priceHidden,
    isPublic: rate.isPublic,
  };
}

function RatesPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(empty());
  const [busy, setBusy] = useState(false);
  const patch = (partial: Partial<Draft>) => setDraft((current) => ({ ...current, ...partial }));
  const refresh = async () => {
    await router.invalidate();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="단가" description="공개로 둔 항목만 페이지에 나갑니다. 여기서 고쳐도 이미 확정된 건은 바뀌지 않습니다." />
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {data.rates.length === 0 ? <li className="px-4 py-6 text-[13px] text-muted">아직 단가가 없습니다.</li> : null}
        {data.rates.map((rate, index) => (
          <li key={rate.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDraft(fromRate(rate))}>
              <p className="text-[14px]">{rate.title}</p>
              <p className="text-[12px] text-muted">
                {FORMAT_LABEL[rate.format]} · {priceLabel({ model: rate.model, amountKrw: rate.amountKrw, rateBps: rate.rateBps, priceHidden: rate.priceHidden })} · 수정 {rate.revisions}회 · {usageLabel(rate.usageDays)}
                {rate.isPublic ? "" : " · 비공개"}
              </p>
            </button>
            <button type="button" className={ghostBtn} disabled={index === 0} onClick={async () => { await moveLensRate({ data: { id: rate.id, direction: "up" } }); await refresh(); }}>
              위
            </button>
            <button type="button" className={ghostBtn} disabled={index === data.rates.length - 1} onClick={async () => { await moveLensRate({ data: { id: rate.id, direction: "down" } }); await refresh(); }}>
              아래
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-6 rounded-lg border border-border bg-surface p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          const result = await saveLensRate({
            data: {
              id: draft.id,
              title: draft.title,
              format: draft.format,
              model: draft.model,
              amountKrw: draft.amountKrw ? Number(draft.amountKrw) : null,
              ratePercent: draft.ratePercent ? Number(draft.ratePercent) : null,
              deliverableCount: Number(draft.deliverableCount),
              description: draft.description,
              revisions: Number(draft.revisions),
              turnaroundDays: Number(draft.turnaroundDays),
              usageDays: Number(draft.usageDays),
              paidAds: draft.paidAds,
              rawFiles: draft.rawFiles,
              exclusivityEnabled: draft.exclusivityEnabled,
              exclusivityDays: Number(draft.exclusivityDays),
              exclusivityCategory: draft.exclusivityCategory,
              priceHidden: draft.priceHidden,
              isPublic: draft.isPublic,
            },
          });
          setBusy(false);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setDraft(empty());
          toast.success("저장했습니다.");
          await refresh();
        }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium">{draft.id ? "단가 수정" : "단가 추가"}</p>
          {draft.id ? (
            <button
              type="button"
              className="text-[12px] text-danger"
              onClick={async () => {
                if (!draft.id || !window.confirm("이 단가를 삭제할까요?")) return;
                await deleteLensRate({ data: { id: draft.id } });
                setDraft(empty());
                await refresh();
              }}
            >
              삭제
            </button>
          ) : null}
        </div>
        <Field label="제목">
          <input className={inputClass} value={draft.title} maxLength={40} onChange={(event) => patch({ title: event.target.value })} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="형식">
            <select className={inputClass} value={draft.format} onChange={(event) => patch({ format: event.target.value as DealFormat })}>
              {FORMATS.map((format) => <option key={format} value={format}>{FORMAT_LABEL[format]}</option>)}
            </select>
          </Field>
          <Field label="유형">
            <select className={inputClass} value={draft.model} onChange={(event) => patch({ model: event.target.value as DealModel })}>
              {MODELS.map((model) => <option key={model} value={model}>{MODEL_LABEL[model]}</option>)}
            </select>
          </Field>
          {draft.model !== "performance" ? (
            <Field label="금액 (원)">
              <input className={inputClass} inputMode="numeric" value={draft.amountKrw} onChange={(event) => patch({ amountKrw: event.target.value })} />
            </Field>
          ) : null}
          {draft.model !== "fixed" ? (
            <Field label="수수료 (%)">
              <input className={inputClass} inputMode="decimal" value={draft.ratePercent} onChange={(event) => patch({ ratePercent: event.target.value })} />
            </Field>
          ) : null}
          <Field label="산출물 수">
            <input className={inputClass} inputMode="numeric" value={draft.deliverableCount} onChange={(event) => patch({ deliverableCount: event.target.value })} />
          </Field>
          <Field label="수정 횟수">
            <input className={inputClass} inputMode="numeric" value={draft.revisions} onChange={(event) => patch({ revisions: event.target.value })} />
          </Field>
          <Field label="업로드까지 (일)">
            <input className={inputClass} inputMode="numeric" value={draft.turnaroundDays} onChange={(event) => patch({ turnaroundDays: event.target.value })} />
          </Field>
          <Field label="사용 기간 (일)">
            <input className={inputClass} inputMode="numeric" value={draft.usageDays} onChange={(event) => patch({ usageDays: event.target.value })} />
          </Field>
        </div>
        <Field label="설명">
          <textarea className={`${inputClass} h-24 py-2`} value={draft.description} maxLength={280} onChange={(event) => patch({ description: event.target.value })} />
        </Field>
        <label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={draft.paidAds} onChange={(event) => patch({ paidAds: event.target.checked })} />2차 활용</label>
        <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={draft.rawFiles} onChange={(event) => patch({ rawFiles: event.target.checked })} />원본 파일</label>
        <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={draft.exclusivityEnabled} onChange={(event) => patch({ exclusivityEnabled: event.target.checked })} />독점</label>
        {draft.exclusivityEnabled ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="독점 일수"><input className={inputClass} value={draft.exclusivityDays} onChange={(event) => patch({ exclusivityDays: event.target.value })} /></Field>
            <Field label="범주"><input className={inputClass} value={draft.exclusivityCategory} onChange={(event) => patch({ exclusivityCategory: event.target.value })} /></Field>
          </div>
        ) : null}
        <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={draft.priceHidden} onChange={(event) => patch({ priceHidden: event.target.checked })} />금액 비공개. 페이지에는 문의로 표시</label>
        <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={draft.isPublic} onChange={(event) => patch({ isPublic: event.target.checked })} />페이지에 공개</label>
        <div className="mt-4 flex gap-2">
          <button className={primaryBtn} type="submit" disabled={busy}>저장</button>
          <button className={ghostBtn} type="button" onClick={() => setDraft(empty())}>새로 입력</button>
        </div>
      </form>
    </div>
  );
}
