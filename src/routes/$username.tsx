import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { LensPublicProfile } from "@/components/lens-public-profile";
import { LogoMark, Wordmark } from "@/components/logo";
import { getBrandFavorite } from "@/lib/hypeup/brand-api";
import { getLensPublic } from "@/lib/hypeup/lens-api";
import { validateUsername } from "@/lib/hypeup/lens-rules";
import { publicProfileUrl } from "@/lib/hypeup/public-origin";

export const Route = createFileRoute("/$username")({
  headers: () => ({ "Cache-Control": "private, no-store" }),
  loader: async ({ params }) => {
    if (!validateUsername(params.username).ok) throw notFound();
    const data = await getLensPublic({ data: { username: params.username } });
    const favorite = data.ready
      ? await getBrandFavorite({ data: { username: data.page.username } })
      : null;
    return { ...data, favorite };
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
    links: loaderData?.ready
      ? [{ rel: "canonical", href: publicProfileUrl(loaderData.page.username) }]
      : [],
  }),
  component: PublicProfile,
});

function MissingPage() {
  return <ProfileUnavailable title="페이지를 찾을 수 없습니다." />;
}

function ProfileUnavailable({ title }: { title: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-5 px-6 text-center">
      <LogoMark className="lens-secondary-brand size-12" />
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
  const magazine = data.page.layout === "magazine";
  const width = magazine ? "max-w-[76rem]" : "max-w-[60rem]";
  return (
    <div
      className={`min-h-dvh pt-[env(safe-area-inset-top)] ${magazine ? "bg-surface" : ""}`}
    >
      <header
        className={`lens-secondary-brand mx-auto flex items-center px-4 pt-3 sm:px-8 ${width}`}
      >
        <Link
          to="/"
          aria-label="Lens 홈"
          className="flex min-h-11 items-center gap-2.5 rounded-full"
        >
          <LogoMark className="size-7" />
          <Wordmark />
        </Link>
      </header>
      <main
        className={`lens-reveal mx-auto w-full px-4 pt-8 pb-[calc(40px+env(safe-area-inset-bottom))] sm:px-8 sm:pt-12 ${width}`}
      >
        <LensPublicProfile
          key={data.page.username}
          page={data.page}
          favorite={data.favorite}
        />
      </main>
    </div>
  );
}
