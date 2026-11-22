export function normalizeAuthCode(code: string): string {
  return code.replace(/#_$/, "");
}

export function isAuthorizationCodeUsed(error: unknown): boolean {
  return (
    error instanceof Error &&
    (/\bauthori[sz]ation code\s+(?:has (?:already )?been used|(?:is |was )?already used)\b/i.test(error.message) ||
      /\bmatching code was not found or was already used\b/i.test(error.message))
  );
}

export function isUnsupportedMethod(error: unknown): boolean {
  return error instanceof Error && /unsupported request - method type/i.test(error.message);
}

/** Instagram sometimes answers the long-lived exchange with a fake method or object error. */
export function isLongLivedExchangeRejected(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    isUnsupportedMethod(error) ||
    /object with id ['"]access_token['"]/i.test(error.message)
  );
}

export function isProfessionalAccount(accountType: string | undefined): boolean {
  if (!accountType) return true;
  const normalized = accountType.toUpperCase();
  return normalized !== "PERSONAL" && normalized !== "PRIVATE";
}

const DEFAULT_SCOPES =
  "instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages";

export function parseGrantedScopes(raw: unknown, fallback = DEFAULT_SCOPES): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).map((part) => part.trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return fallback
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}
