import { createHmac, timingSafeEqual } from "node:crypto";

export type NormalizedCommentEvent = {
  igUserId: string;
  commentId: string;
  fromId: string | null;
  fromUsername: string | null;
  text: string;
  mediaId: string | null;
  timestamp: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function signatureMatches(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody: string, header: string | null, secret: string): boolean {
  try {
    return signatureMatches(rawBody, header, secret);
  } catch {
    return false;
  }
}

function fromValue(value: Record<string, unknown>, igUserId: string): NormalizedCommentEvent | null {
  const id = typeof value.id === "string" ? value.id : null;
  if (!id) return null;
  const from = asRecord(value.from);
  const media = asRecord(value.media);
  return {
    igUserId,
    commentId: id,
    fromId: typeof from?.id === "string" ? from.id : null,
    fromUsername: typeof from?.username === "string" ? from.username : null,
    text: typeof value.text === "string" ? value.text : "",
    mediaId: typeof media?.id === "string" ? media.id : typeof value.media_id === "string" ? value.media_id : null,
    timestamp: typeof value.time === "number" ? value.time : null,
  };
}

export function parseWebhookPayload(payload: unknown): NormalizedCommentEvent[] {
  const root = asRecord(payload);
  if (!root) return [];
  const entries = Array.isArray(root.entry) ? root.entry : [];
  const events: NormalizedCommentEvent[] = [];

  for (const entry of entries) {
    const record = asRecord(entry);
    if (!record) continue;
    const igUserId = typeof record.id === "string" ? record.id : "";
    if (!igUserId) continue;

    if (record.field === "comments" && asRecord(record.value)) {
      const event = fromValue(asRecord(record.value)!, igUserId);
      if (event) events.push(event);
    }

    const changes = Array.isArray(record.changes) ? record.changes : [];
    for (const change of changes) {
      const changeRecord = asRecord(change);
      if (!changeRecord) continue;
      if (changeRecord.field !== "comments") continue;
      const value = asRecord(changeRecord.value);
      if (!value) continue;
      const event = fromValue(value, igUserId);
      if (event) events.push(event);
    }
  }

  return events;
}
