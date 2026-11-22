import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Images, Plus } from "lucide-react";
import { toast } from "sonner";
import { LensConfirm } from "@/components/lens-confirm";
import { Field, ghostBtn, inputClass, primaryBtn } from "@/components/lens-ui";
import { mediaTypeLabel } from "@/components/media-grid";
import { MediaPreview } from "@/components/media-preview";
import { PageHeader } from "@/components/page-header";
import { PortfolioMediaPicker } from "@/components/portfolio-media-picker";
import { useTaskProgress } from "@/components/route-progress";
import {
  deleteLensWork,
  fetchLensPortfolioMedia,
  getLensPortfolio,
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
import {
  PORTFOLIO_METRICS,
  PORTFOLIO_METRIC_LABEL,
} from "@/lib/hypeup/portfolio-metrics";
import type { MediaItem } from "@/lib/hypeup/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/portfolio")({
  staticData: { workspaceBack: { to: "/page", label: "내 페이지" } },
  loader: () => getLensPortfolio(),
  component: PortfolioPage,
});

type Draft = Omit<WorkItem, "id" | "stats" | "viewCount"> & {
  id?: string;
  statsText: string;
  viewsText: string;
};

const maxViewCount = 2_147_483_647;

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
  instagramMediaId: null,
  publicMetrics: [],
  viewsText: "",
});

function displayCount(value: number | null | undefined) {
  return value == null ? null : value.toLocaleString("ko-KR");
}

function viewCountOf(value: string) {
  if (!/^\d{1,10}$/.test(value)) return null;
  const number = Number(value);
  return number <= maxViewCount ? number : null;
}

function statsText(stats: WorkItem["stats"]) {
  return stats.map(({ label, value }) => `${label} ${value}`).join("\n");
}

function parseStats(text: string) {
  return text
    .split("\n")
    .flatMap((line) => {
      const [label, ...rest] = line.trim().split(/\s+/);
      const value = rest.join(" ");
      return label && value ? [{ label, value }] : [];
    })
    .slice(0, 4);
}

function workDraft(work: WorkItem): Draft {
  const { stats, viewCount, ...rest } = work;
  return {
    ...rest,
    statsText: statsText(stats),
    viewsText: viewCount?.toString() ?? "",
  };
}

function mediaDraft(post: MediaItem): Draft {
  return {
    ...empty(),
    instagramMediaId: post.id,
    title: post.caption?.trim().slice(0, 80).trimEnd() || "Instagram 게시물",
    format:
      post.mediaType === "REELS" || post.mediaType === "VIDEO"
        ? "reel"
        : "feed",
  };
}

function thumbnailOf(work: Draft | WorkItem, media?: MediaItem) {
  return (
    media ?? {
      mediaType: work.format === "reel" ? "REELS" : "IMAGE",
      mediaUrl: null,
      thumbnailUrl: work.coverUrl || null,
    }
  );
}

