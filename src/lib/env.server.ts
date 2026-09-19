export function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

/** Postgres URL: DATABASE_URL, else Supabase/Postgres aliases. */
export function resolveDatabaseUrl(): string | undefined {
  return (
    env("DATABASE_URL") ||
    env("SUPABASE_DB_URL") ||
    env("POSTGRES_URL") ||
    env("POSTGRES_PRISMA_URL")
  );
}

/**
 * Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
 * every publish; the sandbox preview never has it. Single source of truth for
 * the split — gate audience, gate endpoints and connector-token semantics all
 * key off this predicate.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}
