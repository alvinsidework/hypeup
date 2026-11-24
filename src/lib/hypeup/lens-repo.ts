import { getSql } from "@/lib/db";
import { unpackBrandContract } from "./brand-repo.server";
import { encryptToken, newId } from "./crypto.server";
import { PORTFOLIO_METRICS, PORTFOLIO_METRIC_LABEL, type PortfolioMetric } from "./portfolio-metrics";
import { DEFAULT_PROFILE_LAYOUT, type ProfileLayout } from "./profile-layout";
import {
  CHANNEL_LABEL,
  FORMAT_LABEL,
  type DealFormat,
  type DealModel,
  type DealStatus,
  type LensDeal,
  type LensMessage,
  type LensSettlement,
  type Party,
  type RateTemplate,
  type Terms,
  canPropose,
  formatDay,
  maskAccount,
  maskEmail,
  systemSentences,
  transitionError,
  trustLabel,
  priceLabel,
  type DealActionType,
  type WorkChannel,
} from "./lens-rules";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : "";
}

function day(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  return text.slice(0, 10);
}

function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function isUnique(error: unknown): boolean {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";
  return code === "23505" || /unique/i.test(message);
}

export type PageLink = { label: string; url: string };
export type PageDraft = {
  username: string;
  layout: ProfileLayout;
  displayName: string;
  bio: string;
  categories: string[];
  instagramHandle: string;
  instagramFollowers: number | null;
  tiktokHandle: string;
  tiktokFollowers: number | null;
  youtubeHandle: string;
  youtubeFollowers: number | null;
  links: PageLink[];
  isPublic: boolean;
  notifyEmail: boolean;
  payoutLabel: string | null;
  hasCustomPhoto: boolean;
  customPhotoUrl: string | null;
};

export type PublicPage = {
  username: string;
  layout: ProfileLayout;
  displayName: string;
  bio: string;
  categories: string[];
  avatarUrl: string | null;
  channels: { key: string; label: string; handle: string; followers: number | null }[];
  works: {
    id: string;
    title: string;
    brandName: string;
    channelLabel: string;
    formatLabel: string;
    postUrl: string | null;
    coverUrl: string | null;
    mediaType?: string | null;
    postedMonth: string | null;
    highlightLabel: string | null;
    highlightValue: string | null;
    stats: { label: string; value: string }[];
  }[];
  links: PageLink[];
};

type PageRow = {
  user_id: string;
  username: string | null;
  profile_layout: ProfileLayout | null;
  display_name: string;
  bio: string;
  categories: string[] | null;
  instagram_handle: string | null;
  instagram_followers: number | null;
  tiktok_handle: string | null;
  tiktok_followers: number | null;
  youtube_handle: string | null;
  youtube_followers: number | null;
  links: unknown;
  is_public: boolean;
  notify_email: boolean;
  bank_name: string | null;
  account_last4: string | null;
  account_holder: string | null;
  profile_photo_key: string | null;
};

function linksOf(value: unknown): PageLink[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asObject(item);
    if (!row || typeof row.label !== "string" || typeof row.url !== "string") return [];
    return [{ label: row.label, url: row.url }];
  });
}

function mapPage(row: PageRow): PageDraft {
  return {
    username: row.username ?? "",
    layout: row.profile_layout ?? DEFAULT_PROFILE_LAYOUT,
    displayName: row.display_name ?? "",
    bio: row.bio ?? "",
    categories: textArray(row.categories),
    instagramHandle: row.instagram_handle ?? "",
    instagramFollowers: row.instagram_followers,
    tiktokHandle: row.tiktok_handle ?? "",
    tiktokFollowers: row.tiktok_followers,
    youtubeHandle: row.youtube_handle ?? "",
    youtubeFollowers: row.youtube_followers,
    links: linksOf(row.links),
    isPublic: row.is_public,
    notifyEmail: row.notify_email,
    payoutLabel: row.account_last4 ? maskAccount(row.bank_name ?? "", row.account_last4) : null,
    hasCustomPhoto: Boolean(row.profile_photo_key),
    customPhotoUrl: row.profile_photo_key ? `/api/lens/profile-photo?key=${row.profile_photo_key}` : null,
  };
}

const PAGE_COLUMNS = `user_id, username, display_name, bio, categories, instagram_handle, instagram_followers,
  tiktok_handle, tiktok_followers, youtube_handle, youtube_followers, links, is_public, notify_email,
  bank_name, account_last4, account_holder, profile_photo_key, profile_layout`;

export async function getPage(userId: string): Promise<PageDraft | null> {
  const sql = await getSql();
  const rows = await sql.query<PageRow>(`select ${PAGE_COLUMNS} from hypeup_page where user_id = $1`, [userId]);
  return rows[0] ? mapPage(rows[0]) : null;
}

export async function savePage(
  userId: string,
  page: Omit<PageDraft, "payoutLabel" | "notifyEmail" | "hasCustomPhoto" | "customPhotoUrl" | "layout"> & {
    layout?: ProfileLayout | null;
    profilePhoto?: string | null;
  },
): Promise<Ok<{ page: PageDraft }> | Err> {
  const sql = await getSql();
  const username = page.username || null;
  try {
    await sql.query(
      `insert into hypeup_page (
        user_id, username, display_name, bio, categories, instagram_handle, instagram_followers,
        tiktok_handle, tiktok_followers, youtube_handle, youtube_followers, links, is_public,
        profile_photo, profile_photo_key, profile_layout, updated_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,decode($14, 'base64'),$15,coalesce($17, $18),now())
      on conflict (user_id) do update set
        username = excluded.username,
        display_name = excluded.display_name,
        bio = excluded.bio,
        categories = excluded.categories,
        instagram_handle = excluded.instagram_handle,
        instagram_followers = excluded.instagram_followers,
        tiktok_handle = excluded.tiktok_handle,
        tiktok_followers = excluded.tiktok_followers,
        youtube_handle = excluded.youtube_handle,
        youtube_followers = excluded.youtube_followers,
        links = excluded.links,
        is_public = excluded.is_public,
        profile_photo = case when $16 then excluded.profile_photo else hypeup_page.profile_photo end,
        profile_photo_key = case when $16 then excluded.profile_photo_key else hypeup_page.profile_photo_key end,
        profile_layout = coalesce($17, hypeup_page.profile_layout),
        updated_at = now()`,
      [
        userId,
        username,
        page.displayName,
        page.bio,
        page.categories,
        page.instagramHandle || null,
        page.instagramFollowers,
        page.tiktokHandle || null,
        page.tiktokFollowers,
        page.youtubeHandle || null,
        page.youtubeFollowers,
        JSON.stringify(page.links),
        page.isPublic,
        page.profilePhoto ?? null,
        page.profilePhoto ? newId() : null,
        page.profilePhoto !== undefined,
        page.layout ?? null,
        DEFAULT_PROFILE_LAYOUT,
      ],
    );
  } catch (error) {
    if (isUnique(error)) return { ok: false, error: "이미 쓰는 주소입니다." };
    throw error;
  }
  const saved = await getPage(userId);
  if (!saved) return { ok: false, error: "페이지를 저장하지 못했습니다." };
  return { ok: true, page: saved };
}

