import { useRef, useState } from "react";
import { toast } from "sonner";
import { LensChat } from "@/components/lens-chat";
import { saveBrandTemplate } from "@/lib/hypeup/brand-api";
import type { BrandProposalTemplate } from "@/lib/hypeup/brand-types";
import { actOnLensDeal, sendLensMessage } from "@/lib/hypeup/lens-api";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";

type ChatUpdate = { ok: true; desk: ThreadDesk } | { ok: false; error: string };

export function BrandThreadChat({
  initial,
  savedTemplates,
}: {
  initial: ThreadDesk;
  savedTemplates: BrandProposalTemplate[];
}) {
  const [desk, setDesk] = useState(initial);
  const [templates, setTemplates] = useState(savedTemplates);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  async function update(request: () => Promise<ChatUpdate>): Promise<boolean> {
    if (pending.current) return false;
    pending.current = true;
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
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <LensChat
      role="brand"
      desk={desk}
      busy={busy}
      proposalTemplates={templates}
      onSaveProposalTemplate={async (name, terms) => {
        try {
          const result = await saveBrandTemplate({ data: { name, terms } });
          if (!result.ok) {
            toast.error(result.error);
            return false;
          }
          setTemplates((current) => [result.template, ...current]);
          toast.success("제안 템플릿을 저장했습니다.");
          return true;
        } catch {
          toast.error("제안 템플릿을 저장하지 못했습니다.");
          return false;
        }
      }}
      onSend={(body) =>
        update(() =>
          sendLensMessage({ data: { role: "brand", threadId: desk.id, body } }),
        )
      }
      onAction={async (action) => {
        await update(() =>
          actOnLensDeal({
            data: { role: "brand", threadId: desk.id, ...action },
          }),
        );
      }}
    />
  );
}
