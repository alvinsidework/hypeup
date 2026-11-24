import { useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Receipt, Plus } from "lucide-react";
import { toast } from "sonner";
import { LensConfirm } from "@/components/lens-confirm";
import { PageHeader } from "@/components/page-header";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import {
  deleteLensRate,
  getLensDesk,
  moveLensRate,
  saveLensRate,
} from "@/lib/hypeup/lens-api";
import {
  FORMAT_LABEL,
  FORMATS,
  MODELS,
  priceLabel,
  usageLabel,
  type DealFormat,
  type DealModel,
  type RateTemplate,
} from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/_app/rates")({
  loader: () => getLensDesk(),
  component: RatesPage,
});

const MODEL_LABEL: Record<DealModel, string> = {
  fixed: "고정비",
  performance: "성과",
  hybrid: "혼합",
};

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
  const [draft, setDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);
  const patch = (partial: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...partial }));
  const refresh = async () => {
    await router.invalidate();
  };

  async function reorder(id: string, direction: "up" | "down") {
    setBusy(true);
    try {
      await moveLensRate({ data: { id, direction } });
      await router.invalidate();
    } catch {
      toast.error("순서를 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteLensRate({ data: { id } });
      setDraft(empty());
      await refresh();
    } catch {
      toast.error("단가를 삭제하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function edit(next: Draft) {
    setDraft(next);
    titleInput.current?.focus();
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="단가"
        description="이메일 인증을 마친 브랜드가 먼저 메시지를 보내고 내가 첫 답장을 하면, 금액 공유가 설정된 항목이 해당 대화에 표시됩니다."
        action={
          <button
            type="button"
            className={ghostBtn}
            disabled={busy}
            onClick={() => edit(empty())}
          >
            <Plus className="size-4" aria-hidden /> 단가 추가
          </button>
        }
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:gap-6">
        <ul className="lens-panel divide-y divide-border">
          {data.rates.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted">
              <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-surface-2">
                <Receipt className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              아직 등록한 단가가 없습니다.
            </li>
          ) : null}
          {data.rates.map((rate, index) => (
            <li
              key={rate.id}
              className="flex min-h-20 items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3"
            >
              <button
                type="button"
                className={`min-h-12 min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2 ${draft.id === rate.id ? "bg-accent-soft" : ""}`}
                aria-pressed={draft.id === rate.id}
                disabled={busy}
                onClick={() => edit(fromRate(rate))}
              >
                <p className="text-base font-semibold [overflow-wrap:anywhere]">
                  {rate.title}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {FORMAT_LABEL[rate.format]} · 수정 {rate.revisions}회 ·{" "}
                  {usageLabel(rate.usageDays)}
                  {rate.isPublic && !rate.priceHidden
                    ? " · 답장 후 공유"
                    : " · 나만 보기"}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {rate.priceHidden
                    ? "금액 숨김"
                    : priceLabel({
                        model: rate.model,
                        amountKrw: rate.amountKrw,
                        rateBps: rate.rateBps,
                      })}
                </p>
              </button>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="lens-icon-button"
                  aria-label={`${rate.title} 위로 이동`}
                  disabled={busy || index === 0}
                  onClick={() => void reorder(rate.id, "up")}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className="lens-icon-button"
                  aria-label={`${rate.title} 아래로 이동`}
                  disabled={busy || index === data.rates.length - 1}
                  onClick={() => void reorder(rate.id, "down")}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="lens-panel p-4 sm:p-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              const result = await saveLensRate({
                data: {
                  id: draft.id,
                  title: draft.title,
                  format: draft.format,
                  model: draft.model,
                  amountKrw: draft.amountKrw ? Number(draft.amountKrw) : null,
                  ratePercent: draft.ratePercent
                    ? Number(draft.ratePercent)
                    : null,
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
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              setDraft(empty());
              toast.success("저장했습니다.");
              await refresh();
            } catch {
              toast.error("단가를 저장하지 못했습니다.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {draft.id ? "단가 수정" : "단가 추가"}
            </h2>
            {draft.id ? (
              <LensConfirm
                title="이 단가를 삭제할까요?"
                description="저장한 협업 단가 목록에서 삭제됩니다."
                confirmLabel="삭제"
                onConfirm={() => {
                  if (draft.id) void remove(draft.id);
                }}
              >
                <button
                  type="button"
                  className="lens-button lens-button-quiet text-danger"
                  disabled={busy}
                >
                  삭제
                </button>
              </LensConfirm>
            ) : null}
          </div>
          <Field label="제목">
            <input
              ref={titleInput}
              className={inputClass}
              value={draft.title}
              maxLength={40}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="형식">
              <select
                className={inputClass}
                value={draft.format}
                onChange={(event) =>
                  patch({ format: event.target.value as DealFormat })
                }
              >
                {FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {FORMAT_LABEL[format]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="유형">
              <select
                className={inputClass}
                value={draft.model}
                onChange={(event) =>
                  patch({ model: event.target.value as DealModel })
                }
              >
                {MODELS.map((model) => (
                  <option key={model} value={model}>
                    {MODEL_LABEL[model]}
                  </option>
                ))}
              </select>
            </Field>
            {draft.model !== "performance" ? (
              <Field label="금액 (원)">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={draft.amountKrw}
                  onChange={(event) => patch({ amountKrw: event.target.value })}
                />
              </Field>
            ) : null}
            {draft.model !== "fixed" ? (
              <Field label="수수료 (%)">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={draft.ratePercent}
                  onChange={(event) =>
                    patch({ ratePercent: event.target.value })
                  }
                />
              </Field>
            ) : null}
            <Field label="산출물 수">
              <input
                className={inputClass}
                inputMode="numeric"
                value={draft.deliverableCount}
                onChange={(event) =>
                  patch({ deliverableCount: event.target.value })
                }
              />
            </Field>
            <Field label="수정 횟수">
              <input
                className={inputClass}
                inputMode="numeric"
                value={draft.revisions}
                onChange={(event) => patch({ revisions: event.target.value })}
              />
            </Field>
            <Field label="업로드까지 (일)">
              <input
                className={inputClass}
                inputMode="numeric"
                value={draft.turnaroundDays}
                onChange={(event) =>
                  patch({ turnaroundDays: event.target.value })
                }
              />
            </Field>
            <Field label="사용 기간 (일)">
              <input
                className={inputClass}
                inputMode="numeric"
                value={draft.usageDays}
                onChange={(event) => patch({ usageDays: event.target.value })}
              />
            </Field>
          </div>
          <Field label="설명">
            <textarea
              className={`${inputClass} h-24 py-2`}
              value={draft.description}
              maxLength={280}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </Field>
          <label className="mt-2 flex min-h-11 items-center gap-3 text-sm">
            <input
              className="size-5 shrink-0 accent-accent"
              type="checkbox"
              checked={draft.paidAds}
              onChange={(event) => patch({ paidAds: event.target.checked })}
            />
            2차 활용
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              className="size-5 shrink-0 accent-accent"
              type="checkbox"
              checked={draft.rawFiles}
              onChange={(event) => patch({ rawFiles: event.target.checked })}
            />
            원본 파일
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              className="size-5 shrink-0 accent-accent"
              type="checkbox"
              checked={draft.exclusivityEnabled}
              onChange={(event) =>
                patch({ exclusivityEnabled: event.target.checked })
              }
            />
            독점
          </label>
          {draft.exclusivityEnabled ? (
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Field label="독점 일수">
                <input
                  className={inputClass}
                  value={draft.exclusivityDays}
                  onChange={(event) =>
                    patch({ exclusivityDays: event.target.value })
                  }
                />
              </Field>
              <Field label="범주">
                <input
                  className={inputClass}
                  value={draft.exclusivityCategory}
                  onChange={(event) =>
                    patch({ exclusivityCategory: event.target.value })
                  }
                />
              </Field>
            </div>
          ) : null}
          <label className="mt-3 flex min-h-11 items-center gap-3 border-t border-border pt-3 text-sm">
            <input
              className="size-5 shrink-0 accent-accent"
              type="checkbox"
              checked={draft.isPublic}
              onChange={(event) => patch({ isPublic: event.target.checked })}
            />
            첫 답장 후 브랜드 대화에 공유
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              className="size-5 shrink-0 accent-accent"
              type="checkbox"
              checked={draft.priceHidden}
              onChange={(event) => patch({ priceHidden: event.target.checked })}
            />
            금액 숨기기 (이 항목은 나만 보기)
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryBtn} type="submit" disabled={busy}>
              저장
            </button>
            <button
              className={ghostBtn}
              type="button"
              disabled={busy}
              onClick={() => edit(empty())}
            >
              새로 입력
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