export async function getProfilePhoto(key: string, viewerId: string | null): Promise<Uint8Array | null> {
  const sql = await getSql();
  const [row] = await sql.query<{ profile_photo: Uint8Array | null }>(
    `select profile_photo from hypeup_page where profile_photo_key = $1
       and ((is_public and username is not null) or user_id = $2)`,
    [key, viewerId],
  );
  return row?.profile_photo ?? null;
}

export async function savePrivate(
  userId: string,
  input: { notifyEmail: boolean; bankName?: string; accountNumber?: string; accountHolder?: string },
): Promise<Ok<{ payoutLabel: string | null; notifyEmail: boolean }> | Err> {
  const sql = await getSql();
  await sql.query(
    `insert into hypeup_page (user_id, display_name, notify_email)
     values ($1, '', $2)
     on conflict (user_id) do update set notify_email = excluded.notify_email, updated_at = now()`,
    [userId, input.notifyEmail],
  );
  const number = input.accountNumber?.replace(/\s/g, "") ?? "";
  if (number) {
    const bankName = (input.bankName ?? "").trim();
    const holder = (input.accountHolder ?? "").trim();
    if (bankName.length < 1 || bankName.length > 40) return { ok: false, error: "은행명을 입력해 주세요." };
    if (holder.length < 1 || holder.length > 40) return { ok: false, error: "예금주를 입력해 주세요." };
    if (!/^\d{6,20}$/.test(number)) return { ok: false, error: "계좌번호는 숫자 6~20자리입니다." };
    let cipher = "";
    try {
      cipher = encryptToken(number);
    } catch {
      return { ok: false, error: "계좌를 암호화할 서버 키가 없습니다." };
    }
    await sql.query(
      `update hypeup_page
       set bank_name = $2, account_cipher = $3, account_last4 = $4, account_holder = $5, updated_at = now()
       where user_id = $1`,
      [userId, bankName, cipher, number.slice(-4), holder],
    );
  }
  const page = await getPage(userId);
  return { ok: true, payoutLabel: page?.payoutLabel ?? null, notifyEmail: page?.notifyEmail ?? input.notifyEmail };
}

type RateRow = {
  id: string;
  sort_order: number;
  format: string;
  title: string;
  model: string;
  amount_krw: number | null;
  rate_bps: number | null;
  price_hidden: boolean;
  deliverable_count: number;
  description: string;
  revisions: number;
  turnaround_days: number;
  usage_days: number;
  paid_ads: boolean;
  raw_files: boolean;
  exclusivity_days: number;
  exclusivity_category: string | null;
  is_public: boolean;
};

function mapRate(row: RateRow): RateTemplate {
  return {
    id: row.id,
    title: row.title,
    format: row.format as DealFormat,
    model: row.model as DealModel,
    amountKrw: row.amount_krw,
    rateBps: row.rate_bps,
    priceHidden: row.price_hidden,
    deliverableCount: row.deliverable_count,
    description: row.description,
    revisions: row.revisions,
    turnaroundDays: row.turnaround_days,
    usageDays: row.usage_days,
    paidAds: row.paid_ads,
    rawFiles: row.raw_files,
    exclusivityDays: row.exclusivity_days,
    exclusivityCategory: row.exclusivity_category,
    isPublic: row.is_public,
  };
}

export async function listRates(userId: string, brandVisibleOnly = false): Promise<RateTemplate[]> {
  const sql = await getSql();
  const rows = await sql.query<RateRow>(
    `select id, sort_order, format, title, model, amount_krw, rate_bps, price_hidden, deliverable_count,
      description, revisions, turnaround_days, usage_days, paid_ads, raw_files, exclusivity_days,
      exclusivity_category, is_public
     from hypeup_rate where user_id = $1 and (not $2::boolean or (is_public and not price_hidden))
     order by sort_order asc, created_at asc`,
    [userId, brandVisibleOnly],
  );
  return rows.map(mapRate);
}

