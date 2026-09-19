import { createServerFn } from "@tanstack/react-start";
import { copy } from "./copy";
import { DEMO_IG_USER_ID, DEMO_USER_ID, isDemoMode } from "./env.server";
import { getSession, setSessionCookie } from "./session.server";
import type { Bootstrap } from "./types";

export const getBootstrap = createServerFn({ method: "GET" }).handler(async (): Promise<Bootstrap> => {
  const session = await getSession();
  if (!session) return { demoMode: isDemoMode(), user: null };
  const { findUserById } = await import("./repo");
  const user = await findUserById(session.userId);
  if (!user) return { demoMode: isDemoMode(), user: null };
  return {
    demoMode: isDemoMode(),
    user: {
      id: user.id,
      igUserId: user.igUserId,
      username: user.username,
      name: user.name,
      accountType: user.accountType,
      profilePictureUrl: user.profilePictureUrl,
      followersCount: user.followersCount,
      mediaCount: user.mediaCount,
      tokenExpiresAt: user.tokenExpiresAt,
      grantedScopes: user.grantedScopes,
      webhookSubscribedAt: user.webhookSubscribedAt,
      hasToken: user.hasToken,
      isDemo: user.isDemo,
    },
  };
});

export const enterDemo = createServerFn({ method: "POST" }).handler(async () => {
  if (!isDemoMode()) throw new Error(copy.notConfigured);
  const { ensureDemoData } = await import("./seed");
  await ensureDemoData();
  await setSessionCookie({ userId: DEMO_USER_ID, igUserId: DEMO_IG_USER_ID });
  return { ok: true as const };
});
