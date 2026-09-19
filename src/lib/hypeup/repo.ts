import { getSql } from "@/lib/db";
import { newId } from "./crypto.server";
import type {
  CommentItem,
  EventLogItem,
  HypeupUser,
  LogType,
  MediaItem,
  OverviewStats,
  RuleItem,
} from "./types";
import { DEMO_USER_ID } from "./env.server";

type UserRow = {
  id: string;
  ig_user_id: string;
  username: string;
  name: string | null;
  account_type: string | null;
  profile_picture_url: string | null;
  followers_count: number | null;
  media_count: number | null;
  token_cipher: string | null;
  token_expires_at: string | Date | null;
  granted_scopes: string[] | null;
  webhook_subscribed_at: string | Date | null;
};

type MediaRow = {
  id: string;
  caption: string | null;
  media_type: string;
  media_url: string | null;
  thumbnail_url: string | null;
  permalink: string | null;
  timestamp: string | Date | null;
  like_count: number | null;
  comments_count: number | null;
};

type CommentRow = {
  id: string;
  media_id: string;
  parent_id: string | null;
  ig_from_id: string | null;
  ig_from_username: string | null;
  text: string;
  timestamp: string | Date | null;
  hidden: boolean;
  replied_public: boolean;
  replied_private: boolean;
  automation_processed_at: string | Date | null;
  media_caption?: string | null;
  media_thumb?: string | null;
  media_type?: string | null;
};

type RuleRow = {
  id: string;
  name: string;
  enabled: boolean;
  scope: string;
  media_id: string | null;
  match_mode: string;
  keywords: string[] | null;
  exclude_keywords: string[] | null;
  public_replies: string[] | null;
  dm_message: string | null;
  hide_comment: boolean;
  sort_order: number;
  updated_at: string | Date;
};

type LogRow = {
  id: string;
  type: string;
  success: boolean;
  comment_id: string | null;
  media_id: string | null;
  rule_id: string | null;
  message: string;
  created_at: string | Date;
};

function asIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value.replace(/^{|}$/g, "").split(",").filter(Boolean);
    }
  }
  return [];
}

export function mapUser(row: UserRow): HypeupUser {
  return {
    id: row.id,
    igUserId: row.ig_user_id,
    username: row.username,
    name: row.name,
    accountType: row.account_type,
    profilePictureUrl: row.profile_picture_url,
    followersCount: row.followers_count,
    mediaCount: row.media_count,
    tokenExpiresAt: asIso(row.token_expires_at),
    grantedScopes: asStringArray(row.granted_scopes),
    webhookSubscribedAt: asIso(row.webhook_subscribed_at),
    hasToken: Boolean(row.token_cipher),
    isDemo: row.id === DEMO_USER_ID,
  };
}

function mapMedia(row: MediaRow): MediaItem {
  return {
    id: row.id,
    caption: row.caption,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    permalink: row.permalink,
    timestamp: asIso(row.timestamp),
    likeCount: row.like_count,
    commentsCount: row.comments_count,
  };
}

function mapComment(row: CommentRow): CommentItem {
  return {
    id: row.id,
    mediaId: row.media_id,
    parentId: row.parent_id,
    igFromId: row.ig_from_id,
    igFromUsername: row.ig_from_username,
    text: row.text,
    timestamp: asIso(row.timestamp),
    hidden: asBool(row.hidden),
    repliedPublic: asBool(row.replied_public),
    repliedPrivate: asBool(row.replied_private),
    automationProcessedAt: asIso(row.automation_processed_at),
    media: row.media_type
      ? {
          id: row.media_id,
          caption: row.media_caption ?? null,
          thumbnailUrl: row.media_thumb ?? null,
          mediaType: row.media_type,
        }
      : null,
  };
}

function mapRule(row: RuleRow): RuleItem {
  return {
    id: row.id,
    name: row.name,
    enabled: asBool(row.enabled),
    scope: row.scope === "MEDIA" ? "MEDIA" : "ALL",
    mediaId: row.media_id,
    matchMode:
      row.match_mode === "EXACT" || row.match_mode === "REGEX" || row.match_mode === "ANY"
        ? row.match_mode
        : "CONTAINS",
    keywords: asStringArray(row.keywords),
    excludeKeywords: asStringArray(row.exclude_keywords),
    publicReplies: asStringArray(row.public_replies),
    dmMessage: row.dm_message,
    hideComment: asBool(row.hide_comment),
    sortOrder: Number(row.sort_order ?? 0),
    updatedAt: asIso(row.updated_at) ?? new Date().toISOString(),
  };
}