export async function saveRate(
  userId: string,
  rate: Omit<RateTemplate, "id"> & { id?: string },
): Promise<Ok<{ rates: RateTemplate[] }> | Err> {
  const sql = await getSql();
  const id = rate.id || newId();
  const existing = rate.id
    ? await sql.query<{ id: string }>("select id from hypeup_rate where id = $1 and user_id = $2", [id, userId])
    : [];
  if (!rate.id) {
    const count = await sql.query<{ n: number }>("select count(*)::int as n from hypeup_rate where user_id = $1", [
      userId,
    ]);
    if ((count[0]?.n ?? 0) >= 20) return { ok: false, error: "단가는 20개까지입니다." };
  } else if (!existing.length) {
    return { ok: false, error: "단가를 찾지 못했습니다." };
  }
  const sort = existing.length
    ? undefined
    : ((
        await sql.query<{ n: number }>("select coalesce(max(sort_order), -1)::int as n from hypeup_rate where user_id = $1", [
          userId,
        ])
      )[0]?.n ?? -1) + 1;
  if (existing.length) {
    await sql.query(
      `update hypeup_rate set format=$3, title=$4, model=$5, amount_krw=$6, rate_bps=$7, price_hidden=$8,
        deliverable_count=$9, description=$10, revisions=$11, turnaround_days=$12, usage_days=$13, paid_ads=$14,
        raw_files=$15, exclusivity_days=$16, exclusivity_category=$17, is_public=$18
       where id=$1 and user_id=$2`,
      [
        id,
        userId,
        rate.format,
        rate.title,
        rate.model,
        rate.amountKrw,
        rate.rateBps,
        rate.priceHidden,
        rate.deliverableCount,
        rate.description,
        rate.revisions,
        rate.turnaroundDays,
        rate.usageDays,
        rate.paidAds,
        rate.rawFiles,
        rate.exclusivityDays,
        rate.exclusivityCategory,
        rate.isPublic,
      ],
    );
  } else {
    await sql.query(
      `insert into hypeup_rate (
        id, user_id, sort_order, format, title, model, amount_krw, rate_bps, price_hidden, deliverable_count,
        description, revisions, turnaround_days, usage_days, paid_ads, raw_files, exclusivity_days,
        exclusivity_category, is_public
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`,
      [
        id,
        userId,
        sort,
        rate.format,
        rate.title,
        rate.model,
        rate.amountKrw,
        rate.rateBps,
        rate.priceHidden,
        rate.deliverableCount,
        rate.description,
        rate.revisions,
        rate.turnaroundDays,
        rate.usageDays,
        rate.paidAds,
        rate.rawFiles,
        rate.exclusivityDays,
        rate.exclusivityCategory,
        rate.isPublic,
      ],
    );
  }
  return { ok: true, rates: await listRates(userId) };
}

export async function deleteRate(userId: string, id: string): Promise<RateTemplate[]> {
  const sql = await getSql();
  await sql.query("delete from hypeup_rate where user_id = $1 and id = $2", [userId, id]);
  return listRates(userId);
}

export async function moveRate(userId: string, id: string, direction: "up" | "down"): Promise<RateTemplate[]> {
  const rates = await listRates(userId);
  const index = rates.findIndex((rate) => rate.id === id);
  const swap = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swap < 0 || swap >= rates.length) return rates;
  const next = rates.slice();
  const current = next[index];
  const other = next[swap];
  if (!current || !other) return rates;
  next[index] = other;
  next[swap] = current;
  const sql = await getSql();
  for (let i = 0; i < next.length; i += 1) {
    await sql.query("update hypeup_rate set sort_order = $3 where user_id = $1 and id = $2", [userId, next[i]?.id, i]);
  }
  return listRates(userId);
}

export type WorkItem = {
  id: string;
  title: string;
  brandName: string;
  channel: WorkChannel;
  format: DealFormat;
  postUrl: string;
  coverUrl: string;
  postedMonth: string;
  highlightLabel: string;
  highlightValue: string;
  stats: { label: string; value: string }[];
  isPublic: boolean;
  instagramMediaId: string | null;
  publicMetrics: PortfolioMetric[];
  viewCount: number | null;
};

type WorkRow = {
  id: string;
  title: string;
  brand_name: string | null;
  channel: string;
  format: string;
  post_url: string | null;
  cover_url: string | null;
  posted_month: string | null;
  highlight_label: string | null;
  highlight_value: string | null;
  stats: unknown;
  is_public: boolean;
  instagram_media_id: string | null;
  public_metrics: string[];
  view_count: number | null;
  instagram_post_url: string | null;
  instagram_cover_url: string | null;
  instagram_media_type: string | null;
  likes: number | null;
  comments: number | null;
};

const WORK_SELECT = `select w.id, w.title, w.brand_name, w.channel, w.format,
    w.post_url, w.cover_url, w.posted_month, w.highlight_label, w.highlight_value, w.stats, w.is_public,
    w.instagram_media_id, w.public_metrics, w.view_count, m.permalink as instagram_post_url,
    case when m.media_type in ('VIDEO', 'REELS') then m.thumbnail_url
      else coalesce(m.thumbnail_url, m.media_url) end as instagram_cover_url,
    m.media_type as instagram_media_type, m.like_count as likes, m.comments_count as comments
  from hypeup_work w left join hypeup_media m on m.id = w.instagram_media_id and m.user_id = w.user_id`;

function metricsOf(row: WorkRow): PortfolioMetric[] {
  return PORTFOLIO_METRICS.filter((metric) => row.public_metrics.includes(metric));
}

function mapStats(value: unknown): { label: string; value: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = asObject(item);
    if (!row || typeof row.label !== "string" || typeof row.value !== "string") return [];
    return [{ label: row.label, value: row.value }];
  });
}

function mapWork(row: WorkRow): WorkItem {
  return {
    id: row.id,
    title: row.title,
    brandName: row.brand_name ?? "",
    channel: row.channel as WorkChannel,
    format: row.format as DealFormat,
    postUrl: row.instagram_post_url ?? row.post_url ?? "",
    coverUrl: row.instagram_cover_url ?? row.cover_url ?? "",
    postedMonth: row.posted_month ?? "",
    highlightLabel: row.highlight_label ?? "",
    highlightValue: row.highlight_value ?? "",
    stats: mapStats(row.stats),
    isPublic: row.is_public,
    instagramMediaId: row.instagram_media_id,
    publicMetrics: metricsOf(row),
    viewCount: row.view_count,
  };
}

async function listWorkRows(userId: string, publicOnly = false): Promise<WorkRow[]> {
  const sql = await getSql();
  return sql.query<WorkRow>(
    `${WORK_SELECT} where w.user_id = $1${publicOnly ? " and w.is_public = true" : ""}
      order by w.sort_order asc, w.created_at asc`,
    [userId],
  );
}

export async function listWorks(userId: string): Promise<WorkItem[]> {
  return (await listWorkRows(userId)).map(mapWork);
}

