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

type PwaAttemptOrigin = { id: string; origin: string };

export async function createPwaOAuthAttempt(
  attempt: PwaAttemptOrigin & { launchToken: string; claimToken: string },
): Promise<void> {
  const sql = await getSql();
  await sql`
    with expired as (
      delete from hypeup_pwa_oauth_attempt where expires_at <= now()
    )
    insert into hypeup_pwa_oauth_attempt (id, initiating_origin, launch_hash, claim_hash)
    values (${attempt.id}, ${attempt.origin}, ${hashAttempt(attempt.launchToken)}, ${hashAttempt(attempt.claimToken)})
  `;
}

export async function launchPwaOAuthAttempt(
  launchToken: string,
  origin: string,
): Promise<PwaAttemptOrigin | null> {
  const sql = await getSql();
  const [attempt] = await sql<PwaAttemptOrigin>`
    update hypeup_pwa_oauth_attempt
    set launched = true
    where launch_hash = ${hashAttempt(launchToken)}
      and initiating_origin = ${origin} and expires_at > now() and not launched
    returning id, initiating_origin as origin
  `;
  return attempt ?? null;
}

export async function finishPwaOAuthAttempt(
  attempt: PwaAttemptOrigin,
  userId: string | null,
  error: string | null,
): Promise<boolean> {
  const sql = await getSql();
  const finished = await sql<{ id: string }>`
    update hypeup_pwa_oauth_attempt
    set user_id = ${userId}, error_code = ${error}
    where id = ${attempt.id} and initiating_origin = ${attempt.origin}
      and launched and expires_at > now()
      and ((user_id is null and error_code is null)
        or (user_id is not distinct from ${userId} and error_code is not distinct from ${error}))
    returning id
  `;
  return finished.length === 1;
}

export async function readPwaOAuthResult(
  attempt: PwaAttemptOrigin,
  claimToken: string,
): Promise<OAuthAttempt | null> {
  const sql = await getSql();
  const [result] = await sql<{
    user_id: string | null;
    ig_user_id: string | null;
    error_code: string | null;
  }>`
    select attempt.user_id, account.ig_user_id, attempt.error_code
    from hypeup_pwa_oauth_attempt as attempt
    left join hypeup_user as account on account.id = attempt.user_id and account.token_cipher is not null
    where attempt.id = ${attempt.id} and attempt.initiating_origin = ${attempt.origin}
      and attempt.claim_hash = ${hashAttempt(claimToken)} and attempt.expires_at > now()
  `;
  if (!result) return null;
  if (result.error_code) return { status: "failed", error: result.error_code };
  if (!result.user_id) return { status: "pending" };
  if (!result.ig_user_id) return null;
  return {
    status: "complete",
    userId: result.user_id,
    igUserId: result.ig_user_id,
  };
}

export async function hasCompletedPwaOAuthAttempt(
  attempt: PwaAttemptOrigin,
  user: { userId: string; igUserId: string },
): Promise<boolean> {
  const sql = await getSql();
  const [result] = await sql<{ id: string }>`
    select attempt.id
    from hypeup_pwa_oauth_attempt as attempt
    join hypeup_user as account on account.id = attempt.user_id
    where attempt.id = ${attempt.id} and attempt.initiating_origin = ${attempt.origin}
      and attempt.launched and attempt.expires_at > now()
      and account.id = ${user.userId} and account.ig_user_id = ${user.igUserId}
      and account.token_cipher is not null
  `;
  return Boolean(result);
}
