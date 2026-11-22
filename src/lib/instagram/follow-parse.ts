export type FollowStatus = "follower" | "not_follower" | "unknown";

export function interpretFollowResponse(body: unknown): { status: FollowStatus; username: string | null } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const username = typeof record.username === "string" ? record.username : null;
  if (typeof record.is_user_follow_business === "boolean") {
    return { status: record.is_user_follow_business ? "follower" : "not_follower", username };
  }
  return { status: "unknown", username };
}

export function sameInstagramUsername(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalize = (value: string | null | undefined) => value?.trim().replace(/^@/, "").toLowerCase() ?? "";
  const a = normalize(left);
  const b = normalize(right);
  return a.length > 0 && a === b;
}