export async function getWork(userId: string, id: string): Promise<WorkItem | null> {
  const sql = await getSql();
  const [row] = await sql.query<WorkRow>(`${WORK_SELECT} where w.user_id = $1 and w.id = $2`, [userId, id]);
  return row ? mapWork(row) : null;
}

export async function saveWork(userId: string, work: Omit<WorkItem, "id"> & { id?: string }): Promise<Ok<{ works: WorkItem[] }> | Err> {
  const sql = await getSql();
  const id = work.id || newId();
  const existing = work.id
    ? await sql.query("select id from hypeup_work where id = $1 and user_id = $2", [id, userId])
    : [];
  if (!work.id) {
    const count = await sql.query<{ n: number }>("select count(*)::int as n from hypeup_work where user_id = $1", [userId]);
    if ((count[0]?.n ?? 0) >= 30) return { ok: false, error: "포트폴리오는 30개까지입니다." };
  } else if (!existing.length) return { ok: false, error: "작업을 찾지 못했습니다." };
  const sort = existing.length
    ? 0
    : ((
        await sql.query<{ n: number }>("select coalesce(max(sort_order), -1)::int as n from hypeup_work where user_id = $1", [
          userId,
        ])
      )[0]?.n ?? -1) + 1;
  const params = [
    work.title,
    work.brandName || null,
    work.channel,
    work.format,
    work.postUrl || null,
    work.coverUrl,
    work.postedMonth || null,
    work.highlightLabel || null,
    work.highlightValue || null,
    JSON.stringify(work.stats),
    work.isPublic,
    work.instagramMediaId,
    work.publicMetrics,
    work.viewCount,
  ];
  try {
    if (existing.length) {
      await sql.query(
        `update hypeup_work set title=$3, brand_name=$4, channel=$5, format=$6, post_url=$7, cover_url=$8,
          posted_month=$9, highlight_label=$10, highlight_value=$11, stats=$12::jsonb, is_public=$13,
          instagram_media_id=$14, public_metrics=$15, view_count=$16
         where id=$1 and user_id=$2`,
        [id, userId, ...params],
      );
    } else {
      await sql.query(
        `insert into hypeup_work (
          id, user_id, sort_order, title, brand_name, channel, format, post_url, cover_url, posted_month,
          highlight_label, highlight_value, stats, is_public, instagram_media_id, public_metrics, view_count
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17)`,
        [id, userId, sort, ...params],
      );
    }
  } catch (error) {
    if (work.instagramMediaId && isUnique(error)) return { ok: false, error: "이미 포트폴리오에 추가한 게시물입니다." };
    throw error;
  }
  return { ok: true, works: await listWorks(userId) };
}

export async function deleteWork(userId: string, id: string): Promise<WorkItem[]> {
  const sql = await getSql();
  await sql.query("delete from hypeup_work where user_id = $1 and id = $2", [userId, id]);
  return listWorks(userId);
}

export async function moveWork(userId: string, id: string, direction: "up" | "down"): Promise<WorkItem[]> {
  const works = await listWorks(userId);
  const index = works.findIndex((work) => work.id === id);
  const swap = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swap < 0 || swap >= works.length) return works;
  const next = works.slice();
  const current = next[index];
  const other = next[swap];
  if (!current || !other) return works;
  next[index] = other;
  next[swap] = current;
  const sql = await getSql();
  for (let i = 0; i < next.length; i += 1) {
    await sql.query("update hypeup_work set sort_order = $3 where user_id = $1 and id = $2", [userId, next[i]?.id, i]);
  }
  return listWorks(userId);
}

function channel(key: string, label: string, handle: string | null, followers: number | null) {
  if (!handle) return [];
  return [{ key, label, handle, followers }];
}

function publicWorkStats(row: WorkRow): PublicPage["works"][number]["stats"] {
  if (!row.instagram_media_id) return mapStats(row.stats).slice(0, 4);
  const counts = { views: row.view_count, comments: row.comments, likes: row.likes };
  return metricsOf(row).flatMap((metric) => {
    const count = counts[metric];
    return count == null ? [] : [{ label: PORTFOLIO_METRIC_LABEL[metric], value: count.toLocaleString("ko-KR") }];
  });
}

export async function getPublicPage(username: string): Promise<PublicPage | null> {
  const sql = await getSql();
  const rows = await sql.query<
    PageRow & { profile_picture_url: string | null }
  >(
    `select p.user_id, p.username, p.display_name, p.bio, p.categories, p.instagram_handle, p.instagram_followers,
      p.tiktok_handle, p.tiktok_followers, p.youtube_handle, p.youtube_followers, p.links, p.is_public,
      p.notify_email, p.bank_name, p.account_last4, p.account_holder, p.profile_photo_key, p.profile_layout, u.profile_picture_url
     from hypeup_page p
     join hypeup_user u on u.id = p.user_id
     where p.username = $1 and p.is_public = true`,
    [username],
  );
  const row = rows[0];
  if (!row?.username) return null;
  return buildPublicPage(row.user_id, mapPage(row), row.username, row.profile_picture_url);
}

export async function buildPublicPage(
  userId: string,
  page: PageDraft,
  username: string,
  instagramAvatarUrl: string | null,
): Promise<PublicPage> {
  const works = await listWorkRows(userId, true);
  return {
    username,
    layout: page.layout,
    displayName: page.displayName || username,
    bio: page.bio,
    categories: page.categories.slice(0, 3),
    avatarUrl: page.customPhotoUrl ?? instagramAvatarUrl,
    channels: [
      ...channel("instagram", "인스타그램", page.instagramHandle, page.instagramFollowers),
      ...channel("tiktok", "틱톡", page.tiktokHandle, page.tiktokFollowers),
      ...channel("youtube", "유튜브", page.youtubeHandle, page.youtubeFollowers),
    ],
    works: works.map((work) => ({
      id: work.id,
      title: work.title,
      brandName: work.brand_name?.trim() || "브랜드 비공개",
      channelLabel: CHANNEL_LABEL[work.channel as WorkChannel] ?? work.channel,
      formatLabel: FORMAT_LABEL[work.format as DealFormat] ?? work.format,
      postUrl: work.instagram_post_url ?? work.post_url,
      coverUrl: work.instagram_cover_url ?? work.cover_url,
      mediaType: work.instagram_media_type,
      postedMonth: work.posted_month,
      highlightLabel: work.instagram_media_id ? null : work.highlight_label,
      highlightValue: work.instagram_media_id ? null : work.highlight_value,
      stats: publicWorkStats(work),
    })),
    links: page.links.slice(0, 5),
  };
}

