import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  AuthRequiredError,
  disconnectUser,
  executeRuleOnComment,
  loadDeskHome,
  processUnprocessedComments,
  privateReply,
  publicReply,
  removeComment,
  requireUser,
  resubscribe,
  setHidden,
} from "./actions.server";
import { copy } from "./copy";
import { isDemoMode } from "./env.server";
import {
  deleteRule,
  getComment,
  getMedia,
  getRule,
  listComments,
  listLogs,
  listMedia,
  listRules,
  saveRule,
} from "./repo";
import { clearSessionCookie } from "./session.server";
import { DM_TEXT_LIMIT, dmTextBytes, FOLLOW_BUTTON_LABEL_LIMIT } from "./rule-messages";
import { koreanError } from "@/lib/instagram/errors";
import { matchRule } from "@/lib/instagram/engine";
import type { RuleItem } from "./types";
export { enterDemo, getBootstrap } from "./bootstrap";

const followerMessage = z.string().trim().refine(
  (value) => dmTextBytes(value) <= DM_TEXT_LIMIT,
  "Instagram DM은 최대 1,000바이트까지 보낼 수 있습니다.",
).nullable().optional();

const ruleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  enabled: z.boolean(),
  scope: z.enum(["ALL", "MEDIA"]),
  mediaId: z.string().nullable(),
  matchMode: z.enum(["ANY", "CONTAINS", "EXACT", "REGEX"]),
  keywords: z.array(z.string()).max(20),
  excludeKeywords: z.array(z.string()).max(20),
  publicReplies: z.array(z.string()).max(5),
  dmMessage: z.string().nullable(),
  hideComment: z.boolean(),
  followersOnly: z.boolean().default(false),
  followOpeningMessage: followerMessage,
  followReminderMessage: followerMessage,
  followButtonLabel: z.string().trim().max(FOLLOW_BUTTON_LABEL_LIMIT).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

async function safeUser() {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof AuthRequiredError) throw error;
    throw error;
  }
}

export const logoutSession = createServerFn({ method: "POST" }).handler(async () => {
  clearSessionCookie();
  return { ok: true as const };
});

export const getOverview = createServerFn({ method: "GET" }).handler(async () => {
  const user = await safeUser();
  const home = await loadDeskHome(user);
  return { user: publicUser(user), ...home, demoMode: isDemoMode() };
});

export const getPosts = createServerFn({ method: "GET" }).handler(async () => {
  const user = await safeUser();
  return { media: await listMedia(user.id), demoMode: isDemoMode() };
});

export const getPostDetail = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await safeUser();
    const [media, comments] = await Promise.all([
      getMedia(user.id, data.id),
      listComments(user.id, { mediaId: data.id }),
    ]);
    return { media, comments };
  });

export const getInbox = createServerFn({ method: "GET" }).handler(async () => {
  const user = await safeUser();
  return { comments: await listComments(user.id) };
});

export const replyPublicFn = createServerFn({ method: "POST" })
  .validator(z.object({ commentId: z.string(), message: z.string().min(1).max(1000) }))
  .handler(async ({ data }) => {
    const user = await safeUser();
    try {
      await publicReply(user, data.commentId, data.message);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: koreanError(error) };
    }
  });

export const sendDmFn = createServerFn({ method: "POST" })
  .validator(z.object({ commentId: z.string(), message: z.string().min(1).max(1000) }))
  .handler(async ({ data }) => {
    const user = await safeUser();
    try {
      await privateReply(user, data.commentId, data.message);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: koreanError(error) };
    }
  });

export const hideCommentFn = createServerFn({ method: "POST" })
  .validator(z.object({ commentId: z.string(), hidden: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await safeUser();
    try {
      await setHidden(user, data.commentId, data.hidden);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: koreanError(error) };
    }
  });

