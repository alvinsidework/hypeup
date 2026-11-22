export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])$/;

export const RESERVED_USERNAMES = new Set([
  "app",
  "admin",
  "api",
  "auth",
  "automations",
  "brand",
  "c",
  "connect",
  "data-deletion",
  "deals",
  "i",
  "inbox",
  "inquiries",
  "inquiry",
  "lens",
  "login",
  "logs",
  "overview",
  "page",
  "portfolio",
  "posts",
  "privacy",
  "rates",
  "settings",
  "terms",
  "u",
  "www",
]);

export const FORMATS = ["reel", "feed", "story", "tiktok", "youtube", "live"] as const;
export type DealFormat = (typeof FORMATS)[number];
export const MODELS = ["fixed", "performance", "hybrid"] as const;
export type DealModel = (typeof MODELS)[number];
export const CHANNELS = ["instagram", "tiktok", "youtube"] as const;
export type WorkChannel = (typeof CHANNELS)[number];

export const CATEGORIES = ["패션", "뷰티", "리빙", "푸드", "육아", "여행", "피트니스", "테크", "기타"] as const;

const FREE_MAIL = new Set([
  "gmail.com",
  "googlemail.com",
  "naver.com",
  "daum.net",
  "hanmail.net",
  "kakao.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "yahoo.co.kr",
  "nate.com",
]);

export const FORMAT_LABEL: Record<DealFormat, string> = {
  reel: "릴스",
  feed: "피드",
  story: "스토리",
  tiktok: "틱톡",
  youtube: "유튜브",
  live: "라이브",
};

export const CHANNEL_LABEL: Record<WorkChannel, string> = {
  instagram: "인스타그램",
  tiktok: "틱톡",
  youtube: "유튜브",
};

export type DealStatus =
  | "draft"
  | "agreed"
  | "posted"
  | "settlement_requested"
  | "settled"
  | "disputed"
  | "cancelled";

export type Party = "influencer" | "brand";

export type Terms = {
  version: 1;
  deal_type: DealModel;
  title: string;
  format: DealFormat;
  pricing: {
    model: DealModel;
    fixed_amount_krw: number | null;
    performance_rate_bps: number | null;
    currency: "KRW";
  };
  deliverables: { count: number; description: string };
  revisions: number;
  turnaround_days: number;
  usage_rights_days: number;
  paid_ads_allowed: boolean;
  raw_files_included: boolean;
  exclusivity: { enabled: boolean; days: number; category: string | null };
  payment_terms: {
    deposit_rate_bps: number;
    balance_due_days_after_post: number;
    method_preference: "bank";
  };
  notes: string;
};

export type TermsInput = {
  title: string;
  format: string;
  model: string;
  amountKrw?: number | null;
  ratePercent?: number | null;
  deliverableCount?: number;
  description?: string;
  revisions?: number;
  turnaroundDays?: number;
  usageDays?: number;
  paidAds?: boolean;
  rawFiles?: boolean;
  exclusivityEnabled?: boolean;
  exclusivityDays?: number;
  exclusivityCategory?: string | null;
  balanceDays?: number;
  notes?: string;
};

export type LensSettlement = {
  id: string;
  status: string;
  amountKrw: number;
  dueOn: string | null;
  note: string | null;
  periodLabel: string | null;
  claimedSalesKrw: number | null;
  claimedConversions: number | null;
  createdAt: string;
};

export type LensDeal = {
  id: string;
  status: DealStatus;
  title: string;
  terms: Terms;
  proposedBy: Party;
  postUrl: string | null;
  postedOn: string | null;
  postNote: string | null;
  agreedAt: string | null;
  cancelRequestedBy: Party | null;
  settlements: LensSettlement[];
};

export type LensMessage = {
  id: string;
  sender: "influencer" | "brand" | "system";
  body: string;
  kind: "text" | "terms" | "system";
  terms: Terms | null;
  createdAt: string;
};

export type RateTemplate = {
  id: string;
  title: string;
  format: DealFormat;
  model: DealModel;
  amountKrw: number | null;
  rateBps: number | null;
  priceHidden: boolean;
  deliverableCount: number;
  description: string;
  revisions: number;
  turnaroundDays: number;
  usageDays: number;
  paidAds: boolean;
  rawFiles: boolean;
  exclusivityDays: number;
  exclusivityCategory: string | null;
  isPublic: boolean;
};