export type UserRecord = HypeupUser & { tokenCipher: string | null };

export async function findUserById(id: string): Promise<UserRecord | null> {
  const sql = await getSql();
  const rows = await sql.query<UserRow>("select * from hypeup_user where id = $1", [id]);
  const row = rows[0];
  if (!row) return null;
  return { ...mapUser(row), tokenCipher: row.token_cipher };
}

export async function findUserByIgId(igUserId: string): Promise<UserRecord | null> {
  const sql = await getSql();
  const rows = await sql.query<UserRow>("select * from hypeup_user where ig_user_id = $1", [igUserId]);
  const row = rows[0];
  if (!row) return null;
  return { ...mapUser(row), tokenCipher: row.token_cipher };
}

export async function upsertUser(input: {
  id?: string;
  igUserId: string;
  username: string;
  name: string | null;
  accountType: string | null;
  profilePictureUrl: string | null;
  followersCount: number | null;
  mediaCount: number | null;
  tokenCipher: string | null;
  tokenExpiresAt: string | null;
  grantedScopes: string[];
}): Promise<UserRecord> {
  const existing = await findUserByIgId(input.igUserId);
  const id = existing?.id ?? input.id ?? newId();
  const sql = await getSql();
  await sql.query(
    `insert into hypeup_user (
      id, ig_user_id, username, name, account_type, profile_picture_url,
      followers_count, media_count, token_cipher, token_expires_at, granted_scopes, updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
    on conflict (ig_user_id) do update set
      username = excluded.username,
      name = excluded.name,
      account_type = excluded.account_type,
      profile_picture_url = excluded.profile_picture_url,
      followers_count = excluded.followers_count,
      media_count = excluded.media_count,
      token_cipher = excluded.token_cipher,
      token_expires_at = excluded.token_expires_at,
      granted_scopes = excluded.granted_scopes,
      updated_at = now()`,
    [
      id,
      input.igUserId,
      input.username,
      input.name,
      input.accountType,
      input.profilePictureUrl,
      input.followersCount,
      input.mediaCount,
      input.tokenCipher,
      input.tokenExpiresAt,
      input.grantedScopes,
    ],
  );
  const saved = await findUserByIgId(input.igUserId);
  if (!saved) throw new Error("Failed to upsert user");
  return saved;
}

export async function clearUserToken(userId: string): Promise<void> {
  const sql = await getSql();
  await sql.query(
    "update hypeup_user set token_cipher = null, webhook_subscribed_at = null, updated_at = now() where id = $1",
    [userId],
  );
}

export async function setWebhookSubscribed(userId: string, at: Date | null): Promise<void> {
  const sql = await getSql();
  await sql.query("update hypeup_user set webhook_subscribed_at = $2, updated_at = now() where id = $1", [
    userId,
    at ? at.toISOString() : null,
  ]);
}

export async function listUsersNeedingRefresh(): Promise<UserRecord[]> {
  const sql = await getSql();
  const rows = await sql.query<UserRow>(
    `select * from hypeup_user
     where token_cipher is not null
       and token_expires_at is not null
       and token_expires_at < now() + interval '10 days'`,
  );
  return rows.map((row) => ({ ...mapUser(row), tokenCipher: row.token_cipher }));
}

export async function updateUserToken(
  userId: string,
  tokenCipher: string,
  tokenExpiresAt: string,
): Promise<void> {
  const sql = await getSql();
  await sql.query(
    "update hypeup_user set token_cipher = $2, token_expires_at = $3, updated_at = now() where id = $1",
    [userId, tokenCipher, tokenExpiresAt],
  );
}

