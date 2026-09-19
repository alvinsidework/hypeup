import { copy } from "@/lib/hypeup/copy";

export class InstagramApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly subcode?: number;
  readonly raw: unknown;

  constructor(message: string, opts: { status?: number; code?: number; subcode?: number; raw?: unknown }) {
    super(message);
    this.name = "InstagramApiError";
    this.status = opts.status ?? 500;
    this.code = opts.code;
    this.subcode = opts.subcode;
    this.raw = opts.raw;
  }
}

export function koreanError(error: unknown): string {
  if (error instanceof InstagramApiError) {
    if (error.status === 429 || error.code === 4 || error.code === 32) return copy.rateLimited;
    if (error.subcode === 2534014) return copy.dmDuplicate;
    if (error.code === 10 || error.code === 200) return copy.personalAccount;
    if (/tester|role|not.*authorized/i.test(error.message)) return copy.notTester;
    if (/redirect/i.test(error.message)) return copy.redirectMismatch;
    if (/expired|session|190/i.test(error.message) || error.code === 190) return copy.tokenExpired;
  }
  if (error instanceof Error) {
    if (error.message === "duplicate") return copy.dmDuplicate;
    if (error.message === "expired") return copy.dmExpired;
    if (error.message === "Unauthorized") return copy.tokenExpired;
  }
  return copy.genericError;
}

export function graphErrorPayload(error: unknown): Record<string, unknown> {
  if (error instanceof InstagramApiError) {
    return {
      message: error.message.slice(0, 300),
      code: error.code,
      subcode: error.subcode,
      status: error.status,
    };
  }
  if (error instanceof Error) {
    return { message: error.message.slice(0, 300) };
  }
  return { message: "unknown" };
}
