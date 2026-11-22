import { useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { LensChat } from "@/components/lens-chat";
import { PageHeader } from "@/components/page-header";
import { ghostBtn } from "@/components/lens-ui";
import {
  actOnLensDeal,
  getLensThread,
  sendLensMessage,
  setLensArchive,
} from "@/lib/hypeup/lens-api";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";

export const Route = createFileRoute("/_app/inquiries/$id")({
  loader: ({ params }) => getLensThread({ data: { id: params.id } }),
  component: ThreadPage,
});

type Update = { ok: true; desk: ThreadDesk } | { ok: false; error: string };

function ThreadPage() {
  const initial = Route.useLoaderData();
  if (!initial) {
    return (
      <div className="lens-panel max-w-3xl p-6">
        <h1 className="text-xl font-semibold">문의를 찾지 못했습니다.</h1>
        <Link
          to="/inquiries"
          className="lens-button lens-button-secondary mt-4"
        >
          브랜드 문의 목록
        </Link>
      </div>
    );
  }
  return <ThreadContent key={initial.id} initial={initial} />;
}

function ThreadContent({ initial }: { initial: ThreadDesk }) {
  const router = useRouter();
  const [desk, setDesk] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function apply(request: () => Promise<Update>) {
    if (busy) return false;
    setBusy(true);
    try {
      const result = await request();
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      setDesk(result.desk);
      return true;
    } catch {
      toast.error("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function changeArchive() {
    setBusy(true);
    try {
      const result = await setLensArchive({
        data: { id: desk.id, archived: !desk.archived },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await router.navigate({
        to: "/inquiries",
        search: { archived: desk.archived || undefined },
      });
    } catch {
      toast.error("보관 상태를 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <Link
        to="/inquiries"
        search={{ archived: desk.archived || undefined }}
        className="lens-button lens-button-quiet -ml-3 mb-1"
      >
        <ArrowLeft className="size-4" aria-hidden /> 브랜드 문의
      </Link>
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
          apply(() =>
            sendLensMessage({
              data: { role: "influencer", threadId: desk.id, body },
            }),
          )
        }
        onAction={async (action) => {
          await apply(() =>
            actOnLensDeal({
              data: { role: "influencer", threadId: desk.id, ...action },
            }),
          );
        }}
      />
    </div>
  );
}
