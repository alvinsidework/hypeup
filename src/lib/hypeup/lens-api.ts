import { createHash } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { AuthRequiredError, requireUser } from "./actions.server";
import { isSecureCookie } from "./env.server";
import {
  applyDealAction,
  archiveThread,
  deleteRate,
  deleteWork,
  getBrandThread,
  getInfluencerThread,
  getPage,
  getPublicPage,
  listInquiries,
  listRates,
  listWorks,
  moveRate,
  moveWork,
  openInquiry,
  recordSource,
  savePage,
  savePrivate,
  saveRate,
  saveRecord,
  saveWork,
  sendText,
  type PageDraft,
} from "./lens-repo";
import {
  CATEGORIES,
  CHANNELS,
  FORMATS,
  MODELS,
  buildDealRecord,
  canonicalJson,
  isHttpUrl,
  maskEmail,
  parseTerms,
  suggestUsername,
  trustForEmail,
  trustLabel,
  validateUsername,
  type TermsInput,
} from "./lens-rules";
import { sessionSecretKey } from "./session.server";

const BRAND_COOKIE = "lens_brand";
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

async function signedIn() {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof AuthRequiredError) return null;
    throw error;
  }
}

async function brandIdFromCookie(): Promise<string | null> {
  const token = getCookie(BRAND_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey());
    return typeof payload.brandId === "string" ? payload.brandId : null;
  } catch {
    return null;
  }
}

async function rememberBrand(brandId: string): Promise<void> {
  const token = await new SignJWT({ brandId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionSecretKey());
  const request = getRequest();
  setCookie(BRAND_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: request ? isSecureCookie(request) : false,
    maxAge: 60 * 60 * 24 * 30,
  });
}

function cleanHandle(value: string): string {
  return value.trim().replace(/^@+/, "").slice(0, 30);
}

function followers(value: number | null): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 0 || value > 1_000_000_000) return null;
  return value;
}

function blankPage(name: string, handle: string, count: number | null): PageDraft {
  return {
    username: "",
    displayName: name,
    bio: "",
    categories: [],
    instagramHandle: cleanHandle(handle),
    instagramFollowers: count,
    tiktokHandle: "",
    tiktokFollowers: null,
    youtubeHandle: "",
    youtubeFollowers: null,
    links: [],
    isPublic: false,
    notifyEmail: true,
    payoutLabel: null,
  };
}

export const getLensDesk = createServerFn({ method: "GET" }).handler(async () => {
  const user = await requireUser();
  const page = (await getPage(user.id)) ?? blankPage(user.name ?? "", user.username, user.followersCount);
  return {
    page,
    rates: await listRates(user.id),
    works: await listWorks(user.id),
    suggestion: suggestUsername(user.username),
  };
});

const linkSchema = z.object({ label: z.string().max(40), url: z.string().max(400) });

export const saveLensPage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().max(24),
      displayName: z.string().max(40),
      bio: z.string().max(80),
      categories: z.array(z.string()).max(3),
      instagramHandle: z.string().max(40),
      instagramFollowers: z.number().int().nullable(),
      tiktokHandle: z.string().max(40),
      tiktokFollowers: z.number().int().nullable(),
      youtubeHandle: z.string().max(40),
      youtubeFollowers: z.number().int().nullable(),
      links: z.array(linkSchema).max(5),
      isPublic: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await signedIn();
    if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
    const displayName = data.displayName.trim();
    if (displayName.length < 1) return { ok: false as const, error: "이름을 입력해 주세요." };
    const categories = data.categories.filter((item) => (CATEGORIES as readonly string[]).includes(item)).slice(0, 3);
    const links = [];
    for (const link of data.links) {
      const label = link.label.trim();
      const url = link.url.trim();
      if (!label && !url) continue;
      if (!label || label.length > 40) return { ok: false as const, error: "링크 이름을 입력해 주세요." };
      if (!isHttpUrl(url)) return { ok: false as const, error: "링크는 http 또는 https 주소여야 합니다." };
      links.push({ label, url });
    }
    let username = "";
    if (data.username.trim()) {
      const parsed = validateUsername(data.username);
      if (!parsed.ok) return { ok: false as const, error: parsed.error };
      username = parsed.username;
    }
    if (data.isPublic && !username) return { ok: false as const, error: "공개하려면 주소가 필요합니다." };
    return savePage(user.id, {
      username,
      displayName,
      bio: data.bio.trim(),
      categories,
      instagramHandle: cleanHandle(data.instagramHandle),
      instagramFollowers: followers(data.instagramFollowers),
      tiktokHandle: cleanHandle(data.tiktokHandle),
      tiktokFollowers: followers(data.tiktokFollowers),
      youtubeHandle: cleanHandle(data.youtubeHandle),
      youtubeFollowers: followers(data.youtubeFollowers),
      links,
      isPublic: data.isPublic,
    });
  });

const rateSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(40),
  format: z.enum(FORMATS),
  model: z.enum(MODELS),
  amountKrw: z.number().int().nullable().optional(),
  ratePercent: z.number().nullable().optional(),
  deliverableCount: z.number().int().optional(),
  description: z.string().max(280).optional(),
  revisions: z.number().int().optional(),
  turnaroundDays: z.number().int().optional(),
  usageDays: z.number().int().optional(),
  paidAds: z.boolean().optional(),
  rawFiles: z.boolean().optional(),
  exclusivityEnabled: z.boolean().optional(),
  exclusivityDays: z.number().int().optional(),
  exclusivityCategory: z.string().max(40).nullable().optional(),
  priceHidden: z.boolean(),
  isPublic: z.boolean(),
});

function termsInput(data: z.infer<typeof rateSchema>): TermsInput {
  return {
    title: data.title,
    format: data.format,
    model: data.model,
    amountKrw: data.amountKrw,
    ratePercent: data.ratePercent,
    deliverableCount: data.deliverableCount,
    description: data.description,
    revisions: data.revisions,
    turnaroundDays: data.turnaroundDays,
    usageDays: data.usageDays,
    paidAds: data.paidAds,
    rawFiles: data.rawFiles,
    exclusivityEnabled: data.exclusivityEnabled,
    exclusivityDays: data.exclusivityDays,
    exclusivityCategory: data.exclusivityCategory,
  };
}

export const saveLensRate = createServerFn({ method: "POST" })
  .validator(rateSchema)
  .handler(async ({ data }) => {
    const user = await signedIn();
    if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
    if (data.title.trim().length > 40) return { ok: false as const, error: "단가 제목은 40자까지입니다." };
    const parsed = parseTerms(termsInput(data));
    if (!parsed.ok) return parsed;
    return saveRate(user.id, {
      id: data.id,
      title: parsed.terms.title,
      format: parsed.terms.format,
      model: parsed.terms.deal_type,
      amountKrw: parsed.terms.pricing.fixed_amount_krw,
      rateBps: parsed.terms.pricing.performance_rate_bps,
      priceHidden: data.priceHidden,
      deliverableCount: parsed.terms.deliverables.count,
      description: parsed.terms.deliverables.description,
      revisions: parsed.terms.revisions,
      turnaroundDays: parsed.terms.turnaround_days,
      usageDays: parsed.terms.usage_rights_days,
      paidAds: parsed.terms.paid_ads_allowed,
      rawFiles: parsed.terms.raw_files_included,
      exclusivityDays: parsed.terms.exclusivity.days,
      exclusivityCategory: parsed.terms.exclusivity.category,
      isPublic: data.isPublic,
    });
  });

export const deleteLensRate = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return { rates: await deleteRate(user.id, data.id) };
  });

export const moveLensRate = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), direction: z.enum(["up", "down"]) }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return { rates: await moveRate(user.id, data.id, data.direction) };
  });

const workSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(80),
  brandName: z.string().max(60),
  channel: z.enum(CHANNELS),
  format: z.enum(FORMATS),
  postUrl: z.string().max(400),
  coverUrl: z.string().max(400),
  postedMonth: z.string().max(7),
  highlightLabel: z.string().max(20),
  highlightValue: z.string().max(20),
  stats: z.array(z.object({ label: z.string().max(20), value: z.string().max(20) })).max(4),
  isPublic: z.boolean(),
});

