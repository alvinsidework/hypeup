import * as Avatar from "@radix-ui/react-avatar";
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Clapperboard, Copy, Mail, X } from "lucide-react";
import { MediaPreview } from "@/components/media-preview";
import { formatCount, initial } from "@/lib/hypeup/format";
import type { PublicPage } from "@/lib/hypeup/lens-repo";

type PublicWork = PublicPage["works"][number];
type PublicStat = PublicWork["stats"][number];

export function LensPublicProfile({
  page,
  preview = false,
}: {
  page: PublicPage;
  preview?: boolean;
}) {
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
          {preview ? (
            <button
              type="button"
              className="lens-button lens-button-primary w-full sm:w-auto"
              disabled
            >
              <Mail className="size-4" aria-hidden />
              브랜드 문의하기
            </button>
          ) : (
            <Link
              to="/$username/inquiry"
              params={{ username: page.username }}
              className="lens-button lens-button-primary w-full sm:w-auto"
            >
              <Mail className="size-4" aria-hidden />
              브랜드 문의하기
            </Link>
          )}
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
        </div>
      </header>

      {page.works.length ? (
        <section className="mt-7 sm:mt-8" aria-labelledby="profile-portfolio">
          <h2
            id="profile-portfolio"
            className="mb-3.5 text-xl font-semibold tracking-tight sm:mb-5"
          >
            포트폴리오
          </h2>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6">
            {page.works.map((work) => (
              <li key={work.id} className="min-w-0">
                <WorkPreview work={work} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {page.rates.length ? (
        <section className="mt-9 sm:mt-11" aria-labelledby="profile-rates">
          <h2
            id="profile-rates"
            className="mb-3.5 text-xl font-semibold tracking-tight"
          >
            단가
          </h2>
          <ul className="lens-panel divide-y divide-border px-4 sm:px-6">
            {page.rates.map((rate) => (
              <li
                key={rate.id}
                className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 py-4"
              >
                <div className="min-w-0">
                  <p className="text-base font-semibold [overflow-wrap:anywhere]">
                    {rate.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {rate.formatLabel} · 수정 {rate.revisions}회 ·{" "}
                    {rate.usageLabel}
                  </p>
                </div>
                <p className="text-base font-semibold tabular-nums [overflow-wrap:anywhere]">
                  {rate.priceLabel}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function WorkPreview({ work }: { work: PublicWork }) {
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
              className="rounded-lg ring-1 ring-border ring-inset"
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