export const deleteCommentFn = createServerFn({ method: "POST" })
  .validator(z.object({ commentId: z.string() }))
  .handler(async ({ data }) => {
    const user = await safeUser();
    try {
      await removeComment(user, data.commentId);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: koreanError(error) };
    }
  });

export const runRuleFn = createServerFn({ method: "POST" })
  .validator(z.object({ commentId: z.string() }))
  .handler(async ({ data }) => {
    const user = await safeUser();
    const comment = await getComment(user.id, data.commentId);
    if (!comment) return { ok: false as const, error: copy.genericError };
    try {
      const result = await executeRuleOnComment(user, comment, true);
      if (result.skipped === "no_match") return { ok: true as const, message: "매칭된 룰이 없습니다." };
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: koreanError(error) };
    }
  });

export const getAutomations = createServerFn({ method: "GET" }).handler(async () => {
  const user = await safeUser();
  const [rules, media] = await Promise.all([listRules(user.id), listMedia(user.id)]);
  return { rules, media };
});

export const saveRuleFn = createServerFn({ method: "POST" })
  .validator(ruleSchema)
  .handler(async ({ data }) => {
    const user = await safeUser();
    if (data.matchMode !== "ANY" && data.keywords.length === 0) {
      throw new Error("키워드를 입력하세요.");
    }
    if (data.dmMessage && dmTextBytes(data.dmMessage) > DM_TEXT_LIMIT) {
      const previous = data.id ? await getRule(user.id, data.id) : null;
      // Allow existing oversized messages to be disabled or edited without losing their text.
      if (previous?.dmMessage?.trim() !== data.dmMessage.trim()) {
        throw new Error("Instagram DM은 최대 1,000바이트까지 보낼 수 있습니다.");
      }
    }
    const saved = await saveRule(user.id, {
      name: data.name,
      enabled: data.enabled,
      scope: data.scope,
      mediaId: data.mediaId,
      matchMode: data.matchMode,
      keywords: data.keywords,
      excludeKeywords: data.excludeKeywords,
      publicReplies: data.publicReplies,
      dmMessage: data.dmMessage,
      hideComment: data.hideComment,
      followersOnly: data.followersOnly,
      followOpeningMessage: data.followOpeningMessage,
      followReminderMessage: data.followReminderMessage,
      followButtonLabel: data.followButtonLabel,
      id: data.id,
      sortOrder: data.sortOrder ?? 0,
    });
    await processUnprocessedComments(user);
    return { rule: saved };
  });

export const deleteRuleFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await safeUser();
    await deleteRule(user.id, data.id);
    return { ok: true as const };
  });

export const simulateFn = createServerFn({ method: "POST" })
  .validator(z.object({ text: z.string(), mediaId: z.string().optional() }))
  .handler(async ({ data }) => {
    const user = await safeUser();
    const rules = await listRules(user.id);
    return matchRule(
      rules,
      {
        id: "sim",
        text: data.text,
        mediaId: data.mediaId ?? "all",
        igFromId: "sim-user",
        igFromUsername: "visitor",
      },
      { igUserId: user.igUserId, username: user.username },
    );
  });

export const getLogsPage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      type: z.string().optional(),
      offset: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await safeUser();
    return { logs: await listLogs(user.id, { type: data.type, offset: data.offset, limit: 20 }) };
  });

export const resubscribeFn = createServerFn({ method: "POST" }).handler(async () => {
  const user = await safeUser();
  return resubscribe(user);
});

export const disconnectFn = createServerFn({ method: "POST" }).handler(async () => {
  const user = await safeUser();
  await disconnectUser(user);
  clearSessionCookie();
  return { ok: true as const };
});

function publicUser(user: {
  id: string;
  igUserId: string;
  username: string;
  name: string | null;
  accountType: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
  tokenExpiresAt: string | null;
  grantedScopes: string[];
  webhookSubscribedAt: string | null;
  hasToken: boolean;
  isDemo: boolean;
}) {
  return user;
}

export type { RuleItem };