export const saveLensWork = createServerFn({ method: "POST" })
  .validator(workSchema)
  .handler(async ({ data }) => {
    const user = await signedIn();
    if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
    const title = data.title.trim();
    if (!title) return { ok: false as const, error: "제목을 입력해 주세요." };
    if (!isHttpUrl(data.coverUrl)) return { ok: false as const, error: "커버 이미지 주소가 필요합니다." };
    if (data.postUrl.trim() && !isHttpUrl(data.postUrl.trim())) {
      return { ok: false as const, error: "게시 주소는 http 또는 https 여야 합니다." };
    }
    if (data.postedMonth && !MONTH.test(data.postedMonth)) {
      return { ok: false as const, error: "게시월은 YYYY-MM 입니다." };
    }
    const stats = data.stats
      .map((stat) => ({ label: stat.label.trim(), value: stat.value.trim() }))
      .filter((stat) => stat.label && stat.value);
    return saveWork(user.id, { ...data, title, postUrl: data.postUrl.trim(), coverUrl: data.coverUrl.trim(), stats });
  });

export const deleteLensWork = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return { works: await deleteWork(user.id, data.id) };
  });

export const moveLensWork = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), direction: z.enum(["up", "down"]) }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return { works: await moveWork(user.id, data.id, data.direction) };
  });

export const saveLensPrivate = createServerFn({ method: "POST" })
  .validator(
    z.object({
      notifyEmail: z.boolean(),
      bankName: z.string().max(40).optional(),
      accountNumber: z.string().max(30).optional(),
      accountHolder: z.string().max(40).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await signedIn();
    if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
    return savePrivate(user.id, data);
  });

export const getLensInquiries = createServerFn({ method: "POST" })
  .validator(z.object({ archived: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const page = await getPage(user.id);
    return {
      items: await listInquiries(user.id, data.archived),
      publicPath: page?.isPublic && page.username ? `/${page.username}` : "",
    };
  });

export const getLensThread = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    return getInfluencerThread(user.id, data.id);
  });

export const setLensArchive = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string(), archived: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await signedIn();
    if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
    return archiveThread(user.id, data.id, data.archived);
  });

export const getLensPublic = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().max(24) }))
  .handler(async ({ data }) => {
    const parsed = validateUsername(data.username);
    if (!parsed.ok) return { ready: false as const };
    const page = await getPublicPage(parsed.username);
    if (!page) return { ready: false as const };
    return { ready: true as const, page };
  });

export const getLensInquiry = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().max(24) }))
  .handler(async ({ data }) => {
    const parsed = validateUsername(data.username);
    if (!parsed.ok) return { ready: false as const, desk: null };
    const page = await getPublicPage(parsed.username);
    if (!page) return { ready: false as const, desk: null };
    const brandId = await brandIdFromCookie();
    const desk = brandId ? await getBrandThread(parsed.username, brandId) : null;
    return { ready: true as const, name: page.displayName, username: page.username, desk };
  });

export const openLensInquiry = createServerFn({ method: "POST" })
  .validator(
    z.object({
      username: z.string().max(24),
      contactName: z.string().max(40),
      company: z.string().max(60),
      email: z.string().max(120),
      instagramHandle: z.string().max(40).optional(),
      bizNo: z.string().max(12).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const parsedName = validateUsername(data.username);
    if (!parsedName.ok) return { ok: false as const, error: "페이지를 준비 중이에요." };
    const contactName = data.contactName.trim();
    const company = data.company.trim();
    const email = data.email.trim().toLowerCase();
    if (contactName.length < 1 || contactName.length > 40) return { ok: false as const, error: "담당자 이름은 1~40자입니다." };
    if (company.length < 1 || company.length > 60) return { ok: false as const, error: "브랜드명은 1~60자입니다." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "메일 형식을 확인해 주세요." };
    const biz = (data.bizNo ?? "").replace(/\D/g, "");
    if (biz && biz.length !== 10) return { ok: false as const, error: "사업자등록번호는 숫자 10자리입니다." };
    let opened;
    try {
      opened = await openInquiry({
        username: parsedName.username,
        email,
        contactName,
        company,
        instagramHandle: cleanHandle(data.instagramHandle ?? "") || null,
        bizNo: biz || null,
        trust: trustForEmail(email),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_SECRET is not set") {
        return { ok: false as const, error: "문의 세션을 만들 서버 키가 없습니다." };
      }
      throw error;
    }
    if (!opened.ok) return opened;
    try {
      await rememberBrand(opened.brandId);
    } catch {
      return { ok: false as const, error: "문의 세션을 만들 서버 키가 없습니다." };
    }
    return { ok: true as const, desk: opened.desk };
  });

export const sendLensMessage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      role: z.enum(["influencer", "brand"]),
      threadId: z.string(),
      body: z.string().max(2000),
    }),
  )
  .handler(async ({ data }) => {
    const body = data.body.trim();
    if (!body) return { ok: false as const, error: "메시지를 입력해 주세요." };
    if (data.role === "influencer") {
      const user = await signedIn();
      if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
      return sendText({ threadId: data.threadId, userId: user.id, body });
    }
    const brandId = await brandIdFromCookie();
    if (!brandId) return { ok: false as const, error: "문의 정보가 만료되었습니다. 다시 입력해 주세요." };
    return sendText({ threadId: data.threadId, brandId, body });
  });

