import { env } from "@/lib/env.server";
import {
  applicantSiteUrl,
  composeAccessRequestEmail,
  isEmailAddress,
  normalizeInstagramHandle,
} from "./access-request-mail";
import { appUrl, instagramAppId } from "./env.server";
import { legal } from "./legal";

/** Same inbox as the public contact address. The +tag is a fresh FormSubmit form. */
const ACCESS_REQUEST_INBOX = "alvinhan1707+hypeup@gmail.com";

export type AccessRequestInput = {
  instagram: string;
  email: string;
  consent: boolean;
  companyWebsite?: string;
};

export type AccessRequestResult = { ok: true } | { ok: false; error: string };

const hourMs = 60 * 60 * 1000;
const byEmail = new Map<string, number[]>();
let globalStamps: number[] = [];

function tooMany(email: string): boolean {
  const now = Date.now();
  globalStamps = globalStamps.filter((stamp) => now - stamp < hourMs);
  const stamps = (byEmail.get(email) ?? []).filter((stamp) => now - stamp < hourMs);
  if (globalStamps.length >= 30 || stamps.length >= 3) {
    byEmail.set(email, stamps);
    return true;
  }
  stamps.push(now);
  globalStamps.push(now);
  byEmail.set(email, stamps);
  return false;
}

function activationPending(message: string | undefined): boolean {
  return /activat/i.test(message ?? "");
}

async function sendViaResend(input: {
  subject: string;
  text: string;
  replyTo: string;
  apiKey: string;
}): Promise<void> {
  const from = env("RESEND_FROM") ?? "Hypeup <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [legal.email],
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`resend ${response.status}`);
  }
}

async function sendViaFormSubmit(
  input: {
    subject: string;
    text: string;
    replyTo: string;
    instagram: string;
  },
  site: string,
): Promise<void> {
  const response = await fetch(
    `https://formsubmit.co/ajax/${encodeURIComponent(ACCESS_REQUEST_INBOX)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: site,
        Referer: `${site}/`,
      },
      body: JSON.stringify({
        _subject: input.subject,
        _template: "box",
        _captcha: "false",
        _replyto: input.replyTo,
        email: input.replyTo,
        instagram: `@${input.instagram}`,
        message: input.text,
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );
  const payload = (await response.json().catch(() => null)) as {
    success?: string | boolean;
    message?: string;
  } | null;
  const success = payload?.success === true || payload?.success === "true";
  if (success || activationPending(payload?.message)) return;
  throw new Error(payload?.message || `formsubmit ${response.status}`);
}

export async function deliverAccessRequest(input: AccessRequestInput): Promise<AccessRequestResult> {
  if (input.companyWebsite?.trim()) return { ok: true };
  if (!input.consent) return { ok: false, error: "이용 동의에 체크해 주세요." };

  const instagram = normalizeInstagramHandle(input.instagram);
  if (!instagram) {
    return {
      ok: false,
      error: "인스타그램 계정명을 확인해 주세요. @ 없이 영문, 숫자, 밑줄, 마침표만 쓸 수 있습니다.",
    };
  }
  const email = input.email.trim();
  if (!isEmailAddress(email)) return { ok: false, error: "이메일 주소를 확인해 주세요." };
  if (tooMany(email.toLowerCase())) {
    return { ok: false, error: "같은 이메일로 신청이 이미 접수되었습니다. 답변 메일을 기다려 주세요." };
  }

  const site = applicantSiteUrl(appUrl(), legal.site);
  const mail = composeAccessRequestEmail({
    instagram,
    email,
    appUrl: site,
    appId: instagramAppId(),
  });

  try {
    const resendKey = env("RESEND_API_KEY");
    if (resendKey) {
      await sendViaResend({ ...mail, apiKey: resendKey });
    } else {
      await sendViaFormSubmit(mail, site);
    }
    return { ok: true };
  } catch (error) {
    console.error("[hypeup] access request mail failed", error instanceof Error ? error.message : "error");
    byEmail.set(
      email.toLowerCase(),
      (byEmail.get(email.toLowerCase()) ?? []).slice(0, -1),
    );
    return {
      ok: false,
      error: "신청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
}
