import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Eye, LoaderCircle, X } from "lucide-react";
import { LensPublicProfile } from "@/components/lens-public-profile";
import { ghostBtn } from "@/components/lens-ui";
import { getLensPagePreview } from "@/lib/hypeup/lens-api";
import { isHttpUrl, validateUsername } from "@/lib/hypeup/lens-rules";
import type { PageDraft, PublicPage } from "@/lib/hypeup/lens-repo";
import {
  PROFILE_LAYOUTS,
  type ProfileLayout,
} from "@/lib/hypeup/profile-layout";
import { cn } from "@/lib/utils";

const OPTIONS: Record<ProfileLayout, { label: string; description: string }> = {
  sns: { label: "SNS", description: "프로필과 사진 그리드" },
  magazine: {
    label: "매거진",
    description: "큰 대표 사진과 포트폴리오 갤러리",
  },
};

export function ProfileLayoutEditor({
  draft,
  photo,
  preparingPhoto,
  onChange,
}: {
  draft: PageDraft;
  photo: string | null;
  preparingPhoto: boolean;
  onChange: (layout: ProfileLayout) => void;
}) {
  return (
    <section
      className="lens-panel px-4 py-5 sm:p-6 xl:col-span-2"
      aria-labelledby="profile-layout-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          id="profile-layout-heading"
          className="text-lg font-semibold tracking-tight"
        >
          프로필 레이아웃
        </h2>
        <DraftPreview
          draft={draft}
          photo={photo}
          disabled={preparingPhoto}
          onChange={onChange}
        />
      </div>
      <fieldset className="mt-3 grid min-w-0 grid-cols-2 gap-2.5 sm:max-w-2xl sm:gap-3">
        <legend className="sr-only">공개 프로필 레이아웃</legend>
        {PROFILE_LAYOUTS.map((layout) => (
          <label
            key={layout}
            className={cn(
              "relative min-w-0 cursor-pointer rounded-lg border p-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-accent sm:p-3",
              draft.layout === layout
                ? "border-accent bg-accent-soft"
                : "border-border hover:bg-surface-2",
            )}
          >
            <input
              type="radio"
              name="profile-layout"
              value={layout}
              className="sr-only"
              checked={draft.layout === layout}
              onChange={() => onChange(layout)}
            />
            <LayoutThumbnail layout={layout} />
            <span className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[15px] font-semibold">
                {OPTIONS[layout].label}
              </span>
              <span
                aria-hidden
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border",
                  draft.layout === layout
                    ? "border-accent bg-surface"
                    : "border-subtle",
                )}
              >
                {draft.layout === layout ? (
                  <span className="size-2 rounded-full bg-accent" />
                ) : null}
              </span>
            </span>
            <span className="mt-0.5 block text-sm leading-snug text-muted [word-break:keep-all]">
              {OPTIONS[layout].description}
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

function LayoutThumbnail({ layout }: { layout: ProfileLayout }) {
  if (layout === "magazine") {
    return (
      <span
        aria-hidden
        className="flex h-20 flex-col gap-1.5 overflow-hidden rounded-md border border-border bg-surface px-3 py-2 text-muted sm:h-24"
      >
        <span className="flex shrink-0 items-center justify-between gap-2">
          <span className="h-1 w-1/4 rounded-full bg-current/50" />
          <span className="h-2 w-6 rounded-full bg-accent" />
        </span>
        <span className="flex flex-1 flex-col justify-end gap-1 bg-surface-2 p-2">
          <span className="h-1.5 w-[55%] bg-current/80" />
          <span className="h-1 w-[38%] rounded-full bg-current/45" />
        </span>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="flex h-20 flex-col justify-center gap-2 overflow-hidden rounded-md border border-border bg-surface px-3 text-muted sm:h-24"
    >
      <span className="flex items-center gap-2">
        <span className="size-5 shrink-0 rounded-full bg-surface-2" />
        <span className="grid flex-1 gap-1">
          <span className="h-1 w-1/2 rounded-full bg-current/65" />
          <span className="h-1 w-1/3 rounded-full bg-current/25" />
        </span>
      </span>
      <span className="grid grid-cols-3 gap-1">
        <span className="h-6 rounded-sm bg-surface-2" />
        <span className="h-6 rounded-sm bg-surface-2" />
        <span className="h-6 rounded-sm bg-surface-2" />
      </span>
    </span>
  );
}

type PreviewState =
  { status: "loading" | "error" } | { status: "ready"; page: PublicPage };

function DraftPreview({
  draft,
  photo,
  disabled,
  onChange,
}: {
  draft: PageDraft;
  photo: string | null;
  disabled: boolean;
  onChange: (layout: ProfileLayout) => void;
}) {
  const [preview, setPreview] = useState<PreviewState>({ status: "loading" });
  const generation = useRef(0);

  async function loadPreview() {
    const request = ++generation.current;
    setPreview({ status: "loading" });
    try {
      const page = await getLensPagePreview();
      if (request === generation.current) setPreview({ status: "ready", page });
    } catch {
      if (request === generation.current) setPreview({ status: "error" });
    }
  }

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (open) void loadPreview();
        else generation.current += 1;
      }}
    >
      <Dialog.Trigger type="button" className={ghostBtn} disabled={disabled}>
        <Eye className="size-4" aria-hidden /> 편집 중 미리보기
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="lens-overlay" />
        <Dialog.Content className="lens-sheet fixed inset-0 z-50 m-auto flex h-dvh w-full max-w-5xl flex-col overflow-hidden rounded-none bg-bg sm:h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-bold tracking-tight">
                편집 중 미리보기
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-sm leading-snug text-muted">
                변경사항은 저장하면 적용됩니다.
              </Dialog.Description>
            </div>
            <fieldset className="order-last grid w-full grid-cols-2 gap-1 rounded-md bg-surface-2 p-1 sm:order-0 sm:w-auto">
              <legend className="sr-only">미리 볼 레이아웃</legend>
              {PROFILE_LAYOUTS.map((layout) => (
                <label
                  key={layout}
                  className={cn(
                    "grid min-h-11 cursor-pointer place-items-center rounded-lg px-4 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                    draft.layout === layout
                      ? "bg-surface text-fg shadow-xs"
                      : "text-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="preview-profile-layout"
                    value={layout}
                    className="sr-only"
                    checked={draft.layout === layout}
                    onChange={() => onChange(layout)}
                  />
                  {OPTIONS[layout].label}
                </label>
              ))}
            </fieldset>
            <Dialog.Close
              type="button"
              className="lens-icon-button"
              aria-label="미리보기 닫기"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div
            className={cn(
              "min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-7",
              draft.layout === "magazine" && "bg-surface",
            )}
          >
            {preview.status === "ready" ? (
              <LensPublicProfile
                page={projectDraft(preview.page, draft, photo)}
                preview
              />
            ) : preview.status === "loading" ? (
              <p
                role="status"
                className="flex min-h-44 items-center justify-center gap-2 text-sm text-muted"
              >
                <LoaderCircle
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden
                />
                <span className="sr-only">미리보기를 불러오는 중</span>
              </p>
            ) : (
              <div
                role="alert"
                className="flex min-h-44 flex-col items-center justify-center gap-3 text-center text-sm text-muted"
              >
                <p>미리보기를 불러오지 못했습니다.</p>
                <button
                  type="button"
                  className={ghostBtn}
                  onClick={() => void loadPreview()}
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function projectDraft(
  page: PublicPage,
  draft: PageDraft,
  photo: string | null,
): PublicPage {
  const address = validateUsername(draft.username);
  const username = address.ok ? address.username : page.username;
  return {
    ...page,
    layout: draft.layout,
    username,
    displayName: draft.displayName.trim() || username,
    bio: draft.bio.trim(),
    categories: draft.categories,
    avatarUrl: photo,
    channels: [
      {
        key: "instagram",
        label: "인스타그램",
        handle: draft.instagramHandle,
        followers: draft.instagramFollowers,
      },
      {
        key: "tiktok",
        label: "틱톡",
        handle: draft.tiktokHandle,
        followers: draft.tiktokFollowers,
      },
      {
        key: "youtube",
        label: "유튜브",
        handle: draft.youtubeHandle,
        followers: draft.youtubeFollowers,
      },
    ].flatMap((channel) => {
      const handle = channel.handle.trim().replace(/^@+/, "").slice(0, 30);
      if (!handle) return [];
      const count = channel.followers;
      const followers =
        count != null &&
        Number.isInteger(count) &&
        count >= 0 &&
        count <= 1_000_000_000
          ? count
          : null;
      return [{ ...channel, handle, followers }];
    }),
    links: draft.links.flatMap(({ label, url }) => {
      const name = label.trim();
      const address = url.trim();
      return name && isHttpUrl(address) ? [{ label: name, url: address }] : [];
    }),
  };
}
