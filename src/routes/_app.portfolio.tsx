import { useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Images, Plus } from "lucide-react";
import { toast } from "sonner";
import { LensConfirm } from "@/components/lens-confirm";
import { PageHeader } from "@/components/page-header";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import {
  deleteLensWork,
  getLensDesk,
  moveLensWork,
  saveLensWork,
} from "@/lib/hypeup/lens-api";
import {
  CHANNEL_LABEL,
  CHANNELS,
  FORMAT_LABEL,
  FORMATS,
  type DealFormat,
  type WorkChannel,
} from "@/lib/hypeup/lens-rules";
import type { WorkItem } from "@/lib/hypeup/lens-repo";

export const Route = createFileRoute("/_app/portfolio")({
  loader: () => getLensDesk(),
  component: PortfolioPage,
});

type Draft = Omit<WorkItem, "id" | "stats"> & {
  id?: string;
  statsText: string;
};

const empty = (): Draft => ({
  title: "",
  brandName: "",
  channel: "instagram",
  format: "reel",
  postUrl: "",
  coverUrl: "",
  postedMonth: "",
  highlightLabel: "",
  highlightValue: "",
  statsText: "",
  isPublic: true,
});

function PortfolioPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const titleInput = useRef<HTMLInputElement>(null);
  const patch = (partial: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...partial }));

  async function reorder(id: string, direction: "up" | "down") {
    setBusy(true);
    try {
      await moveLensWork({ data: { id, direction } });
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
      await deleteLensWork({ data: { id } });
      setDraft(empty());
      await router.invalidate();
    } catch {
      toast.error("작업을 삭제하지 못했습니다.");
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
        title="포트폴리오"
        description="공개 페이지에 보여줄 작업을 관리합니다. 커버는 이미지 주소로 넣고 성과 수치는 직접 입력합니다."
        action={
          <button
            type="button"
            className={ghostBtn}
            disabled={busy}
            onClick={() => edit(empty())}
          >
            <Plus className="size-4" aria-hidden /> 작업 추가
          </button>
        }
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] xl:gap-6">
        <ul className="lens-panel divide-y divide-border">
          {data.works.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted">
              <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-surface-2">
                <Images className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              아직 등록한 작업이 없습니다.
            </li>
          ) : null}
          {data.works.map((work, index) => (
            <li
              key={work.id}
              className="flex min-h-20 items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3"
            >
              <button
                type="button"
                className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2 ${draft.id === work.id ? "bg-accent-soft" : ""}`}
                aria-pressed={draft.id === work.id}
                disabled={busy}
                onClick={() =>
                  edit({
                    id: work.id,
                    title: work.title,
                    brandName: work.brandName,
                    channel: work.channel,
                    format: work.format,
                    postUrl: work.postUrl,
                    coverUrl: work.coverUrl,
                    postedMonth: work.postedMonth,
                    highlightLabel: work.highlightLabel,
                    highlightValue: work.highlightValue,
                    isPublic: work.isPublic,
                    statsText: work.stats
                      .map((stat) => `${stat.label} ${stat.value}`)
                      .join("\n"),
                  })
                }
              >
                {work.coverUrl ? (
                  <img
                    className="size-11 shrink-0 rounded-lg object-cover sm:size-12"
                    src={work.coverUrl}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted sm:size-12">
                    <Images className="size-5" strokeWidth={1.5} aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-base font-semibold [overflow-wrap:anywhere]">
                    {work.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted [overflow-wrap:anywhere]">
                    {work.brandName || "브랜드 비공개"}
                    {work.isPublic ? "" : " · 비공개"}
                  </p>
                  {work.highlightLabel ? (
                    <p className="mt-0.5 text-sm font-medium [overflow-wrap:anywhere]">
                      {work.highlightLabel} {work.highlightValue}
                    </p>
                  ) : null}
                </div>
              </button>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="lens-icon-button"
                  aria-label={`${work.title} 위로 이동`}
                  disabled={busy || index === 0}
                  onClick={() => void reorder(work.id, "up")}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  className="lens-icon-button"
                  aria-label={`${work.title} 아래로 이동`}
                  disabled={busy || index === data.works.length - 1}
                  onClick={() => void reorder(work.id, "down")}
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
            const stats = draft.statsText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .slice(0, 4)
              .map((line) => {
                const [label, ...rest] = line.split(/\s+/);
                return { label: label ?? "", value: rest.join(" ") };
              })
              .filter((stat) => stat.label && stat.value);
            setBusy(true);
            try {
              const result = await saveLensWork({
                data: {
                  id: draft.id,
                  title: draft.title,
                  brandName: draft.brandName,
                  channel: draft.channel,
                  format: draft.format,
                  postUrl: draft.postUrl,
                  coverUrl: draft.coverUrl,
                  postedMonth: draft.postedMonth,
                  highlightLabel: draft.highlightLabel,
                  highlightValue: draft.highlightValue,
                  stats,
                  isPublic: draft.isPublic,
                },
              });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              setDraft(empty());
              toast.success("저장했습니다.");
              await router.invalidate();
            } catch {
              toast.error("작업을 저장하지 못했습니다.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {draft.id ? "작업 수정" : "작업 추가"}
            </h2>
            {draft.id ? (
              <LensConfirm
                title="이 작업을 삭제할까요?"
                description="관리 목록과 공개 페이지에서 삭제됩니다."
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
              onChange={(event) => patch({ title: event.target.value })}
            />
          </Field>
          <Field label="브랜드명. 비우면 브랜드 비공개">
            <input
              className={inputClass}
              value={draft.brandName}
              onChange={(event) => patch({ brandName: event.target.value })}
            />
          </Field>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Field label="채널">
              <select
                className={inputClass}
                value={draft.channel}
                onChange={(event) =>
                  patch({ channel: event.target.value as WorkChannel })
                }
              >
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {CHANNEL_LABEL[channel]}
                  </option>
                ))}
              </select>
            </Field>
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
            <Field label="커버 이미지 주소">
              <input
                className={inputClass}
                value={draft.coverUrl}
                placeholder="https://"
                onChange={(event) => patch({ coverUrl: event.target.value })}
              />
            </Field>
            <Field label="게시 주소">
              <input
                className={inputClass}
                value={draft.postUrl}
                placeholder="https://"
                onChange={(event) => patch({ postUrl: event.target.value })}
              />
            </Field>
            <Field label="게시월">
              <input
                className={inputClass}
                value={draft.postedMonth}
                placeholder="2026-03"
                onChange={(event) => patch({ postedMonth: event.target.value })}
              />
            </Field>
            <Field label="강조 수치 이름">
              <input
                className={inputClass}
                value={draft.highlightLabel}
                maxLength={20}
                onChange={(event) =>
                  patch({ highlightLabel: event.target.value })
                }
              />
            </Field>
            <Field label="강조 수치">
              <input
                className={inputClass}
                value={draft.highlightValue}
                maxLength={20}
                onChange={(event) =>
                  patch({ highlightValue: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="추가 수치. 한 줄에 이름과 값">
            <textarea
              className={`${inputClass} h-24 py-2`}
              value={draft.statsText}
              onChange={(event) => patch({ statsText: event.target.value })}
              placeholder={"저장 1.2만\n도달 8만"}
            />
          </Field>
          <label className="mt-2 flex min-h-11 items-center gap-3 text-sm">
            <input
              className="size-5 shrink-0 accent-accent"
              type="checkbox"
              checked={draft.isPublic}
              onChange={(event) => patch({ isPublic: event.target.checked })}
            />
            페이지에 공개
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={primaryBtn} disabled={busy} type="submit">
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
