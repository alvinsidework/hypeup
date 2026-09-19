import { copy } from "./copy";
import { decryptToken, encryptToken } from "./crypto.server";
import { DEMO_USER_ID, isDemoMode } from "./env.server";
import {
  addLog,
  clearUserToken,
  deleteCommentRow,
  deleteRule,
  findUserById,
  findUserByIgId,
  getComment,
  getMedia,
  listComments,
  listLogs,
  listMedia,
  listRules,
  overviewStats,
  saveRule,
  setWebhookSubscribed,
  updateCommentFlags,
  updateUserToken,
  upsertComment,
  upsertMedia,
  type UserRecord,
} from "./repo";
import { ensureDemoData } from "./seed";
import { getSession } from "./session.server";
import type { CommentItem, RuleItem } from "./types";
import { deleteComment, hideComment, listMediaComments, replyToComment } from "@/lib/instagram/comments";
import { graphErrorPayload, koreanError } from "@/lib/instagram/errors";
import { canPrivateReply, matchRule, pickPublicReply, PRIVATE_REPLY_WINDOW_MS } from "@/lib/instagram/engine";
import { sendPrivateReply, subscribeApps } from "@/lib/instagram/messages";
import { listMyMedia } from "@/lib/instagram/media";
import type { IgComment } from "@/lib/instagram/types";

export class AuthRequiredError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "AuthRequiredError";
  }
}

export async function requireUser(): Promise<UserRecord> {
  const session = await getSession();
  if (!session) throw new AuthRequiredError();
  const user = await findUserById(session.userId);
  if (!user) throw new AuthRequiredError();
  return user;
}

export async function optionalUser(): Promise<UserRecord | null> {
  const session = await getSession();
  if (!session) return null;
  return findUserById(session.userId);
}

function plainToken(user: UserRecord): string | null {
  if (!user.tokenCipher) return null;
  return decryptToken(user.tokenCipher);
}

async function flattenComments(userId: string, mediaId: string, comments: IgComment[], parentId: string | null) {
  for (const comment of comments) {
    await upsertComment(userId, {
      id: comment.id,
      mediaId,
      parentId,
      igFromId: comment.from?.id ?? null,
      igFromUsername: comment.from?.username ?? comment.username ?? null,
      text: comment.text ?? "",
      timestamp: comment.timestamp ?? null,
      hidden: false,
      repliedPublic: false,
      repliedPrivate: false,
    });
    const replies = comment.replies?.data ?? [];
    if (replies.length) await flattenComments(userId, mediaId, replies, comment.id);
  }
}

export type SyncReport = {
  media: number;
  comments: number;
  commentErrors: string[];
  rulesRan: number;
};

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      if (current !== undefined) await fn(current);
    }
  });
  await Promise.all(workers);
}

export async function syncFromInstagram(user: UserRecord): Promise<SyncReport> {
  if (user.isDemo || isDemoMode()) {
    await ensureDemoData();
    const comments = await listComments(user.id);
    return { media: 0, comments: comments.length, commentErrors: [], rulesRan: 0 };
  }
  const token = plainToken(user);
  if (!token) throw new Error("token_expired");
  const page = await listMyMedia(token);
  const media = page.data ?? [];
  for (const item of media) {
    await upsertMedia(user.id, {
      id: item.id,
      caption: item.caption ?? null,
      mediaType: item.media_type ?? "IMAGE",
      mediaUrl: item.media_url ?? null,
      thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
      permalink: item.permalink ?? null,
      timestamp: item.timestamp ?? null,
      likeCount: item.like_count ?? null,
      commentsCount: item.comments_count ?? null,
    });
  }

  const commentErrors: string[] = [];
  let commentCount = 0;
  await mapPool(media, 4, async (item) => {
    if (item.comments_count === 0) return;
    try {
      const comments = await listMediaComments(token, item.id);
      const rows = comments.data ?? [];
      commentCount += rows.length;
      await flattenComments(user.id, item.id, rows, null);
    } catch (error) {
      const message = koreanError(error);
      commentErrors.push(message);
      await addLog({
        userId: user.id,
        type: "ERROR",
        success: false,
        mediaId: item.id,
        message: `댓글을 불러오지 못했습니다. ${error instanceof Error ? error.message.slice(0, 180) : ""}`,
        meta: graphErrorPayload(error),
      });
    }
  });

  const rulesRan = await processUnprocessedComments(user);
  return { media: media.length, comments: commentCount, commentErrors, rulesRan };
}

