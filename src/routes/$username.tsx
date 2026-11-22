import { useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { Wordmark } from "@/components/logo";
import { formatCount } from "@/lib/hypeup/format";
import { getLensPublic } from "@/lib/hypeup/lens-api";
import { validateUsername } from "@/lib/hypeup/lens-rules";

export const Route = createFileRoute("/$username")({
  loader: async ({ params }) => {
    if (!validateUsername(params.username).ok) throw notFound();
    return getLensPublic({ data: { username: params.username } });
  },
  notFoundComponent: MissingPage,
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.ready ? `${loaderData.page.displayName} · Lens` : "Lens" }],
  }),
  component: PublicProfile,
});

function MissingPage() {
  return <main className="mx-auto max-w-md px-5 py-16 text-center text-[14px]">페이지를 찾을 수 없습니다.</main>;
}

function PublicProfile() {
  const data = Route.useLoaderData();
  const [openId, setOpenId] = useState<string | null>(null);
  const [bioOpen, setBioOpen] = useState(false);
  if (!data.ready) {
    return <main className="mx-auto flex min-h-dvh max-w-[440px] items-center justify-center px-5 text-[15px]">페이지를 준비 중이에요</main>;
  }
  const page = data.page;
  const work = page.works.find((item) => item.id === openId);
  const longBio = page.bio.length > 80;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[440px] px-5 py-8">
      <div className="flex items-center gap-3">
        {page.avatarUrl ? (
          <img src={page.avatarUrl} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full border border-border text-[18px]">
            {page.displayName.slice(0, 1)}
          </div>
        )}
        <div>
          <h1 className="font-display text-3xl tracking-tight">{page.displayName}</h1>
          {page.channels.find((channel) => channel.key === "instagram") ? (
            <p className="text-[13px] text-muted">@{page.channels.find((channel) => channel.key === "instagram")?.handle}</p>
          ) : null}
        </div>
      </div>
      {page.categories.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {page.categories.map((category) => (
            <span key={category} className="rounded-md border border-border px-2 py-1 text-[12px]">{category}</span>
          ))}
        </div>
      ) : null}
      {page.bio ? (
        <p className={`mt-4 text-[14px] leading-6 ${longBio && !bioOpen ? "line-clamp-2" : ""}`}>
          {page.bio}
          {longBio ? (
            <button type="button" className="ml-2 text-[12px] text-muted" onClick={() => setBioOpen((open) => !open)}>
              {bioOpen ? "접기" : "더 보기"}
            </button>
          ) : null}
        </p>
      ) : null}
      {page.channels.length ? (
        <ul className="mt-5 space-y-1 text-[13px]">
          {page.channels.map((channel) => (
            <li key={channel.key} className="flex justify-between tabular-nums">
              <span>{channel.label}</span>
              <span>{formatCount(channel.followers)}</span>
            </li>
          ))}
          <li className="text-[11px] text-subtle">직접 입력한 수치</li>
        </ul>
      ) : null}
      <Link to="/$username/inquiry" params={{ username: page.username }} className="mt-6 flex h-11 items-center justify-center rounded-md bg-fg text-[13px] font-medium text-bg">
        브랜드 문의하기
      </Link>
      {page.rates.length ? (
        <section className="mt-8">
          <h2 className="text-[13px] font-medium">단가</h2>
          <ul className="mt-2 divide-y divide-border border-y border-border">
            {page.rates.map((rate) => (
              <li key={rate.id} className="py-3">
                <p className="text-[14px]">{rate.title}</p>
                <p className="mt-1 text-[13px] tabular-nums">
                  {rate.formatLabel} · {rate.priceLabel} · 수정 {rate.revisions}회 · {rate.usageLabel}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {page.works.length ? (
        <section className="mt-8">
          <h2 className="text-[13px] font-medium">작업</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {page.works.map((item) => (
              <button key={item.id} type="button" className="overflow-hidden rounded-md border border-border text-left" onClick={() => setOpenId(item.id)}>
                {item.coverUrl ? <img src={item.coverUrl} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-surface" />}
                <p className="px-2 pt-2 text-[12px]">{item.brandName}</p>
                <p className="px-2 pb-2 text-[12px] text-muted">{item.highlightLabel} {item.highlightValue}</p>
              </button>
            ))}
          </div>
          {work ? (
            <section className="mt-3 rounded-md border border-border p-3 text-[13px] leading-6">
              <p className="font-medium">{work.title}</p>
              <p className="text-muted">{work.brandName} · {work.channelLabel} · {work.formatLabel}</p>
              {work.stats.map((stat) => (
                <p key={stat.label}>{stat.label} {stat.value}</p>
              ))}
              {work.postUrl ? <a className="underline" href={work.postUrl} target="_blank" rel="noreferrer">게시물</a> : null}
              <button type="button" className="mt-2 block text-[12px] text-muted" onClick={() => setOpenId(null)}>닫기</button>
            </section>
          ) : null}
        </section>
      ) : null}
      <div className="mt-8 flex flex-col gap-2 text-[13px]">
        {page.channels.map((channel) => (
          <a key={channel.key} className="underline" href={socialUrl(channel.key, channel.handle)} target="_blank" rel="noreferrer">
            {channel.label}
          </a>
        ))}
        {page.links.map((link) => (
          <a key={link.url} className="underline" href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
        ))}
      </div>
      <p className="mt-10 text-center"><Wordmark className="text-[14px]" /></p>
    </main>
  );
}

function socialUrl(key: string, handle: string): string {
  const name = handle.replace(/^@/, "");
  if (key === "tiktok") return `https://www.tiktok.com/@${name}`;
  if (key === "youtube") return `https://www.youtube.com/@${name}`;
  return `https://instagram.com/${name}`;
}
