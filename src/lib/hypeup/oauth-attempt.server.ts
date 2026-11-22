import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";

export type OAuthAttempt =
  | { status: "pending" }
  | { status: "complete"; userId: string; igUserId: string }
  | { status: "failed"; error: string };

function hashAttempt(browserBinding: string): string {
  return createHash("sha256").update(browserBinding).digest("hex");
}

export async function claimOAuthAttempt(
  browserBinding: string,
): Promise<boolean> {
  const sql = await getSql();
  const hash = hashAttempt(browserBinding);
  const claimed = await sql<{ state_hash: string }>`
    with expired as (
      delete from hypeup_oauth_attempt
      where expires_at <= now() and state_hash <> ${hash}
    )
    insert into hypeup_oauth_attempt (state_hash)
    values (${hash})
    on conflict (state_hash) do nothing
    returning state_hash
  `;
  return claimed.length === 1;
}

export async function readOAuthAttempt(
  browserBinding: string,
): Promise<OAuthAttempt | null> {
  const sql = await getSql();
  const [attempt] = await sql<{
    user_id: string | null;
    ig_user_id: string | null;
    error_code: string | null;
  }>`
    select attempt.user_id, account.ig_user_id, attempt.error_code
    from hypeup_oauth_attempt as attempt
    left join hypeup_user as account
      on account.id = attempt.user_id and account.token_cipher is not null
    where attempt.state_hash = ${hashAttempt(browserBinding)} and attempt.expires_at > now()
  `;
  if (!attempt) return null;
  if (attempt.error_code)
    return { status: "failed", error: attempt.error_code };
  if (!attempt.user_id) return { status: "pending" };
  if (!attempt.ig_user_id) return null;
  return {
    status: "complete",
    userId: attempt.user_id,
    igUserId: attempt.ig_user_id,
  };
}

async function finishOAuthAttempt(
  browserBinding: string,
  userId: string | null,
  errorCode: string | null,
): Promise<void> {
  const sql = await getSql();
  await sql`
    update hypeup_oauth_attempt
    set user_id = ${userId}, error_code = ${errorCode}
    where state_hash = ${hashAttempt(browserBinding)}
      and expires_at > now()
      and user_id is null and error_code is null
  `;
}

export async function completeOAuthAttempt(
  browserBinding: string,
  userId: string,
): Promise<void> {
  await finishOAuthAttempt(browserBinding, userId, null);
}

export async function failOAuthAttempt(
  browserBinding: string,
  error: string,
): Promise<void> {
  await finishOAuthAttempt(browserBinding, null, error);
}
