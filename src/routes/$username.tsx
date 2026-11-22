import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowUpRight, ChevronDown, Image, Mail, X } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/logo";
import { formatCount, initial } from "@/lib/hypeup/format";
import { getLensPublic } from "@/lib/hypeup/lens-api";
import { validateUsername } from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/$username")({
  loader: async ({ params }) => {
    if (!validateUsername(params.username).ok) throw notFound();
    return getLensPublic({ data: { username: params.username } });
  },
  notFoundComponent: MissingPage,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.ready
          ? `${loaderData.page.displayName} · Lens`
          : "Lens",
      },
    ],
  }),
  component: PublicProfile,
});

function MissingPage() {
  return <ProfileUnavailable title="페이지를 찾을 수 없습니다." />;
}

function ProfileUnavailable({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark className="size-12" />
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Link to="/" className="lens-button lens-button-secondary">
        Lens 홈
      </Link>
    </main>
  );
}

function PublicProfile() {
  const data = Route.useLoaderData();
  if (!data.ready) return <ProfileUnavailable title="페이지를 준비 중이에요" />;
  return <ProfileContent key={data.page.username} page={data.page} />;
}

type Profile = Extract<
  Awaited<ReturnType<typeof getLensPublic>>,
  { ready: true }
>["page"];

function ProfileContent({ page }: { page: Profile }) {
  const [bioOpen, setBioOpen] = useState(false);
  const instagram = page.channels.find(
    (channel) => channel.key === "instagram",
  );
  const longBio = page.bio.length > 80;
  const links = [
    ...page.channels.map((channel) => ({
      label: channel.label,
      url: socialUrl(channel.key, channel.handle),
    })),
    ...page.links,
  ];

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center px-5 pt-[calc(12px+env(safe-area-inset-top))] sm:px-8">
        <Link
          to="/"
          aria-label="Lens 홈"
          className="flex min-h-11 items-center gap-2.5 rounded-full"
        >
          <LogoMark className="size-6" />
          <Wordmark />
        </Link>
      </header>
      <main className="lens-reveal mx-auto w-full max-w-5xl px-5 pt-8 pb-[calc(40px+env(safe-area-inset-bottom))] sm:px-8 sm:pt-14">
        <section className="grid items-end gap-6 border-b border-border pb-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8 sm:pb-9">
          <div className="min-w-0">
            <div className="flex items-center gap-4 sm:gap-5">
              {page.avatarUrl ? (
                <img
                  src={page.avatarUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-full object-cover sm:size-20"
                />
              ) : (
                <div
                  aria-hidden
                  className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-2 text-2xl font-semibold sm:size-20 sm:text-3xl"
                >
                  {initial(page.displayName)}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-[clamp(1.875rem,5vw,3.5rem)] leading-[1.08] font-semibold tracking-[-0.055em] [overflow-wrap:anywhere]">
                  {page.displayName}
                </h1>
                {instagram ? (
                  <a
                    href={socialUrl(instagram.key, instagram.handle)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center text-[15px] font-medium text-muted underline decoration-border underline-offset-4 hover:text-fg"
                  >
                    @{instagram.handle.replace(/^@/, "")}
                  </a>
                ) : null}
              </div>
            </div>
            {page.bio ? (
              <div className="mt-5 max-w-lg">
                <p
                  id="creator-bio"
                  className={`text-base leading-relaxed text-muted [overflow-wrap:anywhere] ${longBio && !bioOpen ? "line-clamp-2" : ""}`}
                >
                  {page.bio}
                </p>
                {longBio ? (
                  <button
                    type="button"
                    className="lens-button lens-button-quiet"
                    aria-expanded={bioOpen}
                    aria-controls="creator-bio"
                    onClick={() => setBioOpen((open) => !open)}
                  >
                    {bioOpen ? "접기" : "더 보기"}
                    <ChevronDown
                      className={`size-4 transition-transform ${bioOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                ) : null}
              </div>
            ) : null}
            {page.categories.length ? (
              <ul aria-label="카테고리" className="mt-5 flex flex-wrap gap-2">
                {page.categories.map((category) => (
                  <li
                    key={category}
                    className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted"
                  >
                    {category}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Link
            to="/$username/inquiry"
            params={{ username: page.username }}
            className="lens-button lens-button-primary w-full sm:w-auto"
          >
            <Mail className="size-4" aria-hidden />
            브랜드 문의하기
          </Link>
        </section>

        {page.channels.length ? (
          <section className="pt-6 sm:pt-8" aria-label="채널별 팔로워">
            <ul className="grid gap-2 sm:grid-cols-3 sm:gap-3">
              {page.channels.map((channel) => (
                <li
                  key={channel.key}
                  className="lens-panel flex min-h-16 items-center justify-between gap-3 px-4 py-3 sm:min-h-25 sm:flex-col sm:items-start sm:justify-center sm:px-5"
                >
                  <span className="text-sm text-muted">{channel.label}</span>
                  <span
                    className="text-2xl font-semibold tracking-tight tabular-nums"
                    aria-label={`${formatCount(channel.followers)} 팔로워`}
                  >
                    {formatCount(channel.followers)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted">
              크리에이터가 직접 입력한 팔로워 수
            </p>
          </section>
        ) : null}

        {page.rates.length ? (
          <section className="mt-9 sm:mt-12">
            <h2 className="mb-3 text-xl font-semibold tracking-tight">단가</h2>
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
                  <p className="text-base font-semibold whitespace-nowrap tabular-nums">
                    {rate.priceLabel}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {page.works.length ? (
          <section className="mt-9 sm:mt-12">
            <h2 className="mb-3 text-xl font-semibold tracking-tight">
              포트폴리오
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {page.works.map((work) => (
                <WorkPreview key={work.id} work={work} />
              ))}
            </div>
          </section>
        ) : null}

        {links.length ? (
          <section className="mt-9 sm:mt-12">
            <h2 className="mb-3 text-xl font-semibold tracking-tight">링크</h2>
            <ul className="lens-panel divide-y divide-border">
              {links.map((link, index) => (
                <li key={`${link.url}-${index}`}>
                  <a
                    className="flex min-h-13 items-center justify-between gap-4 rounded-xl px-4 text-sm font-medium transition-colors hover:bg-surface-2 sm:px-6"
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="[overflow-wrap:anywhere]">
                      {link.label}
                    </span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-muted"
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function WorkPreview({ work }: { work: Profile["works"][number] }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="lens-panel group flex min-w-0 flex-col overflow-hidden text-left transition-colors hover:bg-surface-2"
        >
          {work.coverUrl ? (
            <img
              src={work.coverUrl}
              alt=""
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center bg-surface-2 text-muted">
              <Image className="size-6" strokeWidth={1.5} aria-hidden />
            </div>
          )}
          <div className="flex w-full items-start justify-between gap-2 px-3 py-3 sm:px-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">
                {work.title}
              </p>
              <p className="mt-1 truncate text-sm text-muted">
                {work.brandName}
              </p>
            </div>
            <ArrowUpRight
              className="mt-0.5 size-4 shrink-0 text-muted"
              aria-hidden
            />
          </div>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="lens-overlay fixed inset-0 z-50" />
        <Dialog.Content className="lens-sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-border bg-surface px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-1/2 sm:rounded-xl sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
                {work.title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
                {work.brandName} · {work.channelLabel} · {work.formatLabel}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="lens-icon-button shrink-0"
              aria-label="닫기"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          {work.highlightLabel && work.highlightValue ? (
            <p className="mt-5 flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-surface-2 px-4 py-3 text-sm text-muted">
              {work.highlightLabel}
              <strong className="text-xl font-semibold text-fg tabular-nums">
                {work.highlightValue}
              </strong>
            </p>
          ) : null}
          {work.stats.length ? (
            <dl className="mt-4 divide-y divide-border">
              {work.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-start justify-between gap-4 py-2.5 text-sm"
                >
                  <dt className="text-muted">{stat.label}</dt>
                  <dd className="text-right font-semibold tabular-nums [overflow-wrap:anywhere]">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {work.postUrl ? (
            <a
              className="lens-button lens-button-secondary mt-4 w-full"
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

function socialUrl(key: string, handle: string): string {
  const name = handle.replace(/^@/, "");
  if (key === "tiktok") return `https://www.tiktok.com/@${name}`;
  if (key === "youtube") return `https://www.youtube.com/@${name}`;
  return `https://instagram.com/${name}`;
}
