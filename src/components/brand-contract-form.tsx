import { useState } from "react";
import { toast } from "sonner";
import { BrandSignatureField } from "@/components/brand-signature-field";
import { Field, inputClass, primaryBtn } from "@/components/lens-ui";
import { saveBrandDetails } from "@/lib/hypeup/brand-api";
import type { BrandContractDetails } from "@/lib/hypeup/brand-types";
import { todaySeoul } from "@/lib/hypeup/lens-rules";
import { cn } from "@/lib/utils";

const PARTIES = [
  { kind: "individual", label: "개인" },
  { kind: "company", label: "사업자" },
] as const;

export function BrandContractForm({
  details,
  refresh,
}: {
  details: BrandContractDetails;
  refresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(details);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const individual = draft.kind === "individual";
  const patch = (change: Partial<BrandContractDetails>) => {
    setDraft((current) => ({ ...current, ...change }));
  };

  async function save() {
    if (busy || uploading) return;
    setBusy(true);
    try {
      const result = await saveBrandDetails({
        data: {
          ...draft,
          birthDate: individual ? draft.birthDate : "",
          registrationNumber: individual ? "" : draft.registrationNumber,
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft(result.details);
      toast.success("계약 정보를 저장했습니다.");
      await refresh();
    } catch {
      toast.error("계약 정보를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="lens-panel max-w-2xl p-4 sm:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h2 className="text-xl font-semibold tracking-tight">계약 당사자</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        계약에 필요한 항목만 입력하세요. 작성한 정보는 계정에서 관리할 수
        있습니다.
      </p>
      <fieldset className="mt-5" disabled={busy}>
        <legend className="mb-2 text-sm font-medium text-muted">
          당사자 유형
        </legend>
        <div className="grid max-w-xs grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1">
          {PARTIES.map(({ kind, label }) => (
            <label
              key={kind}
              className={cn(
                "relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                draft.kind === kind
                  ? "bg-surface text-fg shadow-xs"
                  : "text-muted",
              )}
            >
              <input
                type="radio"
                name="contract-kind"
                value={kind}
                className="sr-only"
                checked={draft.kind === kind}
                onChange={() => patch({ kind })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid min-w-0 gap-x-3 sm:grid-cols-2" disabled={busy}>
        <Field label={individual ? "성명" : "상호 또는 법인명"}>
          <input
            className={inputClass}
            autoComplete={individual ? "name" : "organization"}
            maxLength={80}
            value={draft.legalName}
            onChange={(event) => patch({ legalName: event.target.value })}
          />
        </Field>
        {individual ? (
          <Field label="생년월일">
            <input
              className={inputClass}
              type="date"
              autoComplete="bday"
              max={todaySeoul()}
              value={draft.birthDate}
              onChange={(event) => patch({ birthDate: event.target.value })}
            />
          </Field>
        ) : (
          <Field label="사업자등록번호">
            <input
              className={inputClass}
              inputMode="numeric"
              maxLength={16}
              placeholder="000-00-00000"
              value={draft.registrationNumber}
              onChange={(event) =>
                patch({ registrationNumber: event.target.value })
              }
            />
          </Field>
        )}
        <div className="sm:col-span-2">
          <Field label="연락처">
            <input
              className={inputClass}
              type="tel"
              autoComplete="tel"
              maxLength={24}
              value={draft.phone}
              onChange={(event) => patch({ phone: event.target.value })}
            />
          </Field>
          <Field label="주소">
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              autoComplete="street-address"
              maxLength={240}
              rows={2}
              value={draft.address}
              onChange={(event) => patch({ address: event.target.value })}
            />
          </Field>
        </div>
      </fieldset>
      <BrandSignatureField
        value={draft.signature}
        disabled={busy}
        onChange={(signature) => patch({ signature })}
        onUploadStateChange={setUploading}
      />
      <div className="mt-6 border-t border-border pt-5">
        <button
          type="submit"
          className={`${primaryBtn} w-full sm:w-auto`}
          disabled={busy || uploading}
        >
          {busy ? "저장 중…" : "계약 정보 저장"}
        </button>
      </div>
    </form>
  );
}
