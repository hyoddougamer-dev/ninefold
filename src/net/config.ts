/**
 * 榜 Where the ranked server is, and the key a phone uses to talk to it.
 *
 * The key is the project's *public* one (anon / publishable): it is meant to be in every
 * copy of the game, and it opens nothing by itself. Every table behind it is shut, and
 * the only doors are the functions in supabase/, which check who is asking and verify
 * what they send. The service role key is never here and never will be.
 *
 * The fallback is the project's publishable key, not the legacy anon JWT: the legacy keys
 * are to be switched off, and a build that fell back to one would lose the rankings.
 */
export const SUPABASE_URL = 'https://yqppvmuwlhibswbbvjzz.supabase.co';
/** The build fills it from the project itself when it can (pages.yml); this is the fallback. */
const FALLBACK_KEY = 'sb_publishable_JnQK0Hq38VFR3z7YDuxIiw_DK95oag3';
export const SUPABASE_KEY: string =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_KEY || FALLBACK_KEY;
