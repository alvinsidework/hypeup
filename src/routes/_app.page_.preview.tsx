import { createFileRoute } from "@tanstack/react-router";
import { LensPublicProfile } from "@/components/lens-public-profile";
import { getLensPagePreview } from "@/lib/hypeup/lens-api";

export const Route = createFileRoute("/_app/page_/preview")({
  staticData: { workspaceBack: { to: "/page", label: "프로필 편집" } },
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
      <p className="mb-6 border-b border-border pb-3 text-sm font-semibold text-muted sm:mb-8">
        공개 프로필 미리보기
      </p>
      <LensPublicProfile key={page.username} page={page} preview />
    </div>
  );
}