export async function upsertMedia(userId: string, media: MediaItem): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into hypeup_media (
      id, user_id, caption, media_type, media_url, thumbnail_url, permalink, timestamp, like_count, comments_count, updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
    on conflict (id) do update set
      caption = excluded.caption,
      media_type = excluded.media_type,
      media_url = excluded.media_url,
      thumbnail_url = excluded.thumbnail_url,
      permalink = excluded.permalink,
      timestamp = excluded.timestamp,
      like_count = excluded.like_count,
      comments_count = excluded.comments_count,
      updated_at = now()`,
    [
      media.id,
      userId,
      media.caption,
      media.mediaType,
      media.mediaUrl,
      media.thumbnailUrl,
      media.permalink,
      media.timestamp,
      media.likeCount,
      media.commentsCount,
    ],
  );
}

export async function listMedia(userId: string): Promise<MediaItem[]> {
  const sql = await getSql();
  const rows = await sql.query<MediaRow>(
    "select * from hypeup_media where user_id = $1 order by timestamp desc nulls last",
    [userId],
  );
  return rows.map(mapMedia);
}

export async function getMedia(userId: string, id: string): Promise<MediaItem | null> {
  const sql = await getSql();
  const rows = await sql.query<MediaRow>("select * from hypeup_media where user_id = $1 and id = $2", [
    userId,
    id,
  ]);
  return rows[0] ? mapMedia(rows[0]) : null;
}

export async function upsertComment(
  userId: string,
  comment: Omit<CommentItem, "media" | "automationProcessedAt"> & { automationProcessedAt?: string | null },
): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into hypeup_comment (
      id, user_id, media_id, parent_id, ig_from_id, ig_from_username, text, timestamp,
      hidden, replied_public, replied_private, automation_processed_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    on conflict (id) do update set
      text = excluded.text,
      hidden = hypeup_comment.hidden,
      replied_public = hypeup_comment.replied_public or excluded.replied_public,
      replied_private = hypeup_comment.replied_private or excluded.replied_private,
      ig_from_id = coalesce(excluded.ig_from_id, hypeup_comment.ig_from_id),
      ig_from_username = coalesce(excluded.ig_from_username, hypeup_comment.ig_from_username)`,
    [
      comment.id,
      userId,
      comment.mediaId,
      comment.parentId,
      comment.igFromId,
      comment.igFromUsername,
      comment.text,
      comment.timestamp,
      comment.hidden,
      comment.repliedPublic,
      comment.repliedPrivate,
      comment.automationProcessedAt ?? null,
    ],
  );
}

export async function listComments(
  userId: string,
  opts: { mediaId?: string; filter?: string; q?: string } = {},
): Promise<CommentItem[]> {
  const sql = await getSql();
  const params: unknown[] = [userId];
  const where = ["c.user_id = $1"];
  if (opts.mediaId) {
    params.push(opts.mediaId);
    where.push(`c.media_id = $${params.length}`);
  }
  if (opts.filter === "unreplied") {
    where.push("c.replied_public = false and c.replied_private = false");
  }
  if (opts.filter === "hidden") {
    where.push("c.hidden = true");
  }
  if (opts.q) {
    params.push(`%${opts.q}%`);
    where.push(`(c.text ilike $${params.length} or coalesce(c.ig_from_username,'') ilike $${params.length})`);
  }
  const rows = await sql.query<CommentRow>(
    `select c.*, m.caption as media_caption, m.thumbnail_url as media_thumb, m.media_type
     from hypeup_comment c
     left join hypeup_media m on m.id = c.media_id
     where ${where.join(" and ")}
     order by c.timestamp desc nulls last, c.created_at desc`,
    params,
  );
  return rows.map(mapComment);
}

export async function getComment(userId: string, id: string): Promise<CommentItem | null> {
  const sql = await getSql();
  const rows = await sql.query<CommentRow>(
    `select c.*, m.caption as media_caption, m.thumbnail_url as media_thumb, m.media_type
     from hypeup_comment c
     left join hypeup_media m on m.id = c.media_id
     where c.user_id = $1 and c.id = $2`,
    [userId, id],
  );
  return rows[0] ? mapComment(rows[0]) : null;
}

export async function updateCommentFlags(
  userId: string,
  id: string,
  patch: Partial<{
    hidden: boolean;
    repliedPublic: boolean;
    repliedPrivate: boolean;
    automationProcessedAt: string | null;
  }>,
): Promise<void> {
  const sql = await getSql();
  const sets: string[] = [];
  const params: unknown[] = [];
  const add = (column: string, value: unknown) => {
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  };
  if (patch.hidden !== undefined) add("hidden", patch.hidden);
  if (patch.repliedPublic !== undefined) add("replied_public", patch.repliedPublic);
  if (patch.repliedPrivate !== undefined) add("replied_private", patch.repliedPrivate);
  if (patch.automationProcessedAt !== undefined) add("automation_processed_at", patch.automationProcessedAt);
  if (sets.length === 0) return;
  params.push(userId, id);
  await sql.query(
    `update hypeup_comment set ${sets.join(", ")} where user_id = $${params.length - 1} and id = $${params.length}`,
    params,
  );
}

export async function deleteCommentRow(userId: string, id: string): Promise<void> {
  const sql = await getSql();
  await sql.query("delete from hypeup_comment where user_id = $1 and id = $2", [userId, id]);
}

