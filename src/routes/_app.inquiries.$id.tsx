import { useState } from "react";
import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { LensChat, type LensAction } from "@/components/lens-chat";
import { PageHeader } from "@/components/page-header";
import { ghostBtn } from "@/components/lens-ui";
import { actOnLensDeal, getLensThread, sendLensMessage, setLensArchive } from "@/lib/hypeup/lens-api";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";

export const Route = createFileRoute("/_app/inquiries/$id")({
  loader: ({ params }) => getLensThread({ data: { id: params.id } }),
  component: ThreadPage,
});

function ThreadPage() {
  const initial = Route.useLoaderData();
  const router = useRouter();
  const [desk, setDesk] = useState<ThreadDesk | null>(initial);
  const [busy, setBusy] = useState(false);
  if (!desk) {
    return (
      <div>
        <p className="text-[14px]">문의를 찾지 못했습니다.</p>
        <Link to="/inquiries" className="mt-3 inline-block text-[13px] underline">목록</Link>
      </div>
    );
  }

  async function apply(result: { ok: boolean; error?: string; desk?: ThreadDesk }) {
    if (!result.ok || !result.desk) {
      toast.error(result.error ?? "처리하지 못했습니다.");
      return;
    }
    setDesk(result.desk);
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={desk.company}
        description={`${desk.contactName} · ${desk.trustLabel} · ${desk.emailMasked}. 주소는 입력값이며 메일함 확인은 아직 하지 않습니다.`}
        action={
          <button
            type="button"
            className={ghostBtn}
            onClick={async () => {
              const result = await setLensArchive({ data: { id: desk.id, archived: !desk.archived } });
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              await router.navigate({ to: "/inquiries" });
            }}
          >
            {desk.archived ? "보관 해제" : "보관"}
          </button>
        }
      />
      <LensChat
        role="influencer"
        desk={desk}
        busy={busy}
        onSend={async (body) => {
          setBusy(true);
          await apply(await sendLensMessage({ data: { role: "influencer", threadId: desk.id, body } }));
          setBusy(false);
        }}
        onAction={async (action: LensAction) => {
          setBusy(true);
          await apply(await actOnLensDeal({ data: { role: "influencer", threadId: desk.id, ...action } }));
          setBusy(false);
        }}
      />
    </div>
  );
}
