/**
 * 驗 tools/discord.mjs, proved against a fake Discord before it touches the real one.
 *
 * The fake enforces the rules the real server has already taught us, because the first
 * real run failed on two of them that the first fake did not know:
 *
 *   - A channel that denies @everyone sending denies the bot too, unless the channel lets
 *     the bot (or a role it has) back in. The welcome post was refused with a 403.
 *   - Only an Administrator may switch Community on. Refused with a 403.
 *
 * and the ones found in the documentation since: a bot can only move roles below its own,
 * AutoMod keeps one spam, one preset and one mention rule per server (Discord makes some
 * itself when Community goes on), a timeout needs Moderate Members, which the bot's invite
 * does not carry, and every onboarding answer has to hand out a role or a channel.
 *
 * and the ones Discord documents: announcement channels, the welcome screen and onboarding
 * exist only in a Community server, and onboarding wants at least seven default channels,
 * five of which anybody may write in.
 *
 * The scenarios:
 *   1. No token: nothing is called and the plan is printed.
 *   2. Bruno's server as the first real run left it, bot without Administrator: the posts
 *      go up, Community is refused with the fix in one line, and the run exits red.
 *   3. The same server once the bot is an Administrator: Community, announcement channels,
 *      welcome screen, onboarding, the roles in order and Discord's own AutoMod rule taken
 *      over, then a run that changes nothing.
 *   4. An empty server: everything made once, a second run changes nothing, drift is put
 *      back, a hand-made channel is left alone, an edited message is edited in place.
 *   5. Discord's own shared mention rule already in the list: never edited, the run green.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SPEC = JSON.parse(readFileSync(new URL('./discord/server.json', import.meta.url), 'utf8'));
const GUILD = '900', OWNER = '42', BOT = '7', BOT_ROLE = '8';
let next = 1000;
const id = () => String(next++);
const bit = (n) => 1n << BigInt(n);
const SEND = bit(11), VIEW = bit(10), MANAGE_GUILD = bit(5), MODERATE = bit(40);
const INVITED = 2251800082213937n;          // the permissions the bot's invite link asks for

function fakeDiscord({ admin = true } = {}) {
  const state = {
    admin,
    guild: { id: GUILD, name: 'My server', owner_id: OWNER, features: [], verification_level: 0, explicit_content_filter: 0,
             default_message_notifications: 0, system_channel_id: null, system_channel_flags: 0 },
    roles: [{ id: GUILD, name: '@everyone', color: 0, hoist: false, permissions: '1071698660929', position: 0 },
            { id: BOT_ROLE, name: 'Ninefold', color: 0, hoist: false, permissions: String(INVITED), managed: true, position: 1 }],
    members: { [OWNER]: { roles: [] }, [BOT]: { roles: [BOT_ROLE] } },
    channels: [], messages: {}, invites: [], welcome: null, onboarding: null, automod: [], threads: [], calls: [], limited: false,
  };
  // 序 A new role goes in just above @everyone, and everything above it moves up one.
  const addRole = (r) => { for (const x of state.roles) if (x.position >= 1) x.position++; const role = { permissions: '0', position: 1, ...r }; state.roles.push(role); return role; };
  const botMay = (b) => state.admin || !!(INVITED & b);
  state.addRole = addRole;
  const channel = (cid) => state.channels.find((x) => x.id === cid);
  // 讀 Whether the bot may write here: the channel's overwrites, as Discord reads them.
  const botMaySend = (c) => {
    if (state.admin) return true;
    const ow = c.permission_overwrites ?? [];
    const everyone = ow.find((o) => o.id === GUILD);
    const denied = everyone && BigInt(everyone.deny) & SEND;
    if (!denied) return true;
    return ow.some((o) => (o.id === BOT || o.id === BOT_ROLE) && BigInt(o.allow) & SEND);
  };
  const writable = (c) => { const e = (c.permission_overwrites ?? []).find((o) => o.id === GUILD); return !e || !(BigInt(e.deny) & (SEND | VIEW)); };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : undefined;
      const path = new URL(req.url, 'http://x').pathname.replace(/^\/api/, '');
      const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(data === undefined ? '' : JSON.stringify(data)); };
      const refuse = (code, message) => send(code, { message, code: code === 403 ? 50013 : 50035 });
      state.calls.push(`${req.method} ${path}`);
      if (req.headers.authorization !== 'Bot test-token') return refuse(401, 'no');
      // 慢 One rate limit, on the first write, to prove the retry.
      if (req.method !== 'GET' && !state.limited) { state.limited = true; return send(429, { retry_after: 0.05 }); }
      const community = state.guild.features.includes('COMMUNITY');
      let m;
      // 限 Discord's embed limits, which the real server answers with a bare 400.
      const bad = (embeds) => (embeds ?? []).some((e) => (e.title ?? '').length > 256 || (e.description ?? '').length > 4096
        || (e.fields ?? []).length > 25 || (e.fields ?? []).some((f) => f.name.length > 256 || f.value.length > 1024));
      if (/\/(messages|threads)(\/\d+)?$/.test(path) && req.method !== 'GET' && bad(body?.embeds ?? body?.message?.embeds)) return refuse(400, 'Invalid Form Body: embed over its limits');
      if (path === `/guilds/${GUILD}/threads/active`) return send(200, { threads: state.threads.filter((t) => !t.thread_metadata.archived) });
      if ((m = path.match(/^\/channels\/(\d+)\/threads\/archived\/public$/))) return send(200, { threads: state.threads.filter((t) => t.parent_id === m[1] && t.thread_metadata.archived), has_more: false });
      if ((m = path.match(/^\/channels\/(\d+)\/threads$/)) && req.method === 'POST') {
        const forum = channel(m[1]);
        if (!forum || forum.type !== 15) return refuse(400, 'not a forum');
        if (!community) return refuse(400, 'forums need Community');
        if (!body.name || body.name.length > 100) return refuse(400, 'a thread name is 1 to 100 characters');
        const t = { id: id(), parent_id: m[1], name: body.name, flags: 0, applied_tags: body.applied_tags ?? [], thread_metadata: { archived: false } };
        state.threads.push(t);
        state.messages[t.id] = [{ id: t.id, author: { id: BOT }, pinned: false, embeds: JSON.parse(JSON.stringify(body.message.embeds)) }];
        return send(201, t);
      }
      if ((m = path.match(/^\/channels\/(\d+)\/messages\/(\d+)$/)) && req.method === 'GET') {
        const msg = (state.messages[m[1]] ?? []).find((x) => x.id === m[2]);
        return msg ? send(200, msg) : refuse(404, 'Unknown Message');
      }
      if ((m = path.match(/^\/channels\/(\d+)$/)) && req.method === 'PATCH' && state.threads.some((t) => t.id === m[1])) {
        const t = state.threads.find((x) => x.id === m[1]);
        if (body.archived !== undefined) t.thread_metadata.archived = body.archived;
        if (body.flags !== undefined) {
          if ((body.flags & 2) && state.threads.some((o) => o !== t && o.parent_id === t.parent_id && (o.flags & 2))) return refuse(400, 'a forum pins one post');
          t.flags = body.flags;
        }
        return send(200, t);
      }
      if ((m = path.match(/^\/channels\/(\d+)\/messages\/(\d+)$/)) && req.method === 'PATCH' && state.threads.some((t) => t.id === m[1] && t.thread_metadata.archived)) {
        return refuse(400, 'Thread is archived');
      }
      if (path === '/users/@me') return send(200, { id: BOT, username: 'Ninefold' });
      if (path === `/guilds/${GUILD}` && req.method === 'GET') return send(200, state.guild);
      if (path === `/guilds/${GUILD}` && req.method === 'PATCH') {
        if (body.features?.includes('COMMUNITY') && !community) {
          if (!state.admin) return refuse(403, 'Missing Permissions');
          if (!body.rules_channel_id || !body.public_updates_channel_id || body.verification_level < 1 || body.explicit_content_filter !== 2) return refuse(400, 'community requirements');
        }
        if (body.description !== undefined && !community && !body.features?.includes('COMMUNITY')) return refuse(400, 'description needs Community');
        Object.assign(state.guild, body); return send(200, state.guild);
      }
      if (path === `/guilds/${GUILD}/roles` && req.method === 'GET') return send(200, state.roles);
      if (path === `/guilds/${GUILD}/roles` && req.method === 'POST') return send(200, addRole({ id: id(), ...body }));
      if (path === `/guilds/${GUILD}/roles` && req.method === 'PATCH') {
        const top = state.roles.find((x) => x.id === BOT_ROLE).position;
        if (body.some((b) => b.position >= top || state.roles.find((x) => x.id === b.id).position >= top)) return refuse(403, 'Missing Permissions');
        for (const b of body) state.roles.find((x) => x.id === b.id).position = b.position;
        return send(200, state.roles);
      }
      if ((m = path.match(/^\/guilds\/\d+\/roles\/(\d+)$/)) && req.method === 'PATCH') { const r = state.roles.find((x) => x.id === m[1]); Object.assign(r, body); return send(200, r); }
      if ((m = path.match(/^\/guilds\/\d+\/members\/(\d+)$/))) return send(200, state.members[m[1]]);
      if ((m = path.match(/^\/guilds\/\d+\/members\/(\d+)\/roles\/(\d+)$/))) { state.members[m[1]].roles.push(m[2]); return send(204); }
      if (path === `/guilds/${GUILD}/channels` && req.method === 'GET') return send(200, state.channels);
      if (path === `/guilds/${GUILD}/channels` && req.method === 'POST') {
        if (body.type === 5 && !community) return refuse(400, 'announcement channels need Community');
        const c = { id: id(), topic: null, permission_overwrites: [], rate_limit_per_user: 0, ...body };
        c.available_tags = (c.available_tags ?? []).map((t) => ({ id: id(), ...t }));
        state.channels.push(c); state.messages[c.id] = []; return send(200, c);
      }
      if ((m = path.match(/^\/channels\/(\d+)$/)) && req.method === 'PATCH') {
        if (body.type === 5 && !community) return refuse(400, 'announcement channels need Community');
        const c = channel(m[1]); Object.assign(c, body); return send(200, c);
      }
      if ((m = path.match(/^\/channels\/(\d+)\/pins$/))) return send(200, state.messages[m[1]].filter((x) => x.pinned));
      if ((m = path.match(/^\/channels\/(\d+)\/messages$/)) && req.method === 'GET') return send(200, [...state.messages[m[1]]].reverse().slice(0, 50));
      if ((m = path.match(/^\/channels\/(\d+)\/messages$/)) && req.method === 'POST') {
        if (!botMaySend(channel(m[1]))) return refuse(403, 'Missing Permissions');
        const msg = { id: id(), author: { id: BOT }, pinned: false, embeds: body.embeds.map((e) => JSON.parse(JSON.stringify(e))) };
        state.messages[m[1]].push(msg); return send(200, msg);
      }
      if ((m = path.match(/^\/channels\/(\d+)\/messages\/(\d+)$/)) && req.method === 'PATCH') {
        const msg = state.messages[m[1]].find((x) => x.id === m[2]); msg.embeds = JSON.parse(JSON.stringify(body.embeds)); return send(200, msg);
      }
      if ((m = path.match(/^\/channels\/(\d+)\/pins\/(\d+)$/))) { state.messages[m[1]].find((x) => x.id === m[2]).pinned = true; return send(204); }
      if (path === `/guilds/${GUILD}/welcome-screen`) {
        if (!community) return refuse(400, 'welcome screen needs Community');
        if (req.method === 'GET') return state.welcome ? send(200, state.welcome) : refuse(404, 'none');
        state.welcome = { description: body.description, welcome_channels: body.welcome_channels };
        if (body.enabled) state.guild.features = [...new Set([...state.guild.features, 'WELCOME_SCREEN_ENABLED'])];
        return send(200, state.welcome);
      }
      if (path === `/guilds/${GUILD}/onboarding`) {
        if (!community) return refuse(400, 'onboarding needs Community');
        if (req.method === 'GET') return send(200, state.onboarding ?? { enabled: false, prompts: [] });
        const defaults = body.default_channel_ids.map(channel);
        if (defaults.length < 7 || defaults.filter(writable).length < 5) return refuse(400, 'onboarding needs 7 default channels, 5 writable');
        const options = body.prompts.flatMap((p) => p.options);
        if (options.some((o) => !o.role_ids.length && !o.channel_ids.length)) return refuse(400, 'every answer needs a role or a channel');
        if (new Set([...body.prompts, ...options].map((x) => x.id)).size !== body.prompts.length + options.length) return refuse(400, 'ids must be unique');
        state.onboarding = body; return send(200, body);
      }
      if (path === `/guilds/${GUILD}/auto-moderation/rules` || path.startsWith(`/guilds/${GUILD}/auto-moderation/rules/`)) {
        if (req.method === 'GET') return send(200, state.automod);
        if (!botMay(MANAGE_GUILD)) return refuse(403, 'Missing Permissions');
        const rule = req.method === 'POST' ? { id: id(), trigger_type: body.trigger_type } : state.automod.find((r) => path.endsWith(`/${r.id}`));
        if (!rule || rule.system) return send(404, { message: '404: Not Found', code: 0 });
        if (req.method === 'PATCH' && body.trigger_type !== undefined) return refuse(400, 'trigger_type cannot change');
        const t = rule.trigger_type;
        if (req.method === 'POST' && [3, 4, 5].includes(t) && state.automod.some((r) => r.trigger_type === t)) return refuse(400, 'Maximum number of rules of this trigger type reached');
        for (const a of body.actions ?? []) {
          if (a.type === 3 && ![1, 5].includes(t)) return refuse(400, 'a timeout is only for keyword and mention rules');
          if (a.type === 3 && !botMay(MODERATE)) return refuse(403, 'Missing Permissions');
          if (a.type === 2 && !channel(a.metadata.channel_id)) return refuse(400, 'no such alert channel');
          if ((a.metadata?.custom_message ?? '').length > 150) return refuse(400, 'custom_message over 150');
        }
        if ((body.trigger_metadata?.regex_patterns ?? []).some((r) => r.length > 260)) return refuse(400, 'regex over 260');
        if (req.method === 'POST') state.automod.push(rule);
        Object.assign(rule, body);
        return send(200, rule);
      }
      if (path === `/guilds/${GUILD}/invites`) return send(200, state.invites);
      if ((m = path.match(/^\/channels\/(\d+)\/invites$/)) && req.method === 'POST') {
        const inv = { code: `code${id()}`, channel: { id: m[1] }, inviter: { id: BOT }, max_age: body.max_age, max_uses: body.max_uses };
        state.invites.push(inv); return send(200, inv);
      }
      return send(404, { message: `fake has no ${req.method} ${path}` });
    });
  });
  return { server, state };
}

function runSetup(port, env = {}) {
  // Its own process, exactly as the workflow runs it. Asynchronously: the fake answers from
  // this process, and a blocking spawn would never let it.
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [new URL('./discord.mjs', import.meta.url).pathname], {
      env: { ...process.env, DISCORD_API: `http://127.0.0.1:${port}/api`, DISCORD_ICON: '', ...env },
    });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { child.kill(); reject(new Error(`setup hung:\n${out}\n${err}`)); }, 30_000);
    child.on('close', (code) => { clearTimeout(timer); resolve({ out: out + err, code }); });
  });
}

const changes = (out) => out.split('\n').filter((l) => /\b(made|posted|edited|corrected|given|set|switched)\b/.test(l));
let failures = 0;
const check = (ok, what) => { console.log(`${ok ? '✓' : '✗'} ${what}`); if (!ok) failures++; };
const all = SPEC.categories.flatMap((c) => c.channels);

async function scenario(opts, body) {
  const { server, state } = fakeDiscord(opts);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const env = { DISCORD_BOT_TOKEN: 'test-token', DISCORD_GUILD_ID: GUILD };
  try { return await body(port, env, state); } finally { server.close(); }
}

// 1. No token.
await scenario({}, async (port, _env, state) => {
  const { out, code } = await runSetup(port, { DISCORD_BOT_TOKEN: '', DISCORD_GUILD_ID: '' });
  check(code === 0 && state.calls.length === 0 && /nothing was touched/.test(out), 'with no token, nothing is called and the plan is printed');
});

// 2 and 3. Bruno's server as the first real run (2026-09-27) left it.
await scenario({ admin: false }, async (port, env, state) => {
  const everyoneDeny = { id: GUILD, type: 0, allow: String(VIEW), deny: String(SEND) };
  const old = (name, type, extra = {}) => { const c = { id: id(), name, type, topic: 'old', permission_overwrites: [], ...extra }; state.channels.push(c); state.messages[c.id] = []; return c; };
  const cats = Object.fromEntries(SPEC.categories.map((c) => [c.name, old(c.name, 4)]));
  old('入門-welcome', 0, { parent_id: cats['九境 NINEFOLD'].id, permission_overwrites: [everyoneDeny] });
  old('告-announcements', 0, { parent_id: cats['九境 NINEFOLD'].id, permission_overwrites: [everyoneDeny] });
  old('報-bugs', 15, { parent_id: cats['測 PLAYTEST'].id, available_tags: [{ id: id(), name: 'Bug' }] });
  state.addRole({ id: id(), name: '師 Developer', color: 0xD4AF56, hoist: true });
  state.limited = true;

  const first = await runSetup(port, env);
  const welcome = state.channels.find((c) => c.name === '入門-welcome');
  check(welcome.permission_overwrites.some((o) => o.id === BOT && BigInt(o.allow) & SEND), 'the welcome channel now lets the bot write (the 403 of the first real run)');
  check(state.messages[welcome.id].length === SPEC.messages.filter((m) => m.channel === 'welcome').length, 'and the welcome posts go up');
  check(first.code === 1 && /Community: .*403.*Administrator/.test(first.out), 'Community is refused without Administrator, the fix in one line, and the run is red');
  check(state.channels.find((c) => c.name === '告-announcements').type === 0, 'announcements stay text until Community is on');
  check(state.channels.filter((c) => c.name === '報-bugs').length === 1, 'nothing made twice');

  state.admin = true;
  // 默 Switching Community on makes Discord add a mention-spam rule of its own.
  state.automod.push({ id: id(), name: 'Block Mention Spam', trigger_type: 5, event_type: 1, enabled: true,
    trigger_metadata: { mention_total_limit: 20 }, actions: [{ type: 1, metadata: {} }], exempt_roles: [], exempt_channels: [] });
  const second = await runSetup(port, env);
  check(second.code === 0 && state.guild.features.includes('COMMUNITY'), 'with Administrator, Community switches on');
  check(['告-announcements', '筆-dev-log'].every((n) => state.channels.find((c) => c.name === n)?.type === 5), 'and the announcement channels become announcement channels');
  check(state.welcome?.welcome_channels.length === SPEC.welcomeScreen.channels.length && state.guild.features.includes('WELCOME_SCREEN_ENABLED'), 'the welcome screen is set');
  const tester = state.roles.find((r) => r.name === '測 Tester');
  check(state.onboarding?.enabled && state.onboarding.prompts[0].options.some((o) => o.role_ids.includes(tester.id)), 'onboarding hands out 測 Tester');
  check(state.guild.default_message_notifications === 1 && state.guild.system_channel_id === state.channels.find((c) => c.name === '談-general').id, 'quiet notifications, joins in general');
  const devRole = state.roles.find((r) => r.name === '師 Developer');
  check(BigInt(devRole.permissions) & bit(17), 'the developer role keeps its permissions (it may ping @everyone)');
  check(!(BigInt(state.roles.find((r) => r.id === GUILD).permissions) & bit(17)), '@everyone may not ping @everyone');
  const order = SPEC.roles.map((r) => state.roles.find((x) => x.name === r.name)?.position);
  check(order.every((p, i) => i === 0 || p < order[i - 1]) && order[0] < state.roles.find((r) => r.id === BOT_ROLE).position,
    `the roles stand in order, developer first, all below the bot (${order.join(' > ')})`);
  const mentions = state.automod.filter((r) => r.trigger_type === 5);
  check(mentions.length === 1 && mentions[0].name === '守 Mass mentions' && state.automod.length === SPEC.automod.rules.length, "Discord's own mention rule is taken over, not doubled");
  check(state.onboarding.prompts.length === SPEC.onboarding.prompts.length && state.onboarding.prompts[0].required
    && state.onboarding.prompts.every((p) => p.options.every((o) => o.role_ids.length)), 'onboarding asks every question, the first one required, and every answer hands out a role');

  const third = await runSetup(port, env);
  check(third.code === 0 && changes(third.out).length === 0, `and then a run changes nothing${changes(third.out).length ? `: ${changes(third.out).join(' | ')}` : ''}`);
});

// 4. An empty server, bot an Administrator.
await scenario({}, async (port, env, state) => {
  state.channels.push({ id: id(), name: 'música', type: 0, topic: 'playlists', permission_overwrites: [] });
  const { out: first, code } = await runSetup(port, env);
  check(code === 0, 'an empty server is made without a single failed step');
  const made = state.channels.filter((c) => c.type !== 4 && c.name !== 'música');
  check(made.length === all.length, `every channel is made (${made.length} of ${all.length})`);
  check(state.roles.length === SPEC.roles.length + 2, 'and every role');
  check(state.members[OWNER].roles.length === 1, 'the owner is given the developer role');
  check(state.guild.name === SPEC.name && state.guild.description === SPEC.description, 'the server is named and described');
  const inThreads = new Set(state.threads.map((t) => t.id));
  const posted = Object.entries(state.messages).filter(([c]) => !inThreads.has(c)).flatMap(([, list]) => list);
  check(posted.length === SPEC.messages.length && posted.filter((m) => m.pinned).length === SPEC.messages.filter((m) => m.pin).length,
    `the ${SPEC.messages.length} posts go up, the ${SPEC.messages.filter((m) => m.pin).length} meant to be pinned pinned`);
  check(posted.every((m) => !/\{#\w+\}/.test(JSON.stringify(m.embeds))) && posted.some((m) => /<#\d+>/.test(m.embeds.find((e) => e.title).description)), 'channel names in the posts are real links');
  const words = (m) => m.embeds.find((e) => e.title);
  check(posted.filter((m) => words(m).image).length === SPEC.messages.filter((m) => m.image).length, 'the posts with a picture carry it');
  const bannered = (m) => m.embeds.length >= 2 && !m.embeds[0].title && m.embeds[0].image;
  check(posted.filter(bannered).length === SPEC.messages.filter((m) => m.banner).length
    && Object.values(state.messages).flat().filter(bannered).length === [...SPEC.messages, ...SPEC.posts].filter((m) => m.banner).length,
    'every post with a banner wears it on top, above its words');
  const all3 = [...SPEC.messages, ...SPEC.posts];
  check(Object.values(state.messages).flat().every((m) => {
    const spec = all3.find((x) => m.embeds.some((e) => e.title === x.title));
    const after = m.embeds.slice(m.embeds.findIndex((e) => e.title) + 1);
    return after.length === (spec.gallery ?? []).length && after.every((e, i) => e.image.url === spec.gallery[i]);
  }), 'and a gallery follows the words, one picture to an embed');
  check(state.limited, 'and a rate limit on the way is survived');
  const forums = state.channels.filter((c) => c.type === 15);
  const forumCount = all.filter((c) => c.type === 'forum').length;
  check(forums.length === forumCount && forums.every((f) => f.available_tags.every((t) => t.emoji_name)), `${forumCount} forums, every tag with its emoji`);
  check(state.channels.some((c) => c.type === 2), 'a voice lounge');
  const team = state.channels.find((c) => c.name.endsWith('team'));
  check(team.permission_overwrites.some((o) => o.id === GUILD && BigInt(o.deny) & VIEW) && team.permission_overwrites.length === 4, 'the team channel is hidden from everyone but developer, guardians and bot');
  const teamId = team.id;
  check(state.automod.length === SPEC.automod.rules.length && state.automod.every((r) => r.actions.some((a) => a.type === 2 && a.metadata.channel_id === teamId)),
    `${SPEC.automod.rules.length} AutoMod rules, every one reporting to the team channel`);
  const staff = ['師 Developer', '守 Guardian'].map((n) => state.roles.find((r) => r.name === n).id);
  const links = state.automod.find((r) => r.trigger_type === 1);
  check(staff.every((s) => links.exempt_roles.includes(s)) && links.trigger_metadata.regex_patterns.every((r) => new RegExp(r).test('join discord.gg/abc')) && !new RegExp(links.trigger_metadata.regex_patterns[0]).test('https://hyoddougamer-dev.github.io/ninefold/'),
    "the invite filter catches another server's invite, spares the game's own link, and never the staff");
  const guides = state.channels.find((c) => c.name === '書-guides');
  const posts = state.threads.filter((t) => t.parent_id === guides?.id);
  check(guides?.type === 15 && posts.length === SPEC.posts.length, `the guides forum holds all ${SPEC.posts.length} posts`);
  check(posts[posts.length - 1]?.name === SPEC.posts[0].title && posts[0]?.name === SPEC.posts[SPEC.posts.length - 1].title,
    'made last to first, so the forum reads top to bottom in server.json order');
  check(posts.filter((t) => t.flags & 2).length === 1 && posts.find((t) => t.flags & 2).name === SPEC.posts.find((p) => p.pin).title, 'the start-here post is the one pinned');
  check(posts.every((t) => t.applied_tags.length === 1), 'every post carries its tag');
  const everyoneThere = guides.permission_overwrites.find((o) => o.id === GUILD);
  check(everyoneThere && BigInt(everyoneThere.deny) & SEND && BigInt(everyoneThere.allow) & bit(38),
    'members cannot open a guide post, but can answer inside one');
  const inviteLine = first.split('\n').find((l) => l.startsWith('Invite: https://discord.gg/'));
  check(!!inviteLine && state.invites.length === 1, 'one permanent invite is made and printed');

  const again = await runSetup(port, env);
  check(again.code === 0 && changes(again.out).length === 0, `a second run changes nothing${changes(again.out).length ? `: ${changes(again.out).join(' | ')}` : ''}`);
  check(state.threads.length === SPEC.posts.length, 'no guide posted twice');
  // 眠 A week later every post has gone quiet and archived itself. Changing one wakes it.
  state.threads.forEach((t) => { t.thread_metadata.archived = true; });
  const woke = structuredClone(SPEC);
  woke.posts[3].body = [...woke.posts[3].body, 'A line added later.'];
  const wokePath = join(mkdtempSync(join(tmpdir(), 'discord-')), 'server.json');
  writeFileSync(wokePath, JSON.stringify(woke));
  const late = await runSetup(port, { ...env, DISCORD_SPEC: wokePath });
  const edited3 = state.messages[state.threads.find((t) => t.name === woke.posts[3].title).id][0];
  check(late.code === 0 && edited3.embeds.find((e) => e.title).description.endsWith('A line added later.') && state.threads.length === SPEC.posts.length,
    'an archived guide is found, woken and edited in place, not posted again');
  await runSetup(port, env);   // and back to server.json as it is, for what follows
  check(Object.values(state.messages).flat().length - SPEC.posts.length === SPEC.messages.length && state.invites.length === 1 && again.out.includes(inviteLine), 'posts nothing twice and finds the same invite');

  const bugs = state.channels.find((c) => c.name.endsWith('bugs'));
  bugs.topic = 'someone typed here';
  const drift = await runSetup(port, env);
  check(changes(drift.out).length === 1 && bugs.topic === all.find((c) => c.key === 'bugs').topic, 'a drifted topic is put back, and only that');
  check(state.channels.some((c) => c.name === 'música' && c.topic === 'playlists'), 'a channel made by hand is never touched');

  const edited = structuredClone(SPEC);
  edited.messages[0].body = [...edited.messages[0].body, 'One more line.'];
  edited.onboarding.prompts[1].options.push({ title: 'Somewhere else', emoji: '❔', description: 'Anything else.', roles: ['browser'] });
  const kept = state.onboarding.prompts.map((p) => [p.id, p.options.map((o) => o.id)]);
  const specPath = join(mkdtempSync(join(tmpdir(), 'discord-')), 'server.json');
  writeFileSync(specPath, JSON.stringify(edited));
  const fourth = await runSetup(port, { ...env, DISCORD_SPEC: specPath });
  const first0 = Object.values(state.messages).flat().find((m) => m.embeds.some((e) => e.title === SPEC.messages[0].title));
  check(/edited/.test(fourth.out) && first0.embeds.find((e) => e.title).description.endsWith('One more line.') && Object.values(state.messages).flat().length === SPEC.messages.length + SPEC.posts.length,
    'a post changed in server.json is edited in place, not posted again');
  check(state.onboarding.prompts[1].options.length === SPEC.onboarding.prompts[1].options.length + 1
    && kept.every(([pid, oids], i) => state.onboarding.prompts[i].id === pid && oids.every((o, j) => state.onboarding.prompts[i].options[j].id === o)),
    'a new onboarding answer is added and every question and answer keeps its id, so nobody loses what they picked');
});

// 5. Discord's own shared rule, as the real server showed it on 2026-09-28: a mention rule
// whose id is older than the server, which no bot may edit and which fills the one slot.
await scenario({}, async (port, env, state) => {
  state.automod.push({ id: '5', system: true, name: 'Block Mention Spam', trigger_type: 5, event_type: 1, enabled: true,
    trigger_metadata: { mention_total_limit: 20 }, actions: [{ type: 1, metadata: {} }], exempt_roles: [], exempt_channels: [] });
  const { out, code } = await runSetup(port, env);
  check(code === 0 && /Block Mention Spam" holds this slot/.test(out) && !/PATCH .*rules\/5/.test(state.calls.join('\n')),
    "Discord's own shared rule is never edited, it stands, and the run stays green");
  check(state.automod.length === SPEC.automod.rules.length, 'and every other rule is made beside it');
  const again = await runSetup(port, env);
  check(again.code === 0 && changes(again.out).length === 0, `and a second run changes nothing${changes(again.out).length ? `: ${changes(again.out).join(' | ')}` : ''}`);
});

if (failures) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log('\n測 the setup makes the server once, heals the one the first run left, and a second run changes nothing.');
