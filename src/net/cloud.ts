/**
 * 雲 The game's side of the ranked server: signing in, the cloud copy, the boards.
 *
 * Nothing here is loaded until it is needed. supabase-js is a sizeable library and a
 * player who never opens the rankings should never download it, so every function awaits
 * `client()`, which imports it the first time. A player who has signed in is remembered
 * by one small flag in localStorage, so the game knows to start syncing without having to
 * load the library to find out.
 *
 * Nothing here changes a number in the game. The server decides what is ranked; the
 * phone only offers.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config.ts';
import type { State } from '../sim/state.ts';

const FLAG = 'ninefold.ranked';

let made: Promise<SupabaseClient> | null = null;

export function client(): Promise<SupabaseClient> {
  made ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'ninefold.auth' },
    }));
  return made;
}

/** Whether this device has signed in before, read without loading anything. */
export function remembered(): boolean {
  try { return localStorage.getItem(FLAG) === '1'; } catch { return false; }
}
function remember(on: boolean) {
  try { if (on) localStorage.setItem(FLAG, '1'); else localStorage.removeItem(FLAG); } catch { /* private window */ }
}

/** A sign-in link came back to the page: it is in the address, and has to be read now. */
export function returningFromLink(): boolean {
  return typeof location !== 'undefined' && /access_token=|code=|error_description=/.test(location.hash + location.search);
}

export interface Who {
  readonly id: string;
  readonly email: string | null;
  readonly guest: boolean;
}

export async function who(): Promise<Who | null> {
  const c = await client();
  const { data } = await c.auth.getSession();
  const u = data.session?.user;
  if (!u) return null;
  remember(true);
  return { id: u.id, email: u.email ?? null, guest: !!(u as { is_anonymous?: boolean }).is_anonymous };
}

/** 入 In as a guest: a cultivator on this device, ranked, with no email asked for. */
export async function enterAsGuest(): Promise<Who> {
  const c = await client();
  const { data, error } = await c.auth.signInAnonymously();
  if (error || !data.user) throw new Error(error?.message ?? 'no user');
  remember(true);
  return { id: data.user.id, email: null, guest: true };
}

/**
 * 信 A link by email: to sign in on a new device, or, for a guest, to keep this
 * cultivator on every device from now on (the account is the same one, with an email).
 */
export async function sendLink(email: string, guest: boolean): Promise<void> {
  const c = await client();
  const back = location.origin + location.pathname;
  const { error } = guest
    ? await c.auth.updateUser({ email }, { emailRedirectTo: back })
    : await c.auth.signInWithOtp({ email, options: { emailRedirectTo: back, shouldCreateUser: true } });
  if (error) throw new Error(error.message);
}

/**
 * 碼 The six digits in the same email, for when the link would open in the wrong place:
 * inside the installed app a link opens the phone's browser, not the game, so the code
 * is typed where the game is. A guest adding an email confirms it the same way.
 */
export async function enterCode(email: string, code: string, guest: boolean): Promise<Who> {
  const c = await client();
  const { data, error } = await c.auth.verifyOtp({ email, token: code.trim(), type: guest ? 'email_change' : 'email' });
  if (error || !data.user) throw new Error(error?.message ?? 'no user');
  remember(true);
  return { id: data.user.id, email: data.user.email ?? email, guest: false };
}

/** 刪 Delete the account and everything the server holds; the game on this device stays. */
export async function deleteMe(): Promise<boolean> {
  const c = await client();
  const { error } = await c.rpc('delete_me');
  if (error) return false;
  await c.auth.signOut().catch(() => {});
  remember(false);
  return true;
}

export async function signOut(): Promise<void> {
  const c = await client();
  await c.auth.signOut();
  remember(false);
}

export type SyncState = 'verified' | 'waiting' | 'refused' | 'behind';

export interface Synced {
  readonly ranked: boolean;
  readonly state: SyncState;
  readonly why: readonly string[];
  readonly suspect: boolean;
  readonly behindHours: number;
}

/** 同 Offer this save to the server. It keeps it as the cloud copy and ranks what verifies. */
export async function sync(s: State, name?: string): Promise<Synced | { error: string; wait?: number }> {
  const c = await client();
  const { data, error } = await c.functions.invoke('sync', { body: { save: s, name } });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    try {
      const body = ctx ? await ctx.json() : null;
      if (body?.error) return { error: body.error, wait: body.wait };
    } catch { /* not json */ }
    return { error: 'offline' };
  }
  return data as Synced;
}

/** 取 The cloud copy, for a cultivator arriving on a new device. */
export async function pull(): Promise<{ save: unknown; at: string | null }> {
  const c = await client();
  const { data, error } = await c.functions.invoke('sync', { body: { action: 'pull' } });
  if (error) throw new Error('offline');
  return data as { save: unknown; at: string | null };
}

export type Board = 'climb' | 'week' | 'tower';

export interface Row {
  readonly rank: number;
  readonly name: string;
  readonly climb: number;
  readonly marks: number;
  readonly tower: number;
  readonly gain: number;
  readonly title: string | null;
  readonly me: boolean;
}

export async function board(kind: Board): Promise<readonly Row[]> {
  const c = await client();
  const { data, error } = await c.rpc('board', { kind, lim: 100 });
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

/**
 * 位 Where the signed-in player stands on 天榜 the Heaven List, or null if nowhere yet.
 * The board always returns the caller's own row beside the top ones, so one row of limit
 * is enough to learn a place anywhere on it.
 */
export async function place(): Promise<number | null> {
  const c = await client();
  const { data, error } = await c.rpc('board', { kind: 'climb', lim: 1 });
  if (error) return null;
  const me = ((data ?? []) as Row[]).find((r) => r.me);
  return me ? Number(me.rank) : null;
}

export interface Mine {
  readonly name: string;
  readonly suspect: boolean;
  readonly banned: boolean;
  readonly climb: number | null;
  readonly marks: number | null;
  readonly tower: number | null;
  readonly verified_at: string | null;
  readonly latest_at: string | null;
  readonly title: string | null;
}

export async function mine(): Promise<Mine | null> {
  const c = await client();
  const { data, error } = await c.rpc('my_standing');
  if (error) return null;
  return (data ?? null) as Mine | null;
}

/** 名 Returns the name as the server stored it, or the reason it was refused. */
export async function rename(name: string): Promise<{ name: string } | { error: string }> {
  const c = await client();
  const { data, error } = await c.rpc('set_name', { new_name: name });
  if (error) {
    const m = error.message;
    return { error: /taken/.test(m) ? 'taken' : /length/.test(m) ? 'length' : /characters/.test(m) ? 'characters' : 'offline' };
  }
  return { name: data as string };
}
