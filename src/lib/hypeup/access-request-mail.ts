/** Instagram → Settings → Apps and websites → Tester Invites. */
export const TESTER_ACCEPT_URL = "https://www.instagram.com/accounts/manage_access/";

const REPLY_START = "──────── 회신용 본문 (이 줄 다음부터 구분선 직전만 복사) ────────";
const REPLY_END = "──────── 회신용 본문 끝 ────────";

export type AccessRequestMail = {
  subject: string;
  text: string;
  replyTo: string;
  instagram: string;
};

export function normalizeInstagramHandle(raw: string): string | null {
  const handle = raw.trim().replace(/^@+/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return null;
  if (handle.startsWith(".") || handle.endsWith(".")) return null;
  if (handle.includes("..")) return null;
  return handle;
}

export function isEmailAddress(value: string): boolean {
  const email = value.trim();
  return email.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Applicant-facing site. Ignore localhost so a local submit still points at the live app. */
export function applicantSiteUrl(configured: string | undefined, fallback: string): string {
  if (
    configured &&
    /^https:\/\//.test(configured) &&
    !/localhost|127\.0\.0\.1/i.test(configured)
  ) {
    return configured.replace(/\/$/, "");
  }
  return fallback.replace(/\/$/, "");
}

export function replyBody(text: string): string {
  const start = text.indexOf(REPLY_START);
  const end = text.indexOf(REPLY_END);
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start + REPLY_START.length, end).trim();
}

export function composeAccessRequestEmail(input: {
  instagram: string;
  email: string;
  appUrl: string;
  appId?: string;
  now?: Date;
}): AccessRequestMail {
  const when = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(input.now ?? new Date());

  const rolesUrl = input.appId
    ? `https://developers.facebook.com/apps/${input.appId}/roles/roles/`
    : "https://developers.facebook.com/apps/";

  const reply = [
    "안녕하세요. Hypeup입니다.",
    "",
    `@${input.instagram} 계정을 테스터로 등록했습니다.`,
    "아래 페이지에서 초대를 수락해 주세요.",
    "",
    "테스터 초대 수락",
    TESTER_ACCEPT_URL,
    "",
    `인스타그램에 @${input.instagram} 로 로그인한 뒤, Tester Invites(테스터 초대)에서 앱을 수락하면 됩니다.`,
    "앱에서는 설정 및 활동 → 웹사이트 권한 → 테스터 초대로 들어가면 같은 화면입니다.",
    "",
    "수락한 다음 여기서 프로페셔널 계정으로 연결해 주세요.",
    input.appUrl,
    "",
    "개인 계정은 연결되지 않습니다. 비즈니스 또는 크리에이터로 바꾼 뒤 다시 시도해 주세요.",
  ].join("\n");

  const text = [
    "Hypeup 사용 신청",
    "",
    `인스타그램: @${input.instagram}`,
    `이메일: ${input.email}`,
    "이용 동의: 동의함",
    `신청 시각: ${when} (서울)`,
    "",
    REPLY_START,
    reply,
    REPLY_END,
    "",
    "운영자 메모 — 신청자에게 보내지 마세요.",
    `1. Instagram Testers에 @${input.instagram} 을 추가하세요. 일반 Tester가 아닙니다.`,
    rolesUrl,
    `2. 초대를 보낸 뒤, 위 회신 본문만 복사해서 ${input.email} 로 보내세요.`,
    "답장을 누르면 이 메일 전체가 따라가므로, 새 메일에 회신 본문만 붙여 넣으세요.",
  ].join("\n");

  return {
    subject: `[Hypeup 사용 신청] @${input.instagram}`,
    text,
    replyTo: input.email,
    instagram: input.instagram,
  };
}
