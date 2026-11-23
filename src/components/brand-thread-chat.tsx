import { useState } from "react";
import { toast } from "sonner";
import { LensChat } from "@/components/lens-chat";
import { useLensThread } from "@/components/use-lens-thread";
import { saveBrandTemplate } from "@/lib/hypeup/brand-api";
import type { BrandProposalTemplate } from "@/lib/hypeup/brand-types";
import { actOnLensDeal, sendLensMessage } from "@/lib/hypeup/lens-api";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";

export function BrandThreadChat({
  initial,
  savedTemplates,
}: {
  initial: ThreadDesk;
  savedTemplates: BrandProposalTemplate[];
}) {
  const { desk, busy, update } = useLensThread(initial, "brand");
  const [templates, setTemplates] = useState(savedTemplates);

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
