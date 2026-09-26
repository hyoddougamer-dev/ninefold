/**
 * 榜 Where the ranked server is, and the key a phone uses to talk to it.
 *
 * The key is the project's *public* one (anon / publishable): it is meant to be in every
 * copy of the game, and it opens nothing by itself. Every table behind it is shut, and
 * the only doors are the functions in supabase/, which check who is asking and verify
 * what they send. The service role key is never here and never will be.
 *
 * If the key is rotated in the Supabase dashboard, this line is the one to change.
 */
export const SUPABASE_URL = 'https://yqppvmuwlhibswbbvjzz.supabase.co';
/** The build fills it from the project itself when it can (pages.yml); this is the fallback. */
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcHB2bXV3bGhpYnN3YmJ2anp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMDkyODMsImV4cCI6MjEwNTY4NTI4M30._aVlpBcPJnQy8w-Savmn0Qa2ljhT1UtxwJDOzuAPe5k';
export const SUPABASE_KEY: string =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_KEY || FALLBACK_KEY;
