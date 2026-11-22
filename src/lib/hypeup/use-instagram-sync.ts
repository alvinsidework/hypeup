import { useCallback, useEffect, useRef, useState } from "react";
import {
  useTaskProgress,
  type ProgressUpdate,
} from "@/components/route-progress";
import { copy } from "./copy";
import {
  INSTAGRAM_SYNC_URL,
  type InstagramSyncEvent,
  type InstagramSyncInput,
} from "./sync-contract";
import type { MediaItem } from "./types";

type SyncDone = Extract<InstagramSyncEvent, { type: "done" }>;
type SyncListener = (event: InstagramSyncEvent) => void;
type SyncJob = {
  result: Promise<SyncDone>;
  listeners: Set<SyncListener>;
  progress?: Extract<InstagramSyncEvent, { type: "progress" }>;
  media?: Extract<InstagramSyncEvent, { type: "media" }>;
};

const AUTO_REFRESH_MS = 60_000;
const pendingSyncs = new Map<string, SyncJob>();
const recentSyncs = new Map<string, number>();

const START_PROGRESS: Record<InstagramSyncInput["scope"], ProgressUpdate> = {
  posts: {
    label: "게시물 불러오는 중",
    detail: "Instagram에 연결하고 있어요.",
  },
  post: {
    label: "댓글 불러오는 중",
    detail: "이 게시물의 댓글을 확인하고 있어요.",
  },
  inbox: {
    label: "인박스 새로고침 중",
    detail: "Instagram에 연결하고 있어요.",
  },
};

async function streamSync(
  input: InstagramSyncInput,
  onEvent: SyncListener,
): Promise<SyncDone> {
  const response = await fetch(INSTAGRAM_SYNC_URL, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      accept: "application/x-ndjson",
    },
    body: JSON.stringify(input),
  }).catch(() => {
    throw new Error(copy.genericError);
  });
  if (!response.ok || !response.body) {
    const failure = await response.json().catch(() => null);
    throw new Error(failure?.message || failure?.error || copy.genericError);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = done ? "" : (lines.pop() ?? "");
      for (const line of lines) {
        if (!line.trim()) continue;
        let event: InstagramSyncEvent;
        try {
          event = JSON.parse(line) as InstagramSyncEvent;
        } catch {
          throw new Error(copy.genericError);
        }
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "done") return event;
        onEvent(event);
      }
      if (done) throw new Error(copy.genericError);
    }
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function startSync(key: string, input: InstagramSyncInput): SyncJob {
  const pending = pendingSyncs.get(key);
  if (pending) return pending;

  const listeners = new Set<SyncListener>();
  const job: SyncJob = {
    listeners,
    result: streamSync(input, (event) => {
      if (event.type === "progress") job.progress = event;
      if (event.type === "media") job.media = event;
      for (const listener of listeners) listener(event);
    })
      .then((event) => {
        if (event.report.commentErrors.length === 0) {
          // Keep cooldowns small and keyed to the signed-in account and screen.
          recentSyncs.delete(key);
          if (recentSyncs.size >= 64) {
            const oldest = recentSyncs.keys().next().value;
            if (oldest !== undefined) recentSyncs.delete(oldest);
          }
          recentSyncs.set(key, Date.now());
        }
        return event;
      })
      .finally(() => pendingSyncs.delete(key)),
  };
  pendingSyncs.set(key, job);
  return job;
}

export function useInstagramSync(
  input: InstagramSyncInput,
  options: {
    accountId: string;
    auto?: boolean;
    onMedia?: (media: MediaItem[]) => void;
    onDone?: (event: SyncDone) => void;
  },
) {
  const scope = input.scope;
  const mediaId = input.scope === "post" ? input.mediaId : undefined;
  const { accountId, auto, onMedia, onDone } = options;
  const key = JSON.stringify([accountId, scope, mediaId]);
  const [busy, setBusy] = useState(false);
  const [settled, setSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const release = useRef<(() => void) | null>(null);
  const currentCallbacks = useRef({ onMedia, onDone });
  const startProgress = useTaskProgress();

  useEffect(() => {
    currentCallbacks.current = { onMedia, onDone };
  }, [onMedia, onDone]);

  const refresh = useCallback(() => {
    if (release.current) return;

    const progress = startProgress(START_PROGRESS[scope]);
    const job = startSync(
      key,
      scope === "post" ? { scope, mediaId: mediaId! } : { scope },
    );
    setBusy(true);
    setError(null);

    function onEvent(event: InstagramSyncEvent) {
      if (event.type === "progress") progress.update(event);
      if (event.type === "media")
        currentCallbacks.current.onMedia?.(event.media);
    }

    const releaseJob = () => {
      job.listeners.delete(onEvent);
      progress.finish();
      if (release.current === releaseJob) release.current = null;
    };
    release.current = releaseJob;
    job.listeners.add(onEvent);
    if (job.progress) onEvent(job.progress);
    if (job.media) onEvent(job.media);

    void job.result
      .then((event) => {
        if (release.current !== releaseJob) return;
        if (!event.report.commentErrors.length) {
          progress.update({ label: "새로고침 완료", value: 100 });
        }
        currentCallbacks.current.onDone?.(event);
      })
      .catch((error: unknown) => {
        if (release.current === releaseJob) {
          setError(error instanceof Error ? error.message : copy.genericError);
        }
      })
      .finally(() => {
        if (release.current !== releaseJob) return;
        releaseJob();
        setBusy(false);
        setSettled(true);
      });
  }, [key, mediaId, scope, startProgress]);

  useEffect(() => () => release.current?.(), [key]);

  useEffect(() => {
    if (!auto) return;
    if (Date.now() - (recentSyncs.get(key) ?? 0) < AUTO_REFRESH_MS) {
      setSettled(true);
      return;
    }
    refresh();
  }, [auto, key, refresh]);

  return { refresh, busy, settled, error };
}