export const systemSentences = {
  opened: (company: string) => `${company}님이 문의를 시작했습니다.`,
  proposed: (name: string) => `${name}님이 조건을 제안했습니다.`,
  agreed: () => "조건이 확정되었습니다. 이후에는 바꿀 수 없습니다.",
  rejected: (name: string) => `${name}님이 이 조건을 거절했습니다.`,
  withdrawn: (name: string) => `${name}님이 제안을 철회했습니다.`,
  posted: () => "게시 링크가 등록되었습니다.",
  settlement: (amount: string, date: string) => `${amount} 정산을 요청했습니다. 희망일 ${date}.`,
  paid: (company: string) =>
    `${company}님이 지급했다고 표시했습니다. Lens가 입금을 확인한 것은 아닙니다.`,
  disputed: (name: string) => `${name}님이 정산에 이견을 남겼습니다.`,
  cancelled: () => "게시 전에 건이 취소되었습니다.",
};

const BANNED = ["소송", "내용증명", "고소"];

export function copyIsSafe(text: string): boolean {
  return !BANNED.some((word) => text.includes(word));
}

export function suggestUsername(handle: string): string {
  const slug = handle
    .trim()
    .toLowerCase()
    .replace(/[._]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24)
    .replace(/-$/g, "");
  return validateUsername(slug).ok ? slug : "";
}

export function validateUsername(raw: string): { ok: true; username: string } | { ok: false; error: string } {
  const username = raw.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "주소는 소문자, 숫자, 하이픈 3~24자입니다. 하이픈으로 시작하거나 끝날 수 없습니다." };
  }
  if (RESERVED_USERNAMES.has(username)) {
    return { ok: false, error: "이 주소는 쓸 수 없습니다." };
  }
  return { ok: true, username };
}

export function trustForEmail(email: string): "personal_email" | "company_domain" {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return FREE_MAIL.has(domain) ? "personal_email" : "company_domain";
}

export function trustLabel(trust: string): string {
  if (trust === "company_domain") return "회사 메일";
  if (trust === "personal_email") return "개인 메일";
  return "메일";
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  if (user.length <= 2) return `${user.slice(0, 1)}***@${domain}`;
  return `${user.slice(0, 1)}***${user.slice(-1)}@${domain}`;
}

export function maskAccount(bankName: string, last4: string): string {
  const bank = bankName.trim() || "계좌";
  const tail = last4.replace(/\D/g, "").slice(-4);
  return `${bank} ****${tail}`;
}

export function formatWon(amount: number): string {
  return `${Math.trunc(amount).toLocaleString("ko-KR")}원`;
}

export function formatPercent(bps: number): string {
  const pct = bps / 100;
  return `${pct.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}%`;
}

