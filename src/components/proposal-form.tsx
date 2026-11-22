import { Check, ChevronDown, Plus, X } from "lucide-react";
import { Field, ghostBtn, inputClass } from "@/components/lens-ui";
import {
  FORMAT_LABEL,
  FORMATS,
  MODEL_LABEL,
  MODELS,
  PRICED_ADD_ONS,
  priceLabel,
  usageLabel,
  type CustomAddOn,
  type PricedAddOn,
  type TermsInput,
} from "@/lib/hypeup/lens-rules";

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  required = false,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        type="number"
        inputMode={step === 1 ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={step}
        required={required}
        value={value ?? ""}
        onChange={(event) => {
          const number = event.currentTarget.valueAsNumber;
          onChange(Number.isFinite(number) ? number : null);
        }}
      />
    </Field>
  );
}

const PRICED_OPTIONS = Object.entries(PRICED_ADD_ONS) as [
  PricedAddOn,
  string,
][];

function ProposalAddOnFields({
  value,
  onChange,
}: {
  value: TermsInput["addOns"];
  onChange: (value: TermsInput["addOns"]) => void;
}) {
  const addOns = value ?? {};
  const custom = addOns.custom ?? [];
  const secondaryUse = addOns.secondaryUse;
  const hasAddOns =
    PRICED_OPTIONS.some(([key]) => addOns[key] !== undefined) ||
    !!secondaryUse ||
    custom.length > 0;
  const setPrice = (key: PricedAddOn, amountKrw: number | null | undefined) =>
    onChange({ ...addOns, [key]: amountKrw });
  const updateCustom = (index: number, change: Partial<CustomAddOn>) =>
    onChange({
      ...addOns,
      custom: custom.map((item, i) =>
        i === index ? { ...item, ...change } : item,
      ),
    });

  return (
    <section
      className="mt-5 border-t border-border pt-4"
      aria-label="추가 옵션"
    >
      <h3 className="text-sm font-semibold">추가 옵션</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRICED_OPTIONS.map(([key, label]) => {
          const selected = addOns[key] !== undefined;
          return (
            <AddOption
              key={key}
              label={label}
              selected={selected}
              onClick={() => setPrice(key, selected ? undefined : null)}
            />
          );
        })}
        <AddOption
          label="2차 활용"
          selected={Boolean(secondaryUse)}
          onClick={() =>
            onChange({
              ...addOns,
              secondaryUse: secondaryUse
                ? undefined
                : { months: 1, amountKrw: null },
            })
          }
        />
        <AddOption
          label="직접 추가"
          onClick={() =>
            onChange({
              ...addOns,
              custom: [...custom, { label: "", details: "" }],
            })
          }
        />
      </div>
      {hasAddOns ? (
        <div className="mt-3 space-y-2">
          {PRICED_OPTIONS.map(([key, label]) =>
            addOns[key] !== undefined ? (
              <div
                key={key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-xl border border-border px-3 pb-3"
              >
                <NumberField
                  label={`${label} (원)`}
                  value={addOns[key]}
                  required
                  onChange={(amount) => setPrice(key, amount)}
                />
                <RemoveOption
                  label={label}
                  onClick={() => setPrice(key, undefined)}
                />
              </div>
            ) : null,
          )}
          {secondaryUse ? (
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">2차 활용</p>
                <RemoveOption
                  label="2차 활용"
                  onClick={() =>
                    onChange({ ...addOns, secondaryUse: undefined })
                  }
                />
              </div>
              <div className="grid gap-x-3 @min-[25rem]:grid-cols-2">
                <NumberField
                  label="2차 활용 기간 (개월)"
                  value={secondaryUse.months}
                  min={1}
                  required
                  onChange={(months) =>
                    onChange({
                      ...addOns,
                      secondaryUse: { ...secondaryUse, months },
                    })
                  }
                />
                <NumberField
                  label="2차 활용 총액 (원)"
                  value={secondaryUse.amountKrw}
                  required
                  onChange={(amountKrw) =>
                    onChange({
                      ...addOns,
                      secondaryUse: { ...secondaryUse, amountKrw },
                    })
                  }
                />
              </div>
            </div>
          ) : null}
          {custom.map((item, index) => (
            <div key={index} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  직접 추가한 옵션 {index + 1}
                </p>
                <RemoveOption
                  label={`직접 추가한 옵션 ${index + 1}`}
                  onClick={() =>
                    onChange({
                      ...addOns,
                      custom: custom.filter((_, i) => i !== index),
                    })
                  }
                />
              </div>
              <Field label="옵션 이름">
                <input
                  className={inputClass}
                  value={item.label}
                  required
                  maxLength={80}
                  onChange={(event) =>
                    updateCustom(index, { label: event.target.value })
                  }
                />
              </Field>
              <Field label="옵션 설명">
                <textarea
                  className={`${inputClass} min-h-16 resize-y`}
                  rows={2}
                  value={item.details}
                  maxLength={280}
                  onChange={(event) =>
                    updateCustom(index, { details: event.target.value })
                  }
                />
              </Field>
              <NumberField
                label="옵션 금액 (원, 선택)"
                value={item.amountKrw}
                onChange={(amountKrw) => updateCustom(index, { amountKrw })}
              />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AddOption({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  const Icon = selected ? Check : Plus;
  return (
    <button
      className={`${ghostBtn} !min-h-11 !px-3 aria-pressed:bg-accent-soft`}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

function RemoveOption({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="lens-button lens-button-quiet !min-h-11 !min-w-11 !px-0"
      type="button"
      aria-label={`${label} 삭제`}
      onClick={onClick}
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}

export function ProposalFields({
  value,
  onChange,
  disabled,
}: {
  value: TermsInput;
  onChange: (value: TermsInput) => void;
  disabled?: boolean;
}) {
  const patch = (change: Partial<TermsInput>) =>
    onChange({ ...value, ...change });

  return (
    <fieldset className="@container min-w-0" disabled={disabled}>
      <legend className="sr-only">협업 조건</legend>
      <Field label="제목">
        <input
          className={inputClass}
          value={value.title}
          required
          maxLength={80}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>
      <div className="grid gap-x-3 @min-[25rem]:grid-cols-2">
        <Field label="형식">
          <select
            className={inputClass}
            value={value.format}
            onChange={(event) => patch({ format: event.target.value })}
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
            value={value.model}
            onChange={(event) => patch({ model: event.target.value })}
          >
            {MODELS.map((model) => (
              <option key={model} value={model}>
                {MODEL_LABEL[model]}
              </option>
            ))}
          </select>
        </Field>
        {value.model !== "performance" ? (
          <NumberField
            label="금액 (원)"
            value={value.amountKrw}
            min={1}
            required
            onChange={(amountKrw) => patch({ amountKrw })}
          />
        ) : null}
        {value.model !== "fixed" ? (
          <NumberField
            label="수수료 (%)"
            value={value.ratePercent}
            min={0.01}
            max={100}
            step={0.01}
            required
            onChange={(ratePercent) => patch({ ratePercent })}
          />
        ) : null}
        <NumberField
          label="수정 횟수"
          value={value.revisions}
          max={5}
          onChange={(revisions) => patch({ revisions: revisions ?? undefined })}
        />
        <NumberField
          label="사용 기간 (일, 0이면 협의)"
          value={value.usageDays}
          max={3650}
          onChange={(usageDays) => patch({ usageDays: usageDays ?? undefined })}
        />
        <NumberField
          label="잔금 (게시 후 일)"
          value={value.balanceDays}
          max={365}
          onChange={(balanceDays) =>
            patch({ balanceDays: balanceDays ?? undefined })
          }
        />
      </div>
      <details className="group mt-4 rounded-xl border border-border px-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          산출물·권리 세부 조건
          <ChevronDown
            className="size-4 text-muted group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="border-t border-border pb-4">
          <div className="grid gap-x-3 @min-[25rem]:grid-cols-2">
            <NumberField
              label="산출물 수"
              value={value.deliverableCount}
              min={1}
              max={20}
              onChange={(deliverableCount) =>
                patch({ deliverableCount: deliverableCount ?? undefined })
              }
            />
            <NumberField
              label="업로드까지 (일)"
              value={value.turnaroundDays}
              min={1}
              max={60}
              onChange={(turnaroundDays) =>
                patch({ turnaroundDays: turnaroundDays ?? undefined })
              }
            />
          </div>
          <Field label="산출물 설명">
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              rows={2}
              value={value.description ?? ""}
              maxLength={280}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </Field>
          <div className="mt-3 flex flex-wrap gap-x-4">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-accent"
                checked={value.paidAds === true}
                onChange={(event) => patch({ paidAds: event.target.checked })}
              />
              광고 허용
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-accent"
                checked={value.rawFiles === true}
                onChange={(event) => patch({ rawFiles: event.target.checked })}
              />
              원본 파일 제공
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-accent"
                checked={value.exclusivityEnabled === true}
                onChange={(event) =>
                  patch({
                    exclusivityEnabled: event.target.checked,
                    exclusivityDays: value.exclusivityDays || 30,
                  })
                }
              />
              독점 조건
            </label>
          </div>
          {value.exclusivityEnabled ? (
            <div className="grid gap-x-3 @min-[25rem]:grid-cols-2">
              <NumberField
                label="독점 기간 (일)"
                value={value.exclusivityDays}
                min={1}
                max={365}
                onChange={(exclusivityDays) =>
                  patch({ exclusivityDays: exclusivityDays ?? undefined })
                }
              />
              <Field label="독점 범주">
                <input
                  className={inputClass}
                  value={value.exclusivityCategory ?? ""}
                  maxLength={40}
                  onChange={(event) =>
                    patch({ exclusivityCategory: event.target.value })
                  }
                />
              </Field>
            </div>
          ) : null}
          <Field label="메모">
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              rows={2}
              value={value.notes ?? ""}
              maxLength={500}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </Field>
        </div>
      </details>
      <ProposalAddOnFields
        value={value.addOns}
        onChange={(addOns) => patch({ addOns })}
      />
      <p className="mt-4 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted tabular-nums">
        {priceLabel({
          model: value.model as keyof typeof MODEL_LABEL,
          amountKrw: value.amountKrw ?? null,
          rateBps:
            value.ratePercent == null
              ? null
              : Math.round(value.ratePercent * 100),
        })}
        {" · "}
        {usageLabel(value.usageDays ?? 0)}
      </p>
    </fieldset>
  );
}