export type InquiryListItem = {
  id: string;
  company: string;
  contactName: string;
  trustLabel: string;
  emailMasked: string;
  lastBody: string;
  lastAt: string;
  unread: number;
  dealStatus: DealStatus | null;
  archived: boolean;
};

export async function listInquiries(userId: string, archived: boolean): Promise<InquiryListItem[]> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    company: string;
    contact_name: string;
    email: string;
    trust: string;
    last_body: string | null;
    last_message_at: unknown;
    unread_count: number;
    deal_status: DealStatus | null;
    archived: boolean;
  }>(
    `select t.id, coalesce(nullif(t.company_name, ''), b.company) as company, b.contact_name, b.email, b.trust, t.last_message_at, t.unread_count, t.archived,
      (select m.body from hypeup_message m where m.thread_id = t.id order by m.created_at desc limit 1) as last_body,
      (select d.status from hypeup_deal d where d.thread_id = t.id and d.status <> 'cancelled' order by d.created_at desc limit 1) as deal_status
     from hypeup_thread t
     join hypeup_brand b on b.id = t.brand_id
     where t.user_id = $1 and t.archived = $2
     order by t.last_message_at desc`,
    [userId, archived],
  );
  return rows.map((row) => ({
    id: row.id,
    company: row.company,
    contactName: row.contact_name,
    trustLabel: trustLabel(row.trust),
    emailMasked: maskEmail(row.email),
    lastBody: row.last_body ?? "",
    lastAt: iso(row.last_message_at),
    unread: row.unread_count,
    dealStatus: row.deal_status,
    archived: row.archived,
  }));
}

type ThreadMeta = {
  id: string;
  userId: string;
  brandId: string;
  company: string;
  contactName: string;
  email: string;
  trust: string;
  archived: boolean;
  messageVersion: string;
  influencerName: string;
  username: string;
};

async function threadMeta(threadId: string): Promise<ThreadMeta | null> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    user_id: string;
    brand_id: string;
    company: string;
    contact_name: string;
    email: string;
    trust: string;
    archived: boolean;
    message_version: string;
    display_name: string | null;
    username: string | null;
    ig_name: string | null;
    ig_username: string;
  }>(
    `select t.id, t.user_id, t.brand_id, t.archived, t.last_message_at::text as message_version,
      coalesce(nullif(t.company_name, ''), b.company) as company, b.contact_name, b.email, b.trust,
      case when p.is_public then p.display_name end as display_name,
      case when p.is_public then p.username end as username,
      u.name as ig_name, u.username as ig_username
     from hypeup_thread t
     join hypeup_brand b on b.id = t.brand_id
     join hypeup_user u on u.id = t.user_id
     left join hypeup_page p on p.user_id = t.user_id
     where t.id = $1`,
    [threadId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    brandId: row.brand_id,
    company: row.company,
    contactName: row.contact_name,
    email: row.email,
    trust: row.trust,
    archived: row.archived,
    messageVersion: row.message_version,
    influencerName: row.display_name || row.ig_name || row.ig_username,
    username: row.username || "",
  };
}

function mapTerms(value: unknown): Terms | null {
  const row = asObject(value);
  if (!row || row.version !== 1) return null;
  return row as unknown as Terms;
}

async function loadDeals(threadId: string): Promise<LensDeal[]> {
  const sql = await getSql();
  const deals = await sql.query<{
    id: string;
    status: DealStatus;
    title: string;
    terms: unknown;
    proposed_by: Party;
    post_url: string | null;
    posted_on: unknown;
    post_note: string | null;
    agreed_at: unknown;
    cancel_requested_by: Party | null;
    brand_contract_cipher: string | null;
    contract_parties: LensDeal["contractParties"] | null;
  }>(
    `select id, status, title, terms, proposed_by, post_url, posted_on, post_note, agreed_at, cancel_requested_by,
       case when agreed_at is not null then brand_contract_cipher end as brand_contract_cipher, contract_parties
     from hypeup_deal where thread_id = $1 order by created_at asc`,
    [threadId],
  );
  if (!deals.length) return [];
  const settlements = await sql.query<{
    id: string;
    deal_id: string;
    status: string;
    amount_krw: number;
    due_on: unknown;
    note: string | null;
    period_label: string | null;
    claimed_sales_krw: number | null;
    claimed_conversions: number | null;
    created_at: unknown;
  }>(
    `select id, deal_id, status, amount_krw, due_on, note, period_label, claimed_sales_krw, claimed_conversions, created_at
     from hypeup_settlement where deal_id = any($1::text[]) order by created_at asc`,
    [deals.map((deal) => deal.id)],
  );
  return deals.flatMap((deal) => {
    const terms = mapTerms(deal.terms);
    if (!terms) return [];
    const rows: LensSettlement[] = settlements
      .filter((row) => row.deal_id === deal.id)
      .map((row) => ({
        id: row.id,
        status: row.status,
        amountKrw: row.amount_krw,
        dueOn: day(row.due_on),
        note: row.note,
        periodLabel: row.period_label,
        claimedSalesKrw: row.claimed_sales_krw,
        claimedConversions: row.claimed_conversions,
        createdAt: iso(row.created_at),
      }));
    return [
      {
        id: deal.id,
        status: deal.status,
        title: deal.title,
        terms,
        proposedBy: deal.proposed_by,
        postUrl: deal.post_url,
        postedOn: day(deal.posted_on),
        postNote: deal.post_note,
        agreedAt: iso(deal.agreed_at) || null,
        cancelRequestedBy: deal.cancel_requested_by,
        settlements: rows,
        ...(deal.brand_contract_cipher ? { brandContract: unpackBrandContract(deal.brand_contract_cipher) } : {}),
        ...(deal.contract_parties ? { contractParties: deal.contract_parties } : {}),
      },
    ];
  });
}