export async function processUnprocessedComments(user: UserRecord): Promise<number> {
  const comments = await listComments(user.id);
  const cutoff = Date.now() - PRIVATE_REPLY_WINDOW_MS;
  let ran = 0;
  for (const comment of comments) {
    if (comment.parentId) continue;
    if (comment.automationProcessedAt) continue;
    if (comment.timestamp) {
      const at = new Date(comment.timestamp).getTime();
      if (!Number.isNaN(at) && at < cutoff) continue;
    }
    await executeRuleOnComment(user, comment, false);
    ran += 1;
  }
  return ran;
}

export async function loadDeskHome(user: UserRecord) {
  const [stats, comments, logs, media] = await Promise.all([
    overviewStats(user.id),
    listComments(user.id),
    listLogs(user.id, { limit: 5 }),
    listMedia(user.id),
  ]);
  return {
    stats,
    recentComments: comments.slice(0, 5),
    recentLogs: logs,
    mediaCount: media.length,
  };
}

export async function publicReply(user: UserRecord, commentId: string, message: string) {
  const comment = await getComment(user.id, commentId);
  if (!comment) throw new Error("not_found");
  if (!user.isDemo && !isDemoMode()) {
    const token = plainToken(user);
    if (!token) throw new Error("token_expired");
    await replyToComment(token, commentId, message);
  } else {
    await upsertComment(user.id, {
      id: `demo-reply-${Date.now()}`,
      mediaId: comment.mediaId,
      parentId: comment.id,
      igFromId: user.igUserId,
      igFromUsername: user.username,
      text: message,
      timestamp: new Date().toISOString(),
      hidden: false,
      repliedPublic: false,
      repliedPrivate: false,
    });
  }
  await updateCommentFlags(user.id, commentId, { repliedPublic: true });
  await addLog({
    userId: user.id,
    type: "PUBLIC_REPLY",
    success: true,
    commentId,
    mediaId: comment.mediaId,
    message: "공개 대댓글을 보냈습니다.",
  });
}

export async function privateReply(user: UserRecord, commentId: string, message: string) {
  const comment = await getComment(user.id, commentId);
  if (!comment) throw new Error("not_found");
  const gate = canPrivateReply(comment);
  if (!gate.ok) throw new Error(gate.reason);
  if (!user.isDemo && !isDemoMode()) {
    const token = plainToken(user);
    if (!token) throw new Error("token_expired");
    await sendPrivateReply(token, user.igUserId, commentId, message);
  }
  await updateCommentFlags(user.id, commentId, { repliedPrivate: true });
  await addLog({
    userId: user.id,
    type: "PRIVATE_REPLY",
    success: true,
    commentId,
    mediaId: comment.mediaId,
    message: "댓글 DM을 보냈습니다.",
  });
}

export async function setHidden(user: UserRecord, commentId: string, hidden: boolean) {
  const comment = await getComment(user.id, commentId);
  if (!comment) throw new Error("not_found");
  if (!user.isDemo && !isDemoMode()) {
    const token = plainToken(user);
    if (!token) throw new Error("token_expired");
    await hideComment(token, commentId, hidden);
  }
  await updateCommentFlags(user.id, commentId, { hidden });
  await addLog({
    userId: user.id,
    type: "HIDE",
    success: true,
    commentId,
    mediaId: comment.mediaId,
    message: hidden ? "댓글을 숨겼습니다." : "댓글 숨김을 해제했습니다.",
  });
}

export async function removeComment(user: UserRecord, commentId: string) {
  const comment = await getComment(user.id, commentId);
  if (!comment) throw new Error("not_found");
  if (!user.isDemo && !isDemoMode()) {
    const token = plainToken(user);
    if (!token) throw new Error("token_expired");
    await deleteComment(token, commentId);
  }
  await deleteCommentRow(user.id, commentId);
  await addLog({
    userId: user.id,
    type: "DELETE",
    success: true,
    commentId,
    mediaId: comment.mediaId,
    message: "댓글을 삭제했습니다.",
  });
}