export const actOnLensDeal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      role: z.enum(["influencer", "brand"]),
      threadId: z.string(),
      action: z.enum(["propose", "agree", "reject", "withdraw", "post", "settle", "paid", "dispute", "cancel", "confirm_cancel"]),
      dealId: z.string().optional(),
      terms: z.unknown().optional(),
      url: z.string().max(500).optional(),
      postedOn: z.string().max(10).optional(),
      note: z.string().max(500).optional(),
      amountKrw: z.number().int().optional(),
      dueOn: z.string().max(10).optional(),
      period: z.string().max(80).optional(),
      salesKrw: z.number().int().nullable().optional(),
      conversions: z.number().int().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = data.role === "influencer" ? await signedIn() : null;
    const brandId = data.role === "brand" ? await brandIdFromCookie() : null;
    if (data.role === "influencer" && !actor) return { ok: false as const, error: "로그인이 필요합니다." };
    if (data.role === "brand" && !brandId) return { ok: false as const, error: "문의 정보가 만료되었습니다. 다시 입력해 주세요." };
    let terms;
    if (data.action === "propose") {
      const parsed = parseTerms((data.terms ?? {}) as TermsInput);
      if (!parsed.ok) return parsed;
      terms = parsed.terms;
    }
    if (data.action === "post") {
      const url = data.url?.trim() ?? "";
      if (!isHttpUrl(url)) return { ok: false as const, error: "게시 링크는 http 또는 https 주소여야 합니다." };
      if (!data.postedOn || !DAY.test(data.postedOn)) return { ok: false as const, error: "게시일을 선택해 주세요." };
      if ((data.note ?? "").length > 280) return { ok: false as const, error: "메모는 280자까지입니다." };
    }
    if (data.action === "settle") {
      if (!data.amountKrw || data.amountKrw < 1) return { ok: false as const, error: "금액은 1원 이상입니다." };
      if (!data.dueOn || !DAY.test(data.dueOn)) return { ok: false as const, error: "지급 희망일을 선택해 주세요." };
    }
    return applyDealAction({
      threadId: data.threadId,
      actor: {
        role: data.role,
        name: "",
        userId: actor?.id,
        brandId: brandId ?? undefined,
      },
      action: data.action,
      dealId: data.dealId,
      terms,
      url: data.url?.trim(),
      postedOn: data.postedOn,
      note: data.note?.trim(),
      amountKrw: data.amountKrw,
      dueOn: data.dueOn,
      period: data.period?.trim(),
      salesKrw: data.salesKrw,
      conversions: data.conversions,
    });
  });

export const exportLensRecord = createServerFn({ method: "POST" })
  .validator(z.object({ dealId: z.string(), save: z.boolean().optional() }))
  .handler(async ({ data }) => {
    const user = await signedIn();
    if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
    const source = await recordSource(user.id, data.dealId);
    if (!source.ok) return source;
    const body = buildDealRecord({
      influencerName: source.meta.influencerName,
      username: source.meta.username,
      company: source.meta.company,
      contactName: source.meta.contactName,
      emailMasked: maskEmail(source.meta.email),
      trustLabel: trustLabel(source.meta.trust),
      deal: source.deal,
      messages: source.messages.map((message) => ({
        sender: message.sender,
        body: message.body,
        createdAt: message.createdAt,
      })),
    });
    const hash = createHash("sha256").update(canonicalJson(body)).digest("hex");
    if (data.save) await saveRecord(data.dealId, hash, body);
    return { ok: true as const, body, hash };
  });
