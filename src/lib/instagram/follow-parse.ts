export type FollowStatus = "follower" | "not_follower" | "unknown";

export function interpretFollowResponse(body: unknown): { status: FollowStatus; username: string | null } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const username = typeof record.username === "string" ? record.username : null;
  if (typeof record.is_user_follow_business === "boolean") {
    return { status: record.is_user_follow_business ? "follower" : "not_follower", username };
  }
  return { status: "unknown", username };
}

export function normalizeInstagramUsername(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/^@/, "").toLowerCase() ?? "";
  return normalized || null;
}

export function sameInstagramUsername(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = normalizeInstagramUsername(left);
  const b = normalizeInstagramUsername(right);
  return Boolean(a && a === b);
}

const FOLLOW_GATE_PREFIX = "hypeup_follow:";

export function followGatePayload(gateId: string): string {
  return `${FOLLOW_GATE_PREFIX}${gateId}`;
}

export function parseFollowGatePayload(payload: string | null | undefined): string | null {
  if (!payload?.startsWith(FOLLOW_GATE_PREFIX)) return null;
  const id = payload.slice(FOLLOW_GATE_PREFIX.length).trim();
  return id || null;
}