export async function executeRuleOnComment(user: UserRecord, comment: CommentItem, force = false) {
  if (comment.automationProcessedAt && !force) return { skipped: "already" as const };
  const rules = await listRules(user.id);
  const preview = matchRule(rules, comment, { igUserId: user.igUserId, username: user.username });
  if (preview.skippedSelf) return { skipped: "self" as const };
  if (!preview.rule) {
    await addLog({
      userId: user.id,
      type: "MATCH",
      success: false,
      commentId: comment.id,
      mediaId: comment.mediaId,
      message: "매칭된 룰이 없습니다.",
    });
    await updateCommentFlags(user.id, comment.id, { automationProcessedAt: new Date().toISOString() });
    return { skipped: "no_match" as const };
  }

  const rule = preview.rule;
  await addLog({
    userId: user.id,
    type: "MATCH",
    success: true,
    commentId: comment.id,
    mediaId: comment.mediaId,
    ruleId: rule.id,
    message: `${rule.name} 룰이 매칭되었습니다.`,
  });

  if (rule.hideComment) {
    try {
      await setHidden(user, comment.id, true);
    } catch (error) {
      await addLog({
        userId: user.id,
        type: "ERROR",
        success: false,
        commentId: comment.id,
        ruleId: rule.id,
        message: koreanError(error),
        meta: graphErrorPayload(error),
      });
    }
  }

  const publicText = pickPublicReply(rule);
  if (publicText) {
    try {
      await publicReply(user, comment.id, publicText);
    } catch (error) {
      await addLog({
        userId: user.id,
        type: "ERROR",
        success: false,
        commentId: comment.id,
        ruleId: rule.id,
        message: koreanError(error),
        meta: graphErrorPayload(error),
      });
    }
  }

  if (rule.dmMessage) {
    try {
      await privateReply(user, comment.id, rule.dmMessage);
    } catch (error) {
      await addLog({
        userId: user.id,
        type: "ERROR",
        success: false,
        commentId: comment.id,
        ruleId: rule.id,
        message: koreanError(error),
        meta: graphErrorPayload(error),
      });
    }
  }

  await updateCommentFlags(user.id, comment.id, { automationProcessedAt: new Date().toISOString() });
  return { skipped: null, ruleId: rule.id };
}

export async function ingestWebhookComment(event: {
  igUserId: string;
  commentId: string;
  fromId: string | null;
  fromUsername: string | null;
  text: string;
  mediaId: string | null;
}) {
  const user = await findUserByIgId(event.igUserId);
  if (!user) return;
  if (!event.mediaId) return;
  const media = await getMedia(user.id, event.mediaId);
  if (!media) {
    await upsertMedia(user.id, {
      id: event.mediaId,
      caption: null,
      mediaType: "IMAGE",
      mediaUrl: null,
      thumbnailUrl: null,
      permalink: null,
      timestamp: new Date().toISOString(),
      likeCount: null,
      commentsCount: null,
    });
  }
  const existing = await getComment(user.id, event.commentId);
  if (existing?.automationProcessedAt) return;
  await upsertComment(user.id, {
    id: event.commentId,
    mediaId: event.mediaId,
    parentId: null,
    igFromId: event.fromId,
    igFromUsername: event.fromUsername,
    text: event.text,
    timestamp: new Date().toISOString(),
    hidden: false,
    repliedPublic: false,
    repliedPrivate: false,
  });
  const comment = await getComment(user.id, event.commentId);
  if (!comment) return;
  await addLog({
    userId: user.id,
    type: "WEBHOOK",
    success: true,
    commentId: comment.id,
    mediaId: comment.mediaId,
    message: "댓글 webhook을 수신했습니다.",
  });
  await executeRuleOnComment(user, comment);
}

export async function resubscribe(user: UserRecord) {
  if (user.isDemo || isDemoMode()) {
    await setWebhookSubscribed(user.id, new Date());
    return { ok: true };
  }
  const token = plainToken(user);
  if (!token) throw new Error("token_expired");
  try {
    await subscribeApps(token, user.igUserId);
    await setWebhookSubscribed(user.id, new Date());
    return { ok: true };
  } catch (error) {
    await addLog({
      userId: user.id,
      type: "ERROR",
      success: false,
      message: copy.webhookOff,
      meta: graphErrorPayload(error),
    });
    return { ok: false };
  }
}

export async function disconnectUser(user: UserRecord) {
  await clearUserToken(user.id);
  await addLog({
    userId: user.id,
    type: "AUTH",
    success: true,
    message: "Instagram 연결을 해제했습니다.",
  });
}

export async function persistRefreshedToken(user: UserRecord, accessToken: string, expiresIn: number) {
  const expires = new Date(Date.now() + expiresIn * 1000).toISOString();
  await updateUserToken(user.id, encryptToken(accessToken), expires);
}

export { listComments, listLogs, listMedia, listRules, getMedia, getComment, saveRule, deleteRule };
