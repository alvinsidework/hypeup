import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { deleteLensWork, getLensDesk, moveLensWork, saveLensWork } from "@/lib/hypeup/lens-api";
import { CHANNEL_LABEL, CHANNELS, FORMAT_LABEL, FORMATS, type DealFormat, type WorkChannel } from "@/lib/hypeup/lens-rules";
import type { WorkItem } from "@/lib/hypeup/lens-repo";

export const Route = createFileRoute("/_app/portfolio")({
  loader: () => getLensDesk(),
  component: PortfolioPage,
});

type Draft = Omit<WorkItem, "id" | "stats"> & { id?: string; statsText: string };

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
  const [draft, setDraft] = useState<Draft>(empty());
  const [busy, setBusy] = useState(false);
  const patch = (partial: Partial<Draft>) => setDraft((current) => ({ ...current, ...partial }));

  return (
    <div className="max-w-3xl">
      <PageHeader title="포트폴리오" description="커버는 이미지 주소로 넣습니다. 수치는 직접 적은 값이며 인스타그램에서 가져오지 않습니다." />
      <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
        {data.works.length === 0 ? <li className="px-4 py-6 text-[13px] text-muted">아직 작업이 없습니다.</li> : null}
        {data.works.map((work, index) => (
          <li key={work.id} className="flex items-center gap-2 px-4 py-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() =>
                setDraft({
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
                  statsText: work.stats.map((stat) => `${stat.label} ${stat.value}`).join("\n"),
                })
              }
            >
              <p className="truncate text-[14px]">{work.title}</p>
              <p className="text-[12px] text-muted">{work.brandName || "브랜드 비공개"} · {work.highlightLabel} {work.highlightValue}</p>
            </button>
            <button type="button" className={ghostBtn} disabled={index === 0} onClick={async () => { await moveLensWork({ data: { id: work.id, direction: "up" } }); await router.invalidate(); }}>위</button>
            <button type="button" className={ghostBtn} disabled={index === data.works.length - 1} onClick={async () => { await moveLensWork({ data: { id: work.id, direction: "down" } }); await router.invalidate(); }}>아래</button>
          </li>
        ))}
      </ul>
      <form
        className="mt-6 rounded-lg border border-border bg-surface p-4"
        onSubmit={async (event) => {
          event.preventDefault();
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
          setBusy(false);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setDraft(empty());
          toast.success("저장했습니다.");
          await router.invalidate();
        }}
      >
        <div className="flex justify-between">
          <p className="text-[13px] font-medium">{draft.id ? "작업 수정" : "작업 추가"}</p>
          {draft.id ? (
            <button type="button" className="text-[12px] text-danger" onClick={async () => {
              if (!draft.id || !window.confirm("이 작업을 삭제할까요?")) return;
              await deleteLensWork({ data: { id: draft.id } });
              setDraft(empty());
              await router.invalidate();
            }}>삭제</button>
          ) : null}
        </div>
        <Field label="제목"><input className={inputClass} value={draft.title} onChange={(event) => patch({ title: event.target.value })} /></Field>
        <Field label="브랜드명. 비우면 브랜드 비공개"><input className={inputClass} value={draft.brandName} onChange={(event) => patch({ brandName: event.target.value })} /></Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="채널">
            <select className={inputClass} value={draft.channel} onChange={(event) => patch({ channel: event.target.value as WorkChannel })}>
              {CHANNELS.map((channel) => <option key={channel} value={channel}>{CHANNEL_LABEL[channel]}</option>)}
            </select>
          </Field>
          <Field label="형식">
            <select className={inputClass} value={draft.format} onChange={(event) => patch({ format: event.target.value as DealFormat })}>
              {FORMATS.map((format) => <option key={format} value={format}>{FORMAT_LABEL[format]}</option>)}
            </select>
          </Field>
          <Field label="커버 이미지 주소"><input className={inputClass} value={draft.coverUrl} placeholder="https://" onChange={(event) => patch({ coverUrl: event.target.value })} /></Field>
          <Field label="게시 주소"><input className={inputClass} value={draft.postUrl} placeholder="https://" onChange={(event) => patch({ postUrl: event.target.value })} /></Field>
          <Field label="게시월"><input className={inputClass} value={draft.postedMonth} placeholder="2026-03" onChange={(event) => patch({ postedMonth: event.target.value })} /></Field>
          <Field label="강조 수치 이름"><input className={inputClass} value={draft.highlightLabel} maxLength={20} onChange={(event) => patch({ highlightLabel: event.target.value })} /></Field>
          <Field label="강조 수치"><input className={inputClass} value={draft.highlightValue} maxLength={20} onChange={(event) => patch({ highlightValue: event.target.value })} /></Field>
        </div>
        <Field label="추가 수치. 한 줄에 이름과 값">
          <textarea className={`${inputClass} h-24 py-2`} value={draft.statsText} onChange={(event) => patch({ statsText: event.target.value })} placeholder={"저장 1.2만\n도달 8만"} />
        </Field>
        <label className="mt-3 flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={draft.isPublic} onChange={(event) => patch({ isPublic: event.target.checked })} />
          페이지에 공개
        </label>
        <div className="mt-4 flex gap-2">
          <button className={primaryBtn} disabled={busy} type="submit">저장</button>
          <button className={ghostBtn} type="button" onClick={() => setDraft(empty())}>새로 입력</button>
        </div>
      </form>
    </div>
  );
}
