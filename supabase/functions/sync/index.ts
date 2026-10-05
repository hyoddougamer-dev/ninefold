// 同步 The Deno shell around core.ts: auth, the database, and nothing else.
//
// Deployed by .github/workflows/supabase.yml. The service role key is given to every
// Edge Function by Supabase itself (SUPABASE_SERVICE_ROLE_KEY); it is never in this
// repository and never leaves the server.
import { createClient } from 'npm:@supabase/supabase-js@2';
// The core and the whole sim/ it runs are bundled into one file by the deploy workflow
// (esbuild), so the function does not depend on how Supabase resolves imports that
// reach outside its own folder.
// @ts-ignore: generated at deploy time
import { sync } from './core.bundle.js';
type Anchor = { state: unknown; at: number };
type Saved = { latest: unknown; verified: unknown; verifiedAt: number | null; lastSync: number; day?: Anchor | null; week?: Anchor | null };
type Standing = { climb: number; marks: number; tower: number; climbedAt: number; towerAt: number; week: number; weekFrom: number };
type Profile = { name: string; strikes: number; suspect: boolean; banned: boolean };
// deno-lint-ignore no-explicit-any
type Store = any;

const url = Deno.env.get('SUPABASE_URL')!;

// 鑰 The new secret key when the project has one, the legacy service role otherwise. The
// legacy JWT keys are meant to be switched off (one was pasted into a chat), and a
// function that only knew SUPABASE_SERVICE_ROLE_KEY would stop the day they were.
function secretKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
    const k = keys.default ?? Object.values(keys)[0];
    if (k) return k;
  } catch { /* not set, or not JSON: fall through */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const service = secretKey();
const db = createClient(url, service, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const iso = (s: number) => new Date(s * 1000).toISOString();
const sec = (t: string | null) => (t ? Date.parse(t) / 1000 : null);

function store(): Store {
  return {
    // 限 One statement in the database, so two syncs at once cannot both take the turn.
    async claim(id: string, _now: number, gap: number) {
      const { data, error } = await db.rpc('claim_sync', { uid: id, gap_seconds: gap });
      if (error) throw error;
      return Number(data ?? 0);
    },
    async mark(id: string, strike: boolean, suspect: boolean, ban: number) {
      const { data, error } = await db.rpc('mark_player', { uid: id, strike, flag: suspect, ban });
      if (error) throw error;
      return data as Profile;
    },
    async profile(id) {
      const { data } = await db.from('profiles').select('name, strikes, suspect, banned').eq('id', id).maybeSingle();
      return (data as Profile | null) ?? null;
    },
    async barred(id) {
      const { data, error } = await db.rpc('barred_for', { uid: id });
      if (error) throw error;
      return (data as { strikes: number; banned: boolean; suspect?: boolean } | null) ?? null;
    },
    async saved(id) {
      const { data } = await db.from('saves')
        .select('latest, verified, verified_at, last_sync, day_state, day_at, week_state, week_at').eq('user_id', id).maybeSingle();
      if (!data) return null;
      const anchor = (state: unknown, at: string | null) => (state && at ? { state, at: sec(at)! } : null);
      return {
        latest: data.latest, verified: data.verified, verifiedAt: sec(data.verified_at), lastSync: sec(data.last_sync)!,
        day: anchor(data.day_state, data.day_at), week: anchor(data.week_state, data.week_at),
      };
    },
    async standing(id) {
      const { data } = await db.from('standings').select('*').eq('user_id', id).maybeSingle();
      if (!data) return null;
      return {
        climb: data.climb, marks: data.marks, tower: data.tower,
        climbedAt: sec(data.climbed_at)!, towerAt: sec(data.tower_at)!,
        week: data.week, weekFrom: data.week_from, calling: data.calling ?? null,
      };
    },
    async writeProfile(id, p) {
      const { error } = await db.from('profiles').upsert({ id, ...p });
      if (error) throw error;
    },
    async writeSaved(id, s: Saved) {
      const { error } = await db.from('saves').upsert({
        user_id: id, latest: s.latest, latest_at: iso(s.lastSync), verified: s.verified,
        verified_at: s.verifiedAt === null ? null : iso(s.verifiedAt), last_sync: iso(s.lastSync),
        day_state: s.day?.state ?? null, day_at: s.day ? iso(s.day.at) : null,
        week_state: s.week?.state ?? null, week_at: s.week ? iso(s.week.at) : null,
      });
      if (error) throw error;
    },
    async writeStanding(id, s: Standing) {
      const { error } = await db.from('standings').upsert({
        user_id: id, climb: s.climb, marks: s.marks, tower: s.tower,
        climbed_at: iso(s.climbedAt), tower_at: iso(s.towerAt), week: s.week, week_from: s.weekFrom,
        calling: s.calling ?? null,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    async log(id, v, now) {
      await db.from('sync_log').insert({
        user_id: id, at: iso(now), ok: v?.ok ?? false, why: v?.why ?? [], pace: v?.pace ?? null,
        strike: v?.strike ?? false, suspect: v?.suspect ?? false,
      });
    },
    async closeWeek(week) { await db.rpc('close_week', { w: week }); },
    async lastClosed() {
      const { data } = await db.from('meta').select('value').eq('key', 'closed_week').maybeSingle();
      return data?.value ?? 0;
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method' });

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who } = await db.auth.getUser(jwt);
  if (!who?.user) return json(401, { error: 'signed-out' });
  const id = who.user.id;

  let body: { action?: string; save?: unknown; name?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'bad-json' }); }

  // 取 The cloud copy, for a cultivator arriving on a new device.
  if (body.action === 'pull') {
    const { data } = await db.from('saves').select('latest, latest_at').eq('user_id', id).maybeSingle();
    return json(200, { save: data?.latest ?? null, at: data?.latest_at ?? null });
  }

  try {
    // 初 When the account was made, by the server's own record: a first sync may not claim
    // more than a few days of play from before it (see PRE_JOIN_CREDIT in sim/verify.ts).
    const joined = Math.floor(Date.parse(who.user.created_at) / 1000);
    const now = Math.floor(Date.now() / 1000);
    const r = await sync(store(), id, body.save, now, body.name, Number.isFinite(joined) ? joined : now);
    return json(r.status, r.body);
  } catch (e) {
    console.error(e);
    return json(500, { error: 'server' });
  }
});
