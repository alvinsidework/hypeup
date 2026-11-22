import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { BrandSignIn } from "@/components/brand-sign-in";
import { BrandThreadChat } from "@/components/brand-thread-chat";
import { PageHeader } from "@/components/page-header";
import { PublicLayout } from "@/components/public-layout";
import { getBrandConversation } from "@/lib/hypeup/brand-api";
import { getBrandAuthOptions } from "@/lib/hypeup/brand-auth-api";

export const Route = createFileRoute("/brand/inquiries/$id")({
  headers: () => ({ "Cache-Control": "private, no-store" }),
  head: () => ({
    meta: [
      { title: "브랜드 문의 · Lens" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ params }) => {
    if (!z.uuid().safeParse(params.id).success) throw notFound();
    const data = await getBrandConversation({ data: { id: params.id } });
    return {
      ...data,
      authOptions: data.signedIn ? null : await getBrandAuthOptions(),
    };
  },
  component: BrandInquiry,
});

function BrandInquiry() {
  const { id } = Route.useParams();
  const { desk, templates, authOptions } = Route.useLoaderData();
  return (
    <PublicLayout secondary>
      <main className="lens-reveal mx-auto w-full max-w-5xl flex-1 px-5 py-6 sm:px-8 sm:py-10">
        <Link
          to="/brand"
          search={{}}
          className="lens-button lens-button-quiet mb-4"
        >
          <ArrowLeft className="size-4" aria-hidden /> 브랜드 문의
        </Link>
        {desk ? (
          <>
            <PageHeader title={desk.influencerName} description="브랜드 문의" />
            <BrandThreadChat
              key={desk.id}
              initial={desk}
              savedTemplates={templates}
            />
          </>
        ) : authOptions ? (
          <div className="mx-auto max-w-lg">
            <PageHeader
              title="브랜드 문의"
              description="로그인하면 대화를 이어갈 수 있어요."
            />
            <BrandSignIn
              returnTo={`/brand/inquiries/${id}`}
              options={authOptions}
            />
          </div>
        ) : (
          <PageHeader title="문의를 찾지 못했습니다" />
        )}
      </main>
    </PublicLayout>
  );
}
