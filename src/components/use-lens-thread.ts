import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { refreshLensThread } from "@/lib/hypeup/lens-api";
import type { ThreadDesk } from "@/lib/hypeup/lens-repo";
import type { Party } from "@/lib/hypeup/lens-rules";

type ThreadUpdate =
  { ok: true; desk?: ThreadDesk } | { ok: false; error: string };

const REFRESH_INTERVAL_MS = 5_000;

export function useLensThread(initial: ThreadDesk, role: Party) {
  const [desk, setDesk] = useState(initial);
  const [busy, setBusy] = useState(false);
  const knownVersion = useRef(initial.messageVersion);
  const mutationVersion = useRef(0);
  const pending = useRef(false);
  const id = initial.id;

  function receive(next: ThreadDesk) {
    knownVersion.current = next.messageVersion;
    setDesk(next);
  }

  useEffect(() => {
    let request: AbortController | undefined;

    async function refresh() {
      if (request || pending.current || document.visibilityState !== "visible")
        return;
      const controller = new AbortController();
      request = controller;
      const version = mutationVersion.current;
      const deadline = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const next = await refreshLensThread({
          data: { id, role, knownVersion: knownVersion.current },
          signal: controller.signal,
        });
        // A mutation can finish while the background request is reading an older snapshot.
        if (
          next &&
          !controller.signal.aborted &&
          version === mutationVersion.current
        ) {
          knownVersion.current = next.messageVersion;
          setDesk(next);
        }
      } catch {
        // Keep the conversation readable until the next refresh.
      } finally {
        window.clearTimeout(deadline);
        request = undefined;
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      request?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [id, role]);

  async function update(
    request: () => Promise<ThreadUpdate>,
    failureMessage = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  ): Promise<boolean> {
    if (pending.current) return false;
    pending.current = true;
    mutationVersion.current++;
    setBusy(true);
    try {
      const result = await request();
      if (!result.ok) {
        toast.error(result.error);
        return false;
      }
      if (result.desk) receive(result.desk);
      return true;
    } catch {
      toast.error(failureMessage);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return { desk, busy, update };
}