async function loadMessages(threadId: string): Promise<LensMessage[]> {
  const sql = await getSql();
  const rows = await sql.query<{
    id: string;
    sender: LensMessage["sender"];
    body: string;
    kind: LensMessage["kind"];
    payload: unknown;
    created_at: unknown;
  }>(
    `select id, sender, body, kind, payload, created_at from hypeup_message where thread_id = $1 order by created_at asc`,
    [threadId],
  );
  return rows.map((row) => {
    const payload = asObject(row.payload);
    return {
      id: row.id,
      sender: row.sender,
      body: row.body,
      kind: row.kind,
      terms: payload ? mapTerms(payload.terms) : null,
      createdAt: iso(row.created_at),
    };
  });
}

export type ThreadDesk = {
  id: string;
  company: string;
  contactName: string;
  trustLabel: string;
  emailMasked: string;
  archived: boolean;
  messageVersion: string;
  influencerName: string;
  username: string;
  messages: LensMessage[];
  deals: LensDeal[];
  rateCardState: "locked" | "visible";
  rates: RateTemplate[];
};

async function loadDeskRates(meta: ThreadMeta, role: Party): Promise<Pick<ThreadDesk, "rateCardState" | "rates">> {
  if (role === "influencer") return { rateCardState: "visible", rates: await listRates(meta.userId) };
  const sql = await getSql();
  const [result] = await sql.query<{ unlocked: boolean }>(
    `select exists (
       select 1 from hypeup_message reply
       where reply.thread_id = $1 and reply.sender = 'influencer' and reply.kind = 'text'
         and reply.body ~ '[^[:space:]]' and reply.created_at > (
           select min(first_contact.created_at) from hypeup_message first_contact
           where first_contact.thread_id = $1 and first_contact.sender = 'brand' and first_contact.kind = 'text'
             and first_contact.body ~ '[^[:space:]]'
         )
     ) as unlocked`,
    [meta.id],
  );
  if (!result?.unlocked) return { rateCardState: "locked", rates: [] };
  return { rateCardState: "visible", rates: await listRates(meta.userId, true) };
}

async function deskFor(meta: ThreadMeta, role: Party): Promise<ThreadDesk> {
  const [messages, deals, rateCard] = await Promise.all([
    loadMessages(meta.id),
    loadDeals(meta.id),
    loadDeskRates(meta, role),
  ]);
  return {
    id: meta.id,
    company: meta.company,
    contactName: meta.contactName,
    trustLabel: trustLabel(meta.trust),
    emailMasked: maskEmail(meta.email),
    archived: meta.archived,
    messageVersion: meta.messageVersion,
    influencerName: meta.influencerName,
    username: meta.username,
    messages,
    deals,
    ...rateCard,
  };
}

export async function getInfluencerThread(
  userId: string,
  threadId: string,
  knownVersion?: string,
): Promise<ThreadDesk | null> {
  const meta = await threadMeta(threadId);
  if (!meta || meta.userId !== userId || meta.messageVersion === knownVersion) return null;
  const sql = await getSql();
  await sql.query("update hypeup_thread set unread_count = 0 where id = $1 and unread_count > 0", [threadId]);
  return deskFor(meta, "influencer");
}

export async function getBrandThread(username: string, brandId: string): Promise<ThreadDesk | null> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `select t.id
     from hypeup_thread t
     join hypeup_page p on p.user_id = t.user_id
     where p.username = $1 and p.is_public = true and t.brand_id = $2`,
    [username, brandId],
  );
  return rows[0] ? getBrandThreadById(brandId, rows[0].id) : null;
}

export async function getBrandThreadById(
  brandId: string,
  threadId: string,
  knownVersion?: string,
): Promise<ThreadDesk | null> {
  const meta = await threadMeta(threadId);
  if (!meta || meta.brandId !== brandId || meta.messageVersion === knownVersion) return null;
  return deskFor(meta, "brand");
}

export async function archiveThread(userId: string, threadId: string, archived: boolean): Promise<Err | { ok: true }> {
  const sql = await getSql();
  const rows = await sql.query("update hypeup_thread set archived = $3 where id = $1 and user_id = $2 returning id", [
    threadId,
    userId,
    archived,
  ]);
  if (!rows.length) return { ok: false, error: "문의를 찾지 못했습니다." };
  return { ok: true };
}