function PortfolioPage() {
  const { media: storedMedia, works } = Route.useLoaderData();
  const { user, demoMode } = Route.useRouteContext();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [syncedMedia, setSyncedMedia] = useState<MediaItem[] | null>(null);
  const [nextAfter, setNextAfter] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "move" | "delete" | null>(null);
  const pending = useRef(false);
  const activeFetch = useRef<{ finish: () => void } | null>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const pageHeading = useRef<HTMLDivElement>(null);
  const patch = (partial: Partial<Draft>) =>
    setDraft((current) => (current ? { ...current, ...partial } : null));
  const canSync = user.hasToken || demoMode;
  const startProgress = useTaskProgress();
  const media = syncedMedia ?? storedMedia;
  const mediaById = new Map(media.map((item) => [item.id, item]));
  const registered = new Set(
    works.flatMap(({ instagramMediaId }) =>
      instagramMediaId ? [instagramMediaId] : [],
    ),
  );
  const selected = draft?.instagramMediaId
    ? mediaById.get(draft.instagramMediaId)
    : undefined;

  useEffect(
    () => () => {
      activeFetch.current?.finish();
      activeFetch.current = null;
    },
    [],
  );

  async function loadMedia(after?: string) {
    if (activeFetch.current) return;
    const task = startProgress({ label: "Instagram 게시물 불러오는 중" });
    activeFetch.current = task;
    setSyncing(true);
    setSyncError(null);
    try {
      const result = await fetchLensPortfolioMedia({ data: { after } });
      if (activeFetch.current !== task) return;
      if (!result.ok) {
        setSyncError(result.error);
        return;
      }
      setSyncedMedia((current) => {
        const byId = new Map(
          (current ?? storedMedia).map((item) => [item.id, item]),
        );
        for (const item of result.media) byId.set(item.id, item);
        return [...byId.values()].sort((left, right) =>
          (right.timestamp ?? "").localeCompare(left.timestamp ?? ""),
        );
      });
      setNextAfter(result.nextAfter === after ? null : result.nextAfter);
      task.update({ label: "게시물 불러오기 완료", value: 100 });
    } catch {
      if (activeFetch.current === task)
        setSyncError("게시물을 가져오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      task.finish();
      if (activeFetch.current === task) {
        activeFetch.current = null;
        setSyncing(false);
      }
    }
  }

  function focusEditor() {
    window.requestAnimationFrame(() => editorHeading.current?.focus());
  }

  function edit(next: Draft) {
    setDraft(next);
    focusEditor();
  }

  function closeEditor() {
    setDraft(null);
    pageHeading.current?.focus();
  }

  function selectPost(post: MediaItem) {
    if (draft?.instagramMediaId === post.id) return;
    const work = works.find((item) => item.instagramMediaId === post.id);
    setDraft(work ? workDraft(work) : mediaDraft(post));
  }

  async function runAction(
    kind: NonNullable<typeof busy>,
    action: () => Promise<void>,
    failure: string,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(kind);
    try {
      await action();
    } catch {
      toast.error(failure);
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }

  function reorder(id: string, direction: "up" | "down") {
    return runAction(
      "move",
      async () => {
        await moveLensWork({ data: { id, direction } });
        await router.invalidate();
      },
      "순서를 변경하지 못했습니다.",
    );
  }

  function remove(id: string) {
    return runAction(
      "delete",
      async () => {
        await deleteLensWork({ data: { id } });
        closeEditor();
        await router.invalidate();
        toast.success("포트폴리오에서 삭제했습니다.");
      },
      "작업을 삭제하지 못했습니다.",
    );
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const { viewsText, statsText: statsInput, ...fields } = draft;
    const viewCount = viewCountOf(viewsText);
    if (fields.instagramMediaId && viewsText && viewCount === null) {
      toast.error(
        `조회수는 ${displayCount(maxViewCount)} 이하 정수로 입력해 주세요.`,
      );
      return;
    }
    const previous = works.find((work) => work.id === fields.id);
    const stats =
      previous && statsText(previous.stats) === statsInput
        ? previous.stats
        : parseStats(statsInput);
    return runAction(
      "save",
      async () => {
        const result = await saveLensWork({
          data: {
            ...fields,
            ...(fields.instagramMediaId
              ? { postUrl: "", coverUrl: "", postedMonth: "" }
              : {}),
            stats,
            viewCount,
          },
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        closeEditor();
        await router.invalidate();
        toast.success("포트폴리오에 저장했습니다.");
      },
      "작업을 저장하지 못했습니다.",
    );
  }

  return (
    <div className="max-w-5xl">
      <div
        ref={pageHeading}
        tabIndex={-1}
        className="scroll-mt-24 focus:outline-none"
      >
        <PageHeader
          title="포트폴리오"
          description="Instagram 게시물을 골라 추가하고 공개할 성과를 선택하세요."
          action={
            <div className="flex flex-wrap gap-2">
              <PortfolioMediaPicker
                media={media}
                registered={registered}
                canSync={canSync}
                syncing={syncing}
                error={syncError}
                disabled={Boolean(busy)}
                hasOlder={Boolean(nextAfter)}
                onRefresh={() => void loadMedia()}
                onLoadOlder={() => {
                  if (nextAfter) void loadMedia(nextAfter);
                }}
                onSelect={selectPost}
                onSelectedClose={focusEditor}
              />
              <button
                type="button"
                className={ghostBtn}
                disabled={Boolean(busy)}
                onClick={() => edit(empty())}
              >
                <Plus className="size-4" aria-hidden /> 직접 추가
              </button>
            </div>
          }
        />
      </div>

      <div
        className={cn(
          "grid gap-4",
          draft &&
            "items-start lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-6",
        )}
      >
        {draft ? (
          <form
            className="lens-panel min-w-0 p-4 sm:p-6 lg:col-start-2 lg:row-start-1"
            onSubmit={save}
            aria-busy={busy === "save" || busy === "delete"}
          >
            <div className="flex min-h-11 items-center justify-between gap-3">
              <h2
                ref={editorHeading}
                tabIndex={-1}
                className="scroll-mt-24 text-xl font-semibold tracking-tight focus:outline-none"
              >
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
                    disabled={Boolean(busy)}
                  >
                    삭제
                  </button>
                </LensConfirm>
              ) : null}
            </div>
            {draft.instagramMediaId ? (
              <SelectedPost draft={draft} media={selected} />
            ) : null}
            <fieldset disabled={Boolean(busy)}>
              <Field label="제목">
                <input
                  className={inputClass}
                  maxLength={80}
                  required
                  value={draft.title}
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </Field>
              <Field label="브랜드명 (선택)">
                <input
                  className={inputClass}
                  maxLength={60}
                  value={draft.brandName}
                  onChange={(event) => patch({ brandName: event.target.value })}
                />
              </Field>
              {draft.instagramMediaId ? (
                <InstagramMetrics
                  draft={draft}
                  media={selected}
                  patch={patch}
                />
              ) : (
                <ManualFields draft={draft} patch={patch} />
              )}
              <label className="mt-4 flex min-h-12 cursor-pointer items-center gap-3 text-sm font-medium">
                <input
                  className="size-5 shrink-0 accent-accent"
                  type="checkbox"
                  checked={draft.isPublic}
                  onChange={(event) =>
                    patch({ isPublic: event.target.checked })
                  }
                />
                공개 프로필에 표시
              </label>
            </fieldset>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={primaryBtn}
                disabled={Boolean(busy)}
                type="submit"
              >
                {busy === "save" ? "저장 중" : "저장"}
              </button>
              <button
                className={ghostBtn}
                type="button"
                disabled={Boolean(busy)}
                onClick={closeEditor}
              >
                취소
              </button>
            </div>
          </form>
        ) : null}

        {works.length ? (
          <ul
            className="lens-panel min-w-0 divide-y divide-border lg:col-start-1 lg:row-start-1"
            aria-label="저장한 작업"
          >
            {works.map((work, index) => (
              <li
                key={work.id}
                className="flex items-center gap-1 px-2 py-2 sm:gap-2 sm:px-3"
              >
                <button
                  type="button"
                  className={cn(
                    "flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2",
                    draft?.id === work.id &&
                      "bg-accent-soft hover:bg-accent-soft",
                  )}
                  aria-pressed={draft?.id === work.id}
                  disabled={Boolean(busy)}
                  onClick={() => edit(workDraft(work))}
                >
                  <MediaPreview
                    media={thumbnailOf(
                      work,
                      work.instagramMediaId
                        ? mediaById.get(work.instagramMediaId)
                        : undefined,
                    )}
                    className="size-12 shrink-0 rounded-lg sm:size-14"
                  />
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-semibold [overflow-wrap:anywhere] sm:text-base">
                      {work.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {CHANNEL_LABEL[work.channel]} ·{" "}
                      {work.isPublic ? "공개" : "비공개"}
                    </span>
                    {work.brandName ? (
                      <span className="mt-0.5 block truncate text-sm text-muted">
                        {work.brandName}
                      </span>
                    ) : null}
                    {work.highlightLabel ? (
                      <span className="mt-0.5 block truncate text-sm text-muted">
                        {work.highlightLabel} {work.highlightValue}
                      </span>
                    ) : null}
                  </span>
                </button>
                <div className="flex shrink-0 gap-0.5 sm:gap-1">
                  <button
                    type="button"
                    className="lens-icon-button"
                    aria-label={`${work.title} 위로 이동`}
                    disabled={Boolean(busy) || index === 0}
                    onClick={() => void reorder(work.id, "up")}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="lens-icon-button"
                    aria-label={`${work.title} 아래로 이동`}
                    disabled={Boolean(busy) || index === works.length - 1}
                    onClick={() => void reorder(work.id, "down")}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="lens-panel grid min-h-40 justify-items-center gap-2 px-5 py-8 text-center lg:col-start-1 lg:row-start-1">
            <span className="grid size-11 place-items-center rounded-full bg-surface-2 text-muted">
              <Images className="size-5" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-sm font-medium text-muted">
              아직 등록한 작업이 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectedPost({ draft, media }: { draft: Draft; media?: MediaItem }) {
  return (
    <div className="mt-3 flex min-w-0 items-center gap-3 rounded-lg bg-surface-2 p-2.5">
      <MediaPreview
        media={thumbnailOf(draft, media)}
        className="size-14 shrink-0 rounded-lg"
      />
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium [overflow-wrap:anywhere]">
          {media?.caption?.trim() || "선택한 Instagram 게시물"}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          Instagram ·{" "}
          {media ? mediaTypeLabel(media.mediaType) : FORMAT_LABEL[draft.format]}
        </p>
      </div>
    </div>
  );
}

function InstagramMetrics({
  draft,
  media,
  patch,
}: {
  draft: Draft;
  media?: MediaItem;
  patch: (update: Partial<Draft>) => void;
}) {
  const counts = {
    views: displayCount(viewCountOf(draft.viewsText)),
    likes: displayCount(media?.likeCount),
    comments: displayCount(media?.commentsCount),
  };
  return (
    <fieldset className="mt-5">
      <legend className="text-base font-semibold">공개할 지표</legend>
      <p className="mb-2 mt-1 text-sm leading-5 text-muted">
        선택한 항목에 수치가 있으면 공개 프로필에 표시돼요.
      </p>
      <div className="divide-y divide-border rounded-lg border border-border px-3.5">
        {PORTFOLIO_METRICS.map((key) => {
          const label = PORTFOLIO_METRIC_LABEL[key];
          const checked = draft.publicMetrics.includes(key);
          return (
            <label
              key={key}
              className="flex min-h-12 cursor-pointer items-center gap-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-accent"
                aria-label={`${label} 공개`}
                checked={checked}
                onChange={(event) =>
                  patch({
                    publicMetrics: event.target.checked
                      ? [...draft.publicMetrics, key]
                      : draft.publicMetrics.filter((metric) => metric !== key),
                  })
                }
              />
              <span className="flex-1 font-medium">{label}</span>
              <span
                className={cn(
                  "shrink-0 tabular-nums",
                  counts[key] == null && "text-muted",
                )}
              >
                {counts[key] ?? (key === "views" ? "미입력" : "가져온 값 없음")}
              </span>
            </label>
          );
        })}
      </div>
      <Field label="조회수 직접 입력 (선택)">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className={inputClass}
          maxLength={10}
          aria-describedby="portfolio-views-hint"
          value={draft.viewsText}
          onChange={(event) => patch({ viewsText: event.target.value })}
          placeholder="예: 12000"
        />
      </Field>
      <p
        id="portfolio-views-hint"
        className="mt-1.5 text-sm leading-5 text-muted"
      >
        Instagram에서 확인한 조회수를 입력할 수 있어요.
      </p>
    </fieldset>
  );
}

function ManualFields({
  draft,
  patch,
}: {
  draft: Draft;
  patch: (update: Partial<Draft>) => void;
}) {
  return (
    <>
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
            inputMode="url"
            required
            maxLength={400}
            value={draft.coverUrl}
            placeholder="https://"
            onChange={(event) => patch({ coverUrl: event.target.value })}
          />
        </Field>
        <Field label="게시 주소 (선택)">
          <input
            className={inputClass}
            inputMode="url"
            maxLength={400}
            value={draft.postUrl}
            placeholder="https://"
            onChange={(event) => patch({ postUrl: event.target.value })}
          />
        </Field>
        <Field label="게시월 (선택)">
          <input
            className={inputClass}
            maxLength={7}
            value={draft.postedMonth}
            placeholder="2026-03"
            onChange={(event) => patch({ postedMonth: event.target.value })}
          />
        </Field>
        <div className="hidden sm:block" />
        <Field label="강조 수치 이름 (선택)">
          <input
            className={inputClass}
            maxLength={20}
            value={draft.highlightLabel}
            onChange={(event) => patch({ highlightLabel: event.target.value })}
          />
        </Field>
        <Field label="강조 수치 (선택)">
          <input
            className={inputClass}
            maxLength={20}
            value={draft.highlightValue}
            onChange={(event) => patch({ highlightValue: event.target.value })}
          />
        </Field>
      </div>
      <Field label="추가 수치 (한 줄에 이름과 값)">
        <textarea
          className={`${inputClass} h-24 py-2`}
          value={draft.statsText}
          onChange={(event) => patch({ statsText: event.target.value })}
          placeholder={"저장 1.2만\n도달 8만"}
        />
      </Field>
    </>
  );
}
