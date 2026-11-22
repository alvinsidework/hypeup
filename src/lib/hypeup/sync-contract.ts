import type { CommentItem, MediaItem } from "./types";

export type InstagramSyncInput =
  { scope: "posts" | "inbox" } | { scope: "post"; mediaId: string };

export type SyncReport = {
  media: number;
  comments: number;
  commentErrors: string[];
  rulesRan: number;
};

export type InstagramSyncEvent =
  | { type: "progress"; label: string; detail?: string; value?: number }
  | { type: "media"; media: MediaItem[] }
  | { type: "done"; report: SyncReport; comments?: CommentItem[] }
  | { type: "error"; message: string };

export const INSTAGRAM_SYNC_URL = "/api/instagram/sync";