async function addMessage(
  threadId: string,
  sender: LensMessage["sender"],
  body: string,
  kind: LensMessage["kind"],
  payload: unknown,
): Promise<Err | { ok: true }> {
  const sql = await getSql();
  if (sender !== "system") {
    const recent = await sql.query<{ n: number }>(
      `select count(*)::int as n from hypeup_message
       where thread_id = $1 and sender = $2 and created_at > now() - interval '1 minute'`,
      [threadId, sender],
    );
    if ((recent[0]?.n ?? 0) >= 30) return { ok: false, error: "잠시 후 다시 시도해 주세요." };
  }
  await sql.query(
    `insert into hypeup_message (id, thread_id, sender, body, kind, payload) values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [newId(), threadId, sender, body, kind, payload == null ? null : JSON.stringify(payload)],
  );
  const unread = sender === "influencer" ? 0 : 1;
  await sql.query(
    "update hypeup_thread set last_message_at = now(), unread_count = unread_count + $2 where id = $1",
    [threadId, unread],
  );
  return { ok: true };
}

export async function sendText(input: {
  threadId: string;
  userId?: string;
  brandId?: string;
  body: string;
}): Promise<Err | Ok<{ desk: ThreadDesk }>> {
  const meta = await threadMeta(input.threadId);
  if (!meta) return { ok: false, error: "문의를 찾지 못했습니다." };
  const sender: Party | null =
    input.userId && meta.userId === input.userId ? "influencer" : input.brandId && meta.brandId === input.brandId ? "brand" : null;
  if (!sender) return { ok: false, error: "이 대화에 글을 남길 수 없습니다." };
  const saved = await addMessage(meta.id, sender, input.body.trim(), "text", null);
  if (!saved.ok) return saved;
  return finish(meta, sender);
}

export async function openInquiry(input: {
  username: string;
  brandId: string;
  contactName: string;
  company: string;
}): Promise<Err | Ok<{ desk: ThreadDesk }>> {
  const sql = await getSql();
  const [created] = await sql.query<{ thread_id: string }>(
    `with creator as (
       select user_id from hypeup_page where username = $1 and is_public
     ), updated_brand as (
       update hypeup_brand set contact_name = $3, company = $4
       where id = $2 and exists (select 1 from creator)
       returning id
     ), new_thread as (
       insert into hypeup_thread (id, user_id, brand_id, company_name, unread_count)
       select $5, creator.user_id, updated_brand.id, $4, 1 from creator cross join updated_brand
       on conflict (user_id, brand_id) do nothing returning id
     )
     insert into hypeup_message (id, thread_id, sender, body, kind)
     select $6, id, 'system', $7, 'system' from new_thread returning thread_id`,
    [input.username, input.brandId, input.contactName, input.company, newId(), newId(), systemSentences.opened(input.company)],
  );
  const desk = created
    ? await getBrandThreadById(input.brandId, created.thread_id)
    : await getBrandThread(input.username, input.brandId);
  return desk ? { ok: true, desk } : { ok: false, error: "공개 페이지를 찾지 못했습니다." };
}

export async function applyDealAction(input: {
  threadId: string;
  actor: { role: Party; name: string; userId?: string; brandId?: string };
  action: DealActionType;
  dealId?: string;
  terms?: Terms;
  url?: string;
  postedOn?: string;
  note?: string;
  amountKrw?: number;
  dueOn?: string;
  period?: string;
  salesKrw?: number | null;
  conversions?: number | null;
}): Promise<Err | Ok<{ desk: ThreadDesk }>> {
  const meta = await threadMeta(input.threadId);
  if (!meta) return { ok: false, error: "문의를 찾지 못했습니다." };
  const allowed =
    (input.actor.role === "influencer" && input.actor.userId === meta.userId) ||
    (input.actor.role === "brand" && input.actor.brandId === meta.brandId);
  if (!allowed) return { ok: false, error: "이 대화에서 처리할 수 없습니다." };
  const actorName = input.actor.role === "brand" ? meta.company : meta.influencerName;
  const deals = await loadDeals(meta.id);
  if (input.action === "propose") {
    if (!input.terms) return { ok: false, error: "조건이 없습니다." };
    if (!canPropose(deals)) return { ok: false, error: "진행 중인 건이 끝난 뒤에 새 조건을 제안할 수 있습니다." };
    const blocked = transitionError(null, "propose", input.actor.role);
    if (blocked) return { ok: false, error: blocked };
    const sql = await getSql();
    const dealId = newId();
    const agreedColumn = input.actor.role === "influencer" ? "influencer_agreed_at" : "brand_agreed_at";
    await sql.query(
      `insert into hypeup_deal (id, thread_id, user_id, status, title, terms, proposed_by, ${agreedColumn}, brand_contract_cipher)
       values ($1,$2,$3,'draft',$4,$5::jsonb,$6, now(),
         (select contract_cipher from hypeup_brand_account where brand_id = $7))`,
      [dealId, meta.id, meta.userId, input.terms.title, JSON.stringify(input.terms), input.actor.role,
        input.actor.role === "brand" ? meta.brandId : null],
    );
    const noted = await addMessage(meta.id, input.actor.role, systemSentences.proposed(actorName), "terms", {
      terms: input.terms,
      dealId,
    });
    if (!noted.ok) return noted;
    return finish(meta, input.actor.role);
  }

  const deal = deals.find((item) => item.id === input.dealId) ?? null;
  const blocked = transitionError(
    deal
      ? { status: deal.status, proposedBy: deal.proposedBy, cancelRequestedBy: deal.cancelRequestedBy }
      : null,
    input.action,
    input.actor.role,
  );
  if (blocked || !deal) return { ok: false, error: blocked ?? "건을 찾지 못했습니다." };
  const sql = await getSql();

  if (input.action === "agree") {
    const column = input.actor.role === "influencer" ? "influencer_agreed_at" : "brand_agreed_at";
    const rows = await sql.query(
      `update hypeup_deal set ${column} = now(), status = 'agreed', agreed_at = now(),
       brand_contract_cipher = coalesce(brand_contract_cipher,
         (select contract_cipher from hypeup_brand_account where brand_id = $2)),
       contract_parties = $3::jsonb
       where id = $1 and status = 'draft' returning id`,
      [deal.id, input.actor.role === "brand" ? meta.brandId : null,
        JSON.stringify({ creatorName: meta.influencerName, company: meta.company, contactName: meta.contactName })],
    );
    if (!rows.length) return { ok: false, error: "이 조건은 지금 확정할 수 없습니다." };
    const noted = await addMessage(meta.id, "system", systemSentences.agreed(), "system", { dealId: deal.id });
    if (!noted.ok) return noted;
  } else if (input.action === "reject" || input.action === "withdraw") {
    const rows = await sql.query(
      "update hypeup_deal set status = 'cancelled' where id = $1 and status = 'draft' returning id",
      [deal.id],
    );
    if (!rows.length) return { ok: false, error: "제안을 바꾸지 못했습니다." };
    const sentence =
      input.action === "reject" ? systemSentences.rejected(actorName) : systemSentences.withdrawn(actorName);
    const noted = await addMessage(meta.id, "system", sentence, "system", { dealId: deal.id });
    if (!noted.ok) return noted;
  } else if (input.action === "post") {
    const rows = await sql.query(
      `update hypeup_deal set status = 'posted', post_url = $2, posted_on = $3::date, post_note = $4
       where id = $1 and status = 'agreed' returning id`,
      [deal.id, input.url, input.postedOn, input.note || null],
    );
    if (!rows.length) return { ok: false, error: "게시 링크를 등록하지 못했습니다." };
    const noted = await addMessage(meta.id, "system", systemSentences.posted(), "system", { dealId: deal.id, url: input.url });
    if (!noted.ok) return noted;
  } else if (input.action === "settle") {
    if (deal.status === "disputed") {
      await sql.query("update hypeup_settlement set status = 'superseded' where deal_id = $1 and status = 'disputed'", [
        deal.id,
      ]);
    }
    await sql.query(
      `insert into hypeup_settlement (
        id, deal_id, status, amount_krw, due_on, note, period_label, claimed_sales_krw, claimed_conversions
      ) values ($1,$2,'requested',$3,$4::date,$5,$6,$7,$8)`,
      [
        newId(),
        deal.id,
        input.amountKrw,
        input.dueOn,
        input.note || null,
        input.period || null,
        input.salesKrw ?? null,
        input.conversions ?? null,
      ],
    );
    const rows = await sql.query(
      `update hypeup_deal set status = 'settlement_requested' where id = $1 and status in ('posted', 'disputed') returning id`,
      [deal.id],
    );
    if (!rows.length) return { ok: false, error: "정산 요청을 남기지 못했습니다." };
    const noted = await addMessage(
      meta.id,
      "system",
      systemSentences.settlement(
        priceLabel({ model: "fixed", amountKrw: input.amountKrw ?? 0, rateBps: null }),
        input.dueOn ? formatDay(input.dueOn) : "",
      ),
      "system",
      { dealId: deal.id },
    );
    if (!noted.ok) return noted;
  } else if (input.action === "paid") {
    await sql.query(
      `update hypeup_settlement set status = 'paid'
       where deal_id = $1 and status in ('requested', 'acknowledged', 'disputed')`,
      [deal.id],
    );
    const rows = await sql.query(
      `update hypeup_deal set status = 'settled' where id = $1 and status in ('settlement_requested', 'disputed') returning id`,
      [deal.id],
    );
    if (!rows.length) return { ok: false, error: "지급 표시를 남기지 못했습니다." };
    const noted = await addMessage(meta.id, "system", systemSentences.paid(meta.company), "system", { dealId: deal.id });
    if (!noted.ok) return noted;
  } else if (input.action === "dispute") {
    await sql.query(
      "update hypeup_settlement set status = 'disputed' where deal_id = $1 and status in ('requested', 'acknowledged')",
      [deal.id],
    );
    const rows = await sql.query(
      "update hypeup_deal set status = 'disputed' where id = $1 and status = 'settlement_requested' returning id",
      [deal.id],
    );
    if (!rows.length) return { ok: false, error: "이견을 남기지 못했습니다." };
    const noted = await addMessage(meta.id, "system", systemSentences.disputed(actorName), "system", {
      dealId: deal.id,
      note: input.note || "",
    });
    if (!noted.ok) return noted;
  } else if (input.action === "cancel" || input.action === "confirm_cancel") {
    const confirming = input.action === "confirm_cancel";
    const otherParty = input.actor.role === "brand" ? "influencer" : "brand";
    const requester = confirming ? otherParty : input.actor.role;
    const sentence = confirming ? systemSentences.cancelled() : `${actorName}님이 게시 전 취소를 요청했습니다.`;
    const rows = await sql.query(
      `with changed_deal as (
         update hypeup_deal
         set ${confirming ? "status = 'cancelled'" : "cancel_requested_by = $3"}
         where id = $1 and thread_id = $2 and status = 'agreed'
           and ${confirming ? "cancel_requested_by = $3" : "cancel_requested_by is null"}
         returning id, thread_id
       ), recorded_message as (
         insert into hypeup_message (id, thread_id, sender, body, kind, payload)
         select $4, thread_id, 'system', $5, 'system', jsonb_build_object('dealId', id)
         from changed_deal returning thread_id
       )
       update hypeup_thread t
       set last_message_at = clock_timestamp(), unread_count = unread_count + 1
       from recorded_message m where t.id = m.thread_id returning t.id`,
      [deal.id, meta.id, requester, newId(), sentence],
    );
    if (!rows.length) {
      return { ok: false, error: confirming ? "취소하지 못했습니다." : "취소를 요청하지 못했습니다." };
    }
  }
  return finish(meta, input.actor.role);
}

async function finish(meta: ThreadMeta, role: Party): Promise<Ok<{ desk: ThreadDesk }>> {
  return { ok: true, desk: await deskFor(meta, role) };
}

export async function recordSource(access: { userId?: string; brandId?: string }, dealId: string): Promise<
  | Err
  | Ok<{
      meta: ThreadMeta;
      deal: LensDeal;
      messages: LensMessage[];
    }>
> {
  const sql = await getSql();
  const rows = await sql.query<{ thread_id: string }>(
    `select d.thread_id from hypeup_deal d join hypeup_thread t on t.id = d.thread_id
     where d.id = $1 and (d.user_id = $2 or t.brand_id = $3)`,
    [dealId, access.userId ?? null, access.brandId ?? null],
  );
  const threadId = rows[0]?.thread_id;
  if (!threadId) return { ok: false, error: "건을 찾지 못했습니다." };
  const meta = await threadMeta(threadId);
  if (!meta || (meta.userId !== access.userId && meta.brandId !== access.brandId)) {
    return { ok: false, error: "건을 찾지 못했습니다." };
  }
  const deal = (await loadDeals(threadId)).find((item) => item.id === dealId);
  if (!deal) return { ok: false, error: "건을 찾지 못했습니다." };
  return { ok: true, meta, deal, messages: await loadMessages(threadId) };
}

export async function saveRecord(dealId: string, hash: string, body: unknown): Promise<void> {
  const sql = await getSql();
  await sql.query("insert into hypeup_record (id, deal_id, hash, body) values ($1,$2,$3,$4::jsonb)", [
    newId(),
    dealId,
    hash,
    JSON.stringify(body),
  ]);
}