export function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${year}. ${Number(month)}. ${Number(day)}.`;
}

export function todaySeoul(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function priceLabel(input: {
  model: DealModel;
  amountKrw: number | null;
  rateBps: number | null;
  priceHidden?: boolean;
}): string {
  if (input.priceHidden) return "문의";
  if (input.model === "fixed") return formatWon(input.amountKrw ?? 0);
  if (input.model === "performance") return formatPercent(input.rateBps ?? 0);
  return `${formatWon(input.amountKrw ?? 0)} + ${formatPercent(input.rateBps ?? 0)}`;
}

export function usageLabel(days: number): string {
  return days > 0 ? `${days}일` : "사용권 협의";
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function intIn(value: number | undefined, fallback: number, min: number, max: number): number | string {
  const n = value ?? fallback;
  if (!Number.isInteger(n) || n < min || n > max) return `값은 ${min}에서 ${max} 사이여야 합니다.`;
  return n;
}

export function parseTerms(input: TermsInput): { ok: true; terms: Terms } | { ok: false; error: string } {
  const title = input.title.trim();
  if (title.length < 1 || title.length > 80) return { ok: false, error: "제목은 1~80자입니다." };
  if (!FORMATS.includes(input.format as DealFormat)) return { ok: false, error: "형식을 선택해 주세요." };
  if (!MODELS.includes(input.model as DealModel)) return { ok: false, error: "유형을 선택해 주세요." };
  const model = input.model as DealModel;
  const format = input.format as DealFormat;
  const needsAmount = model === "fixed" || model === "hybrid";
  const needsRate = model === "performance" || model === "hybrid";
  let amount: number | null = null;
  let bps: number | null = null;
  if (needsAmount) {
    const won = input.amountKrw ?? 0;
    if (!Number.isInteger(won) || won < 1) return { ok: false, error: "금액은 1원 이상의 정수입니다." };
    amount = won;
  }
  if (needsRate) {
    const percent = input.ratePercent ?? 0;
    if (!Number.isFinite(percent) || percent < 0.01 || percent > 100) {
      return { ok: false, error: "수수료는 0.01%에서 100% 사이입니다." };
    }
    bps = Math.round(percent * 100);
    if (bps < 1) return { ok: false, error: "수수료는 0.01% 단위로 저장합니다." };
  }
  const count = intIn(input.deliverableCount, 1, 1, 20);
  if (typeof count === "string") return { ok: false, error: "산출물 수는 1~20입니다." };
  const description = (input.description ?? "").trim();
  if (description.length > 280) return { ok: false, error: "설명은 280자까지입니다." };
  const revisions = intIn(input.revisions, 0, 0, 5);
  if (typeof revisions === "string") return { ok: false, error: "수정 횟수는 0~5입니다." };
  const turnaround = intIn(input.turnaroundDays, 7, 1, 60);
  if (typeof turnaround === "string") return { ok: false, error: "업로드까지는 1~60일입니다." };
  const usage = intIn(input.usageDays, 0, 0, 3650);
  if (typeof usage === "string") return { ok: false, error: "사용 기간을 확인해 주세요." };
  const balance = intIn(input.balanceDays, 14, 0, 365);
  if (typeof balance === "string") return { ok: false, error: "잔금 기한은 0~365일입니다." };
  const notes = (input.notes ?? "").trim();
  if (notes.length > 500) return { ok: false, error: "메모는 500자까지입니다." };
  const exclusivityDays = input.exclusivityEnabled ? intIn(input.exclusivityDays, 30, 1, 365) : 0;
  if (typeof exclusivityDays === "string") return { ok: false, error: "독점 기간은 1~365일입니다." };
  const category = (input.exclusivityCategory ?? "").trim();
  if (category.length > 40) return { ok: false, error: "독점 범주는 40자까지입니다." };
  return {
    ok: true,
    terms: {
      version: 1,
      deal_type: model,
      title,
      format,
      pricing: {
        model,
        fixed_amount_krw: amount,
        performance_rate_bps: bps,
        currency: "KRW",
      },
      deliverables: { count, description },
      revisions,
      turnaround_days: turnaround,
      usage_rights_days: usage,
      paid_ads_allowed: Boolean(input.paidAds),
      raw_files_included: Boolean(input.rawFiles),
      exclusivity: {
        enabled: Boolean(input.exclusivityEnabled && exclusivityDays > 0),
        days: exclusivityDays,
        category: category || null,
      },
      payment_terms: {
        deposit_rate_bps: 0,
        balance_due_days_after_post: balance,
        method_preference: "bank",
      },
      notes,
    },
  };
}

export function termsToInput(terms: Terms): TermsInput {
  return {
    title: terms.title,
    format: terms.format,
    model: terms.deal_type,
    amountKrw: terms.pricing.fixed_amount_krw,
    ratePercent: terms.pricing.performance_rate_bps == null ? null : terms.pricing.performance_rate_bps / 100,
    deliverableCount: terms.deliverables.count,
    description: terms.deliverables.description,
    revisions: terms.revisions,
    turnaroundDays: terms.turnaround_days,
    usageDays: terms.usage_rights_days,
    paidAds: terms.paid_ads_allowed,
    rawFiles: terms.raw_files_included,
    exclusivityEnabled: terms.exclusivity.enabled,
    exclusivityDays: terms.exclusivity.days,
    exclusivityCategory: terms.exclusivity.category,
    balanceDays: terms.payment_terms.balance_due_days_after_post,
    notes: terms.notes,
  };
}

export function rateToInput(rate: RateTemplate): TermsInput {
  return {
    title: rate.title,
    format: rate.format,
    model: rate.model,
    amountKrw: rate.amountKrw,
    ratePercent: rate.rateBps == null ? null : rate.rateBps / 100,
    deliverableCount: rate.deliverableCount,
    description: rate.description,
    revisions: rate.revisions,
    turnaroundDays: rate.turnaroundDays,
    usageDays: rate.usageDays,
    paidAds: rate.paidAds,
    rawFiles: rate.rawFiles,
    exclusivityEnabled: rate.exclusivityDays > 0,
    exclusivityDays: rate.exclusivityDays,
    exclusivityCategory: rate.exclusivityCategory,
    balanceDays: 14,
    notes: "",
  };
}

const ACTIVE = new Set<DealStatus>(["draft", "agreed", "posted", "settlement_requested", "disputed"]);

export function activeDeal(deals: { status: DealStatus }[]): { status: DealStatus } | null {
  for (let i = deals.length - 1; i >= 0; i -= 1) {
    const deal = deals[i];
    if (deal && ACTIVE.has(deal.status)) return deal;
  }
  return null;
}

export function canPropose(deals: { status: DealStatus }[]): boolean {
  return activeDeal(deals) == null;
}

export type DealActionType =
  | "propose"
  | "agree"
  | "reject"
  | "withdraw"
  | "post"
  | "settle"
  | "paid"
  | "dispute"
  | "cancel"
  | "confirm_cancel";

export function transitionError(
  deal: { status: DealStatus; proposedBy: Party; cancelRequestedBy: Party | null } | null,
  action: DealActionType,
  role: Party,
): string | null {
  if (action === "propose") return null;
  if (!deal) return "건을 찾지 못했습니다.";
  if (action === "agree") {
    if (deal.status !== "draft" || deal.proposedBy === role) return "이 조건은 지금 확정할 수 없습니다.";
    return null;
  }
  if (action === "reject") {
    if (deal.status !== "draft" || deal.proposedBy === role) return "이 제안은 거절할 수 없습니다.";
    return null;
  }
  if (action === "withdraw") {
    if (deal.status !== "draft" || deal.proposedBy !== role) return "본인이 보낸 제안만 철회할 수 있습니다.";
    return null;
  }
  if (action === "post") {
    if (role !== "influencer" || deal.status !== "agreed") return "게시 링크는 합의된 건에서 인플루언서만 등록합니다.";
    return null;
  }
  if (action === "settle") {
    if (role !== "influencer" || (deal.status !== "posted" && deal.status !== "disputed")) {
      return "정산 요청은 게시 후 또는 이견 뒤에 다시 보낼 수 있습니다.";
    }
    return null;
  }
  if (action === "paid") {
    if (role !== "brand" || (deal.status !== "settlement_requested" && deal.status !== "disputed")) {
      return "지급 표시는 브랜드만, 정산 요청이나 이견 상태에서 할 수 있습니다.";
    }
    return null;
  }
  if (action === "dispute") {
    if (deal.status !== "settlement_requested") return "이견을 남길 상태가 아닙니다.";
    return null;
  }
  if (action === "cancel") {
    if (deal.status !== "agreed" || deal.cancelRequestedBy) return "게시 전에만 취소를 요청할 수 있습니다.";
    return null;
  }
  if (action === "confirm_cancel") {
    if (deal.status !== "agreed" || !deal.cancelRequestedBy || deal.cancelRequestedBy === role) {
      return "상대의 취소 요청에만 동의할 수 있습니다.";
    }
    return null;
  }
  return "처리할 수 없는 요청입니다.";
}

export function statusLabel(status: DealStatus): string {
  switch (status) {
    case "draft":
      return "제안";
    case "agreed":
      return "조건 합의";
    case "posted":
      return "게시됨";
    case "settlement_requested":
      return "정산 요청";
    case "disputed":
      return "이견";
    case "settled":
      return "지급 표시";
    case "cancelled":
      return "취소";
  }
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) sorted[key] = sortValue(source[key]);
    return sorted;
  }
  return value;
}

export type LensRecordBody = {
  kind: "lens-record";
  version: 1;
  influencer: { name: string; username: string };
  brand: { company: string; contactName: string; emailMasked: string; trustLabel: string };
  deal: {
    title: string;
    status: DealStatus;
    terms: Terms;
    proposedBy: Party;
    agreedAt: string | null;
    postUrl: string | null;
    postedOn: string | null;
    postNote: string | null;
    settlements: LensSettlement[];
  };
  messages: { sender: string; body: string; createdAt: string }[];
  platformNote: string;
};

export function buildDealRecord(input: {
  influencerName: string;
  username: string;
  company: string;
  contactName: string;
  emailMasked: string;
  trustLabel: string;
  deal: LensDeal;
  messages: { sender: string; body: string; createdAt: string }[];
}): LensRecordBody {
  return {
    kind: "lens-record",
    version: 1,
    influencer: { name: input.influencerName, username: input.username },
    brand: {
      company: input.company,
      contactName: input.contactName,
      emailMasked: input.emailMasked,
      trustLabel: input.trustLabel,
    },
    deal: {
      title: input.deal.title,
      status: input.deal.status,
      terms: input.deal.terms,
      proposedBy: input.deal.proposedBy,
      agreedAt: input.deal.agreedAt,
      postUrl: input.deal.postUrl,
      postedOn: input.deal.postedOn,
      postNote: input.deal.postNote,
      settlements: input.deal.settlements,
    },
    messages: input.messages,
    platformNote: "지급 표시는 브랜드의 선언이며 Lens가 입금을 확인한 것은 아닙니다.",
  };
}
