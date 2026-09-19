import type { MatchMode, RuleItem, RuleScope } from "../hypeup/types.ts";

export type MatchComment = {
  id: string;
  text: string;
  mediaId: string;
  igFromId?: string | null;
  igFromUsername?: string | null;
};

export type MatchSelf = {
  igUserId: string;
  username: string;
};

export type MatchRule = Pick<
  RuleItem,
  | "id"
  | "name"
  | "enabled"
  | "scope"
  | "mediaId"
  | "matchMode"
  | "keywords"
  | "excludeKeywords"
  | "publicReplies"
  | "dmMessage"
  | "hideComment"
  | "sortOrder"
  | "updatedAt"
>;

export type MatchPreview = {
  rule: MatchRule | null;
  skippedSelf: boolean;
  skippedInvalidRegex: boolean;
  publicReply: string | null;
  dmMessage: string | null;
  hideComment: boolean;
};

function includesInsensitive(haystack: string, needle: string) {
  const n = needle.trim().toLowerCase();
  if (!n) return false;
  return haystack.toLowerCase().includes(n);
}

function matchesMode(rule: MatchRule, text: string): { ok: boolean; invalidRegex: boolean } {
  const mode = rule.matchMode as MatchMode;
  if (mode === "ANY") return { ok: true, invalidRegex: false };
  if (mode === "CONTAINS") {
    if (rule.keywords.length === 0) return { ok: false, invalidRegex: false };
    return {
      ok: rule.keywords.some((keyword) => includesInsensitive(text, keyword)),
      invalidRegex: false,
    };
  }
  if (mode === "EXACT") {
    const trimmed = text.trim().toLowerCase();
    return {
      ok: rule.keywords.some((keyword) => keyword.trim().toLowerCase() === trimmed),
      invalidRegex: false,
    };
  }
  if (mode === "REGEX") {
    const pattern = rule.keywords[0];
    if (!pattern) return { ok: false, invalidRegex: false };
    try {
      return { ok: new RegExp(pattern, "i").test(text), invalidRegex: false };
    } catch {
      return { ok: false, invalidRegex: true };
    }
  }
  return { ok: false, invalidRegex: false };
}

function isSelfComment(comment: MatchComment, self: MatchSelf) {
  if (comment.igFromId && comment.igFromId === self.igUserId) return true;
  if (
    comment.igFromUsername &&
    comment.igFromUsername.toLowerCase() === self.username.toLowerCase()
  ) {
    return true;
  }
  return false;
}

export function sortRules(rules: MatchRule[]): MatchRule[] {
  return [...rules].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function pickPublicReply(rule: MatchRule, random = Math.random): string | null {
  if (rule.publicReplies.length === 0) return null;
  const index = Math.floor(random() * rule.publicReplies.length);
  return rule.publicReplies[index] ?? rule.publicReplies[0] ?? null;
}

export function matchRule(
  rules: MatchRule[],
  comment: MatchComment,
  self: MatchSelf,
): MatchPreview {
  if (isSelfComment(comment, self)) {
    return {
      rule: null,
      skippedSelf: true,
      skippedInvalidRegex: false,
      publicReply: null,
      dmMessage: null,
      hideComment: false,
    };
  }

  let skippedInvalidRegex = false;
  for (const rule of sortRules(rules)) {
    if (!rule.enabled) continue;
    if ((rule.scope as RuleScope) === "MEDIA" && rule.mediaId !== comment.mediaId) continue;
    if (rule.excludeKeywords.some((keyword) => includesInsensitive(comment.text, keyword))) {
      continue;
    }
    const result = matchesMode(rule, comment.text);
    if (result.invalidRegex) {
      skippedInvalidRegex = true;
      continue;
    }
    if (!result.ok) continue;
    return {
      rule,
      skippedSelf: false,
      skippedInvalidRegex,
      publicReply: pickPublicReply(rule, () => 0),
      dmMessage: rule.dmMessage,
      hideComment: rule.hideComment,
    };
  }

  return {
    rule: null,
    skippedSelf: false,
    skippedInvalidRegex,
    publicReply: null,
    dmMessage: null,
    hideComment: false,
  };
}

export const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function canPrivateReply(input: {
  repliedPrivate: boolean;
  timestamp: string | null;
  now?: number;
}): { ok: true } | { ok: false; reason: "duplicate" | "expired" } {
  if (input.repliedPrivate) return { ok: false, reason: "duplicate" };
  if (!input.timestamp) return { ok: true };
  const created = new Date(input.timestamp).getTime();
  if (Number.isNaN(created)) return { ok: true };
  const now = input.now ?? Date.now();
  if (now - created > PRIVATE_REPLY_WINDOW_MS) return { ok: false, reason: "expired" };
  return { ok: true };
}
