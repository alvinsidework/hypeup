import { useRef, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { LensConfirm } from "@/components/lens-confirm";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { ProposalFields } from "@/components/proposal-form";
import { deleteBrandTemplate, saveBrandTemplate } from "@/lib/hypeup/brand-api";
import type { BrandProposalTemplate } from "@/lib/hypeup/brand-types";
import {
  EMPTY_PROPOSAL,
  FORMAT_LABEL,
  parseTerms,
  priceLabel,
  type DealFormat,
  type DealModel,
} from "@/lib/hypeup/lens-rules";

type Draft = Omit<BrandProposalTemplate, "id"> & { id?: string };

function emptyDraft(): Draft {
  return { name: "", terms: { ...EMPTY_PROPOSAL } };
}

export function BrandTemplateManager({
  templates,
  refresh,
}: {
  templates: BrandProposalTemplate[];
  refresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const busy = pending !== null;
  const nameRef = useRef<HTMLInputElement>(null);

  function edit(next: Draft) {
    setDraft(next);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  async function save(current: Draft) {
    if (busy || !current.name.trim()) return;
    const parsed = parseTerms(current.terms);
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }
    setPending("save");
    try {
      const result = await saveBrandTemplate({ data: current });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await refresh();
      setDraft(null);
      toast.success("제안 템플릿을 저장했습니다.");
    } catch {
      toast.error("제안 템플릿을 저장하지 못했습니다.");
    } finally {
      setPending(null);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setPending("delete");
    try {
      const result = await deleteBrandTemplate({ data: { id } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await refresh();
      setDraft((current) => (current?.id === id ? null : current));
      toast.success("템플릿을 삭제했습니다.");
    } catch {
      toast.error("템플릿을 삭제하지 못했습니다.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="brand-templates-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="brand-templates-heading"
            className="text-xl font-semibold tracking-tight"
          >
            제안 템플릿
          </h2>
          <p className="mt-1 text-sm text-muted">
            자주 쓰는 협업 조건을 저장해 대화에서 불러올 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          className={ghostBtn}
          disabled={busy}
          onClick={() => edit(emptyDraft())}
        >
          <Plus className="size-4" aria-hidden /> 새 템플릿
        </button>
      </div>
      <div
        className={
          draft
            ? "grid items-start gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
            : ""
        }
      >
        {templates.length ? (
          <ul className="lens-panel divide-y divide-border">
            {templates.map((template) => (
              <li key={template.id} className="p-1.5">
                <button
                  type="button"
                  className={`flex min-h-16 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-2 ${draft?.id === template.id ? "bg-accent-soft" : ""}`}
                  aria-pressed={draft?.id === template.id}
                  disabled={busy}
                  onClick={() => edit(template)}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold [overflow-wrap:anywhere]">
                      {template.name}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {FORMAT_LABEL[template.terms.format as DealFormat]} ·{" "}
                      {priceLabel({
                        model: template.terms.model as DealModel,
                        amountKrw: template.terms.amountKrw ?? null,
                        rateBps: template.terms.ratePercent
                          ? Math.round(template.terms.ratePercent * 100)
                          : null,
                      })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="저장한 제안 템플릿이 없습니다" />
        )}
        {draft ? (
          <form
            className="lens-panel min-w-0 p-4 sm:p-6"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void save(draft);
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-semibold tracking-tight">
                {draft.id ? "템플릿 수정" : "새 템플릿"}
              </h3>
              {draft.id ? (
                <LensConfirm
                  title="이 템플릿을 삭제할까요?"
                  description="저장한 템플릿 목록에서 지워집니다."
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
            <fieldset disabled={busy} className="min-w-0">
              <Field label="템플릿 이름">
                <input
                  className={inputClass}
                  ref={nameRef}
                  value={draft.name}
                  required
                  maxLength={60}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </Field>
              <ProposalFields
                value={draft.terms}
                onChange={(terms) => setDraft({ ...draft, terms })}
                disabled={busy}
              />
            </fieldset>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={ghostBtn}
                disabled={busy}
                onClick={() => setDraft(null)}
              >
                닫기
              </button>
              <button
                type="submit"
                className={primaryBtn}
                disabled={busy || !draft.name.trim()}
              >
                {pending === "save" ? "저장 중…" : "템플릿 저장"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
