import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LensPublicProfile } from "@/components/lens-public-profile";
import { getLensPagePreview } from "@/lib/hypeup/lens-api";

export const Route = createFileRoute("/_app/page_/preview")({
  loader: () => getLensPagePreview(),
  head: () => ({
    meta: [
      { title: "공개 프로필 미리보기 · Lens" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PagePreview,
});

function PagePreview() {
  const page = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border pb-3 sm:mb-8">
        <Link to="/page" className="lens-button lens-button-quiet -ml-3">
          <ArrowLeft className="size-4" aria-hidden />
          프로필 편집
        </Link>
        <p className="text-sm font-semibold text-muted">공개 프로필 미리보기</p>
      </div>
      <LensPublicProfile key={page.username} page={page} preview />
    </div>
  );
}