export async function listRules(userId: string): Promise<RuleItem[]> {
  const sql = await getSql();
  const rows = await sql.query<RuleRow>(
    "select * from hypeup_rule where user_id = $1 order by sort_order asc, updated_at desc",
    [userId],
  );
  return rows.map(mapRule);
}

export async function saveRule(
  userId: string,
  rule: Omit<RuleItem, "updatedAt" | "id"> & { id?: string },
): Promise<RuleItem> {
  const sql = await getSql();
  const id = rule.id && rule.id !== "new" ? rule.id : newId();
  await sql.query(
    `insert into hypeup_rule (
      id, user_id, name, enabled, scope, media_id, match_mode, keywords, exclude_keywords,
      public_replies, dm_message, hide_comment, sort_order, updated_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
    on conflict (id) do update set
      name = excluded.name,
      enabled = excluded.enabled,
      scope = excluded.scope,
      media_id = excluded.media_id,
      match_mode = excluded.match_mode,
      keywords = excluded.keywords,
      exclude_keywords = excluded.exclude_keywords,
      public_replies = excluded.public_replies,
      dm_message = excluded.dm_message,
      hide_comment = excluded.hide_comment,
      sort_order = excluded.sort_order,
      updated_at = now()`,
    [
      id,
      userId,
      rule.name,
      rule.enabled,
      rule.scope,
      rule.mediaId,
      rule.matchMode,
      rule.keywords,
      rule.excludeKeywords,
      rule.publicReplies,
      rule.dmMessage,
      rule.hideComment,
      rule.sortOrder,
    ],
  );
  const rows = await sql.query<RuleRow>("select * from hypeup_rule where id = $1", [id]);
  if (!rows[0]) throw new Error("Failed to save rule");
  return mapRule(rows[0]);
}

export async function deleteRule(userId: string, id: string): Promise<void> {
  const sql = await getSql();
  await sql.query("delete from hypeup_rule where user_id = $1 and id = $2", [userId, id]);
}

export async function addLog(input: {
  userId: string;
  type: LogType;
  success: boolean;
  message: string;
  commentId?: string | null;
  mediaId?: string | null;
  ruleId?: string | null;
  meta?: unknown;
}): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into hypeup_event_log (id, user_id, type, success, comment_id, media_id, rule_id, message, meta)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
    [
      newId(),
      input.userId,
      input.type,
      input.success,
      input.commentId ?? null,
      input.mediaId ?? null,
      input.ruleId ?? null,
      input.message,
      input.meta ? JSON.stringify(input.meta) : null,
    ],
  );
}

export async function listLogs(
  userId: string,
  opts: { type?: string; limit?: number; offset?: number } = {},
): Promise<EventLogItem[]> {
  const sql = await getSql();
  const params: unknown[] = [userId];
  const where = ["user_id = $1"];
  if (opts.type) {
    params.push(opts.type);
    where.push(`type = $${params.length}`);
  }
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;
  params.push(limit, offset);
  const rows = await sql.query<LogRow>(
    `select id, type, success, comment_id, media_id, rule_id, message, created_at
     from hypeup_event_log
     where ${where.join(" and ")}
     order by created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    success: asBool(row.success),
    commentId: row.comment_id,
    mediaId: row.media_id,
    ruleId: row.rule_id,
    message: row.message,
    createdAt: asIso(row.created_at) ?? new Date().toISOString(),
  }));
}

export async function overviewStats(userId: string): Promise<OverviewStats> {
  const sql = await getSql();
  const [comments] = await sql.query<{ n: number }>(
    `select count(*)::int as n from hypeup_comment
     where user_id = $1 and coalesce(timestamp, created_at) >= date_trunc('day', now())`,
    [userId],
  );
  const [replies] = await sql.query<{ n: number }>(
    `select count(*)::int as n from hypeup_event_log
     where user_id = $1 and type = 'PUBLIC_REPLY' and success = true and created_at >= date_trunc('day', now())`,
    [userId],
  );
  const [dms] = await sql.query<{ n: number }>(
    `select count(*)::int as n from hypeup_event_log
     where user_id = $1 and type = 'PRIVATE_REPLY' and success = true and created_at >= date_trunc('day', now())`,
    [userId],
  );
  const [rules] = await sql.query<{ n: number }>(
    `select count(*)::int as n from hypeup_rule where user_id = $1 and enabled = true`,
    [userId],
  );
  return {
    commentsToday: Number(comments?.n ?? 0),
    publicRepliesToday: Number(replies?.n ?? 0),
    dmsToday: Number(dms?.n ?? 0),
    activeRules: Number(rules?.n ?? 0),
  };
}
