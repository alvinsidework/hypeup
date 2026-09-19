export function normalizeAuthCode(code: string): string {
  return code.replace(/#_$/, "");
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
