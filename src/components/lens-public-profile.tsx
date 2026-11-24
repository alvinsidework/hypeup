import * as Avatar from "@radix-ui/react-avatar";
import * as Dialog from "@radix-ui/react-dialog";
import { Link, useRouter } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bookmark,
  Clapperboard,
  Copy,
  LoaderCircle,
  Mail,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MediaPreview } from "@/components/media-preview";
import { setBrandFavorite } from "@/lib/hypeup/brand-api";
import { formatCount, initial } from "@/lib/hypeup/format";
import type { PublicPage } from "@/lib/hypeup/lens-repo";

type PublicWork = PublicPage["works"][number];
type PublicStat = PublicWork["stats"][number];

type ProfileProps = {
  page: PublicPage;
  preview?: boolean;
  favorite?: { saved: boolean } | null;
};

export function LensPublicProfile({
  page,
  preview = false,
  favorite,
}: ProfileProps) {
  if (page.layout === "magazine") {
    return (
      <MagazineProfile page={page} preview={preview} favorite={favorite} />
    );
  }

  return (
    <article className="mx-auto w-full max-w-4xl">
      <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-5 border-b border-border pb-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-8 sm:gap-y-4 sm:pb-8">
        <Avatar.Root className="grid size-[82px] shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 ring-1 ring-border sm:row-span-2 sm:size-30 sm:self-start">
          <Avatar.Image
            src={page.avatarUrl ?? undefined}
            alt=""
            className="size-full object-cover"
          />
          <Avatar.Fallback
            aria-hidden
            className="text-3xl font-semibold tracking-tight text-muted sm:text-4xl"
          >
            {initial(page.displayName || page.username)}
          </Avatar.Fallback>
        </Avatar.Root>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted [overflow-wrap:anywhere]">
            @{page.username}
          </p>
          <h1 className="mt-1 text-[clamp(1.75rem,5vw,2.875rem)] leading-[1.1] font-semibold tracking-[-0.045em] [overflow-wrap:anywhere]">
            {page.displayName}
          </h1>
        </div>

        <div className="col-span-2 min-w-0 sm:col-span-2 sm:col-start-2">
          {page.bio ? (
            <p className="max-w-prose text-[15px] leading-7 whitespace-pre-wrap [overflow-wrap:anywhere] sm:text-base">
              {page.bio}
            </p>
          ) : null}

          {page.categories.length ? (
            <ul
              aria-label="분야"
              className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-medium text-muted"
            >
              {page.categories.map((category) => (
                <li key={category}>{category}</li>
              ))}
            </ul>
          ) : null}

          {page.channels.length ? (
            <ul
              aria-label="소셜 채널"
              className="mt-3 flex flex-wrap gap-x-5 gap-y-1"
            >
              {page.channels.map((channel) => (
                <li key={channel.key} className="min-w-0">
                  <a
                    href={socialUrl(channel.key, channel.handle)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-1.5 rounded-sm py-1 text-sm transition-colors hover:text-accent-ink"
                  >
                    <span className="font-semibold">{channel.label}</span>
                    <span className="sr-only">
                      @{channel.handle.replace(/^@+/, "")}
                    </span>
                    {channel.followers != null ? (
                      <span className="shrink-0 text-muted tabular-nums">
                        {formatCount(channel.followers)} 팔로워
                      </span>
                    ) : null}
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-muted"
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="col-span-2 flex flex-wrap items-center gap-2.5 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:max-w-56 sm:justify-end">
          <ProfileInquiry
            username={page.username}
            preview={preview}
            className="w-full sm:w-auto"
          />
          <ProfileExtraActions
            page={page}
            preview={preview}
            favorite={favorite}
          />
        </div>
      </header>

      <PortfolioGallery works={page.works} />
    </article>
  );
}

function MagazineProfile({ page, preview, favorite }: ProfileProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const photo = page.avatarUrl === failedPhoto ? null : page.avatarUrl;
  const hasExtraActions = Boolean((favorite && !preview) || page.links.length);

  return (
    <article className="@container mx-auto w-full max-w-6xl">
      <header>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-y border-border py-3 @min-[42rem]:min-h-16 @min-[42rem]:items-center @min-[42rem]:gap-x-5 @min-[42rem]:py-2">
          <div className="flex min-w-0 flex-col items-start gap-y-1 @min-[42rem]:flex-row @min-[42rem]:flex-wrap @min-[42rem]:items-center @min-[42rem]:justify-between @min-[42rem]:gap-x-5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <span className="min-w-0 text-sm font-semibold text-muted [overflow-wrap:anywhere]">
                @{page.username}
              </span>
              {page.categories.length ? (
                <ul
                  aria-label="분야"
                  className="flex min-w-0 flex-wrap gap-1.5"
                >
                  {page.categories.map((category) => (
                    <li
                      key={category}
                      className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-fg"
                    >
                      #{category}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {page.channels.length ? (
              <ul
                aria-label="소셜 채널"
                className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5"
              >
                {page.channels.map((channel) => (
                  <li key={channel.key} className="min-w-0">
                    <a
                      href={socialUrl(channel.key, channel.handle)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-1.5 rounded-sm text-[13px] leading-snug text-muted transition-colors hover:text-accent-ink"
                    >
                      {channel.label}
                      {channel.followers != null ? (
                        <span className="font-semibold text-fg tabular-nums">
                          {formatCount(channel.followers)}
                          <span className="sr-only"> 팔로워</span>
                        </span>
                      ) : null}
                      <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <ProfileInquiry
            username={page.username}
            preview={preview}
            className="justify-self-end gap-1.5 px-2.5 text-xs whitespace-nowrap @min-[42rem]:gap-2 @min-[42rem]:px-4 @min-[42rem]:text-sm"
          />
        </div>
        {hasExtraActions ? (
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <ProfileExtraActions
              page={page}
              preview={preview}
              favorite={favorite}
            />
          </div>
        ) : null}
        <div className="mx-auto max-w-3xl px-1 pt-8 pb-7 text-center @min-[42rem]:px-6 @min-[42rem]:py-12">
          <h1 className="font-display text-2xl leading-[1.15] font-bold tracking-[-0.035em] [overflow-wrap:anywhere] text-balance @min-[42rem]:text-4xl">
            {page.displayName}
          </h1>
          {page.bio ? (
            <p className="mx-auto mt-4 max-w-[42rem] text-[15px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty text-muted [word-break:keep-all] @min-[42rem]:mt-5 @min-[42rem]:text-base">
              {page.bio}
            </p>
          ) : null}
        </div>
        {photo ? (
          <figure className="relative mx-auto aspect-[4/5] w-full max-w-[52rem] overflow-hidden bg-surface-2 @min-[42rem]:aspect-[5/4]">
            <img
              src={photo}
              alt={`${page.displayName} 대표 이미지`}
              className="absolute inset-0 size-full object-cover object-[center_38%]"
              fetchPriority="high"
              decoding="async"
              onError={() => setFailedPhoto(photo)}
            />
          </figure>
        ) : null}
      </header>

      <PortfolioGallery works={page.works} magazine />
    </article>
  );
}

function ProfileInquiry({
  username,
  preview,
  className,
}: {
  username: string;
  preview?: boolean;
  className: string;
}) {
  const style = `lens-button lens-button-primary ${className}`;
  const label = (
    <>
      <Mail className="size-4 shrink-0" aria-hidden />
      브랜드 문의하기
    </>
  );
  return preview ? (
    <button type="button" className={style} disabled>
      {label}
    </button>
  ) : (
    <Link to="/$username/inquiry" params={{ username }} className={style}>
      {label}
    </Link>
  );
}

function ProfileExtraActions({ page, preview, favorite }: ProfileProps) {
  return (
    <>
      {favorite && !preview ? (
        <FavoriteButton username={page.username} saved={favorite.saved} />
      ) : null}
      {page.links.map((link, index) => (
        <a
          key={`${link.url}-${index}`}
          className="lens-button lens-button-secondary min-w-0 max-w-full"
          href={link.url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="[overflow-wrap:anywhere]">{link.label}</span>
          <ArrowUpRight className="size-4 shrink-0" aria-hidden />
        </a>
      ))}
    </>
  );
}

function PortfolioGallery({
  works,
  magazine = false,
}: {
  works: PublicWork[];
  magazine?: boolean;
}) {
  if (!works.length) return null;
  return (
    <section
      aria-label="포트폴리오"
      className={
        magazine
          ? "mt-12 border-t border-fg/20 pt-4 @min-[42rem]:mt-20 @min-[42rem]:pt-6"
          : "mt-7 sm:mt-8"
      }
    >
      <h2
        className={
          magazine
            ? "mb-4 text-2xl font-bold tracking-[-0.04em] @min-[42rem]:mb-6 @min-[42rem]:text-[2rem]"
            : "mb-3.5 text-xl font-semibold tracking-tight sm:mb-5"
        }
      >
        포트폴리오
      </h2>
      <ul
        className={
          magazine
            ? "grid grid-cols-2 gap-x-3 gap-y-7 @min-[42rem]:grid-cols-3 @min-[42rem]:gap-x-5 @min-[42rem]:gap-y-10"
            : "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6"
        }
      >
        {works.map((work) => (
          <li key={work.id} className="min-w-0">
            <WorkPreview work={work} magazine={magazine} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function FavoriteButton({
  username,
  saved,
}: {
  username: string;
  saved: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function changeFavorite() {
    setBusy(true);
    try {
      const result = await setBrandFavorite({
        data: { username, saved: !saved },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await router.invalidate();
      toast.success(
        saved ? "관심 목록에서 삭제했습니다." : "관심 목록에 추가했습니다.",
      );
    } catch {
      toast.error("관심 목록을 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-busy={busy}
      disabled={busy}
      onClick={() => void changeFavorite()}
      className="lens-button lens-button-secondary"
    >
      {busy ? (
        <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
      ) : (
        <Bookmark
          className={saved ? "size-4 fill-current" : "size-4"}
          aria-hidden
        />
      )}
      {saved ? "관심 목록에 저장됨" : "관심 목록에 추가"}
    </button>
  );
}

function WorkPreview({
  work,
  magazine,
}: {
  work: PublicWork;
  magazine: boolean;
}) {
  const mediaType = work.mediaType ?? "IMAGE";
  const Icon =
    mediaType === "REELS" || mediaType === "VIDEO"
      ? Clapperboard
      : mediaType === "CAROUSEL_ALBUM"
        ? Copy
        : null;
  const media = { mediaType, mediaUrl: null, thumbnailUrl: work.coverUrl };
  const brand = work.brandName === "브랜드 비공개" ? "" : work.brandName;
  const highlight =
    work.highlightLabel && work.highlightValue
      ? { label: work.highlightLabel, value: work.highlightValue }
      : null;
  const summary = highlight ? [highlight, ...work.stats] : work.stats;
  const details = [
    brand,
    work.channelLabel,
    work.formatLabel,
    month(work.postedMonth),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="group block w-full rounded-lg text-left"
        >
          <span className="relative block">
            <MediaPreview
              media={media}
              className={
                magazine
                  ? "rounded-[2px]"
                  : "rounded-lg ring-1 ring-border ring-inset"
              }
            />
            {Icon ? (
              <span
                aria-hidden
                className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-black/55 text-white"
              >
                <Icon className="size-4" strokeWidth={1.85} />
              </span>
            ) : null}
          </span>
          <span className="mt-2.5 block text-[15px] leading-snug font-semibold [overflow-wrap:anywhere] sm:text-base">
            {work.title}
          </span>
          {brand ? (
            <span className="mt-1 block text-sm leading-snug text-muted [overflow-wrap:anywhere]">
              {brand}
            </span>
          ) : null}
          {summary.length ? (
            <span className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-sm leading-snug text-muted">
              {summary.slice(0, 3).map((stat, index) => (
                <span
                  key={`${stat.label}-${index}`}
                  className="[overflow-wrap:anywhere]"
                >
                  {stat.label}{" "}
                  <span className="font-medium text-fg tabular-nums">
                    {stat.value}
                  </span>
                </span>
              ))}
            </span>
          ) : null}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="lens-overlay" />
        <Dialog.Content className="lens-sheet fixed inset-x-0 bottom-0 z-[55] mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col overflow-y-auto overscroll-contain rounded-b-none px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-1/2 sm:rounded-xl sm:p-6">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
                {work.title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
                {details}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="lens-icon-button shrink-0"
              aria-label="닫기"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          {work.coverUrl ? (
            <MediaPreview
              media={media}
              className="mt-4 aspect-[3/2] max-h-[37dvh] shrink-0 rounded-lg"
            />
          ) : null}

          {summary.length ? (
            <dl className="mt-4 divide-y divide-border border-t border-border">
              {summary.map((stat, index) => (
                <WorkStat key={`${stat.label}-${index}`} stat={stat} />
              ))}
            </dl>
          ) : null}

          {work.postUrl ? (
            <a
              className="lens-button lens-button-secondary mt-4 w-full shrink-0"
              href={work.postUrl}
              target="_blank"
              rel="noreferrer"
            >
              게시물 보기 <ArrowUpRight className="size-4" aria-hidden />
            </a>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function WorkStat({ stat }: { stat: PublicStat }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
      <dt className="text-muted [overflow-wrap:anywhere]">{stat.label}</dt>
      <dd className="ml-auto text-right text-base font-semibold tabular-nums [overflow-wrap:anywhere]">
        {stat.value}
      </dd>
    </div>
  );
}

function month(value: string | null) {
  const parts = value?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  return parts ? `${parts[1]}년 ${Number(parts[2])}월` : null;
}

function socialUrl(key: string, handle: string): string {
  const name = encodeURIComponent(handle.replace(/^@+/, ""));
  if (key === "tiktok") return `https://www.tiktok.com/@${name}`;
  if (key === "youtube") return `https://www.youtube.com/@${name}`;
  return `https://www.instagram.com/${name}`;
}
