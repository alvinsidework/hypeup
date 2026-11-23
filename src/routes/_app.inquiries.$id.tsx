import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Archive, ArchiveRestore } from "lucide-react";
import { LensChat } from "@/components/lens-chat";
import { PageHeader } from "@/components/page-header";
import { ghostBtn } from "@/components/lens-ui";
import { useLensThread } from "@/components/use-lens-thread";
import {
  actOnLensDeal,
  getLensThread,
  sendLensMessage,
  setLensArchive,
} from "@/lib/hypeup/lens-api";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";

export const Route = createFileRoute("/_app/inquiries/$id")({
  headers: () => ({ "Cache-Control": "private, no-store" }),
  staticData: { workspaceBack: { to: "/inquiries", label: "브랜드 문의" } },
  loader: ({ params }) => getLensThread({ data: { id: params.id } }),
  component: ThreadPage,
});

function ThreadPage() {
  const initial = Route.useLoaderData();
  if (!initial) {
    return (
      <div className="lens-panel max-w-3xl p-6">
        <h1 className="text-xl font-semibold">문의를 찾지 못했습니다.</h1>
      </div>
    );
  }
  return <ThreadContent key={initial.id} initial={initial} />;
}

function ThreadContent({ initial }: { initial: ThreadDesk }) {
  const router = useRouter();
  const { desk, busy, update } = useLensThread(initial, "influencer");

  async function changeArchive() {
    await update(async () => {
      const result = await setLensArchive({
        data: { id: desk.id, archived: !desk.archived },
      });
      if (result.ok) {
        await router.navigate({
          to: "/inquiries",
          search: { archived: desk.archived || undefined },
        });
      }
      return result;
    }, "보관 상태를 변경하지 못했습니다.");
  }

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={desk.company}
        description={`${desk.contactName} · ${desk.trustLabel} · ${desk.emailMasked}`}
        action={
          <button
            type="button"
            className={ghostBtn}
            disabled={busy}
            onClick={() => void changeArchive()}
          >
            {desk.archived ? (
              <ArchiveRestore className="size-4" aria-hidden />
            ) : (
              <Archive className="size-4" aria-hidden />
            )}
            {desk.archived ? "보관 해제" : "보관"}
          </button>
        }
      />
      <LensChat
        role="influencer"
        desk={desk}
        busy={busy}
        onSend={(body) =>
          update(() =>
            sendLensMessage({
              data: { role: "influencer", threadId: desk.id, body },
            }),
          )
        }
        onAction={async (action) => {
          await update(() =>
            actOnLensDeal({
              data: { role: "influencer", threadId: desk.id, ...action },
            }),
          );
        }}
      />
    </div>
  );
}
