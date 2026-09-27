/**
 * 驗 tools/discord.mjs, proved against a fake Discord before it touches the real one.
 *
 * The workflow runs this first. It stands up an in-memory copy of the handful of API
 * routes the setup uses, with a rate limit thrown in on the first write, and checks:
 *
 *   1. With no token, nothing is called and the plan is printed.
 *   2. A first run on an empty server makes every role, category, channel and message.
 *   3. A second run changes nothing at all: no made, posted, edited or corrected.
 *   4. A channel Bruno made by hand, and one whose topic drifted, are left and fixed.
 *   5. Where a forum is refused (no Community), the channel is made as text instead.
 *
 * A setup that only works once is worse than none: the second run is the one that would
 * post the welcome twice in front of every tester.
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SPEC = JSON.parse(readFileSync(new URL('./discord/server.json', import.meta.url), 'utf8'));
const GUILD = '900', OWNER = '42', BOT = '7';
let next = 1000;
const id = () => String(next++);

function fakeDiscord({ communityOk = true } = {}) {
  const state = {
    guild: { id: GUILD, name: 'My server', owner_id: OWNER, features: [], verification_level: 0 },
    invites: [],
    roles: [{ id: GUILD, name: '@everyone', color: 0, hoist: false }],
    members: { [OWNER]: { roles: [] } },
    channels: [],
    messages: {},
    calls: [],
    limited: false,
  };
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      const body = raw ? JSON.parse(raw) : undefined;
      const url = new URL(req.url, 'http://x');
      const path = url.pathname.replace(/^\/api/, '');
      const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(data === undefined ? '' : JSON.stringify(data)); };
      state.calls.push(`${req.method} ${path}`);
      if (req.headers.authorization !== 'Bot test-token') return send(401, { message: 'no' });
      // 慢 One rate limit, on the first write, to prove the retry.
      if (req.method !== 'GET' && !state.limited) { state.limited = true; return send(429, { retry_after: 0.05 }); }
      let m;
      if (path === '/users/@me') return send(200, { id: BOT, username: 'ninefold-bot' });
      if (path === `/guilds/${GUILD}` && req.method === 'GET') return send(200, state.guild);
      if (path === `/guilds/${GUILD}` && req.method === 'PATCH') {
        // 社 Like Discord: Community needs a rules channel, a notices channel and settings.
        if (body.features?.includes('COMMUNITY')) {
          if (!communityOk) return send(403, { code: 50013, message: 'Missing Permissions' });
          if (!body.rules_channel_id || !body.public_updates_channel_id || body.verification_level < 1 || body.explicit_content_filter !== 2) {
            return send(400, { message: 'community requirements not met' });
          }
        }
        Object.assign(state.guild, body); return send(200, state.guild);
      }
      if (path === `/guilds/${GUILD}/roles` && req.method === 'GET') return send(200, state.roles);
      if (path === `/guilds/${GUILD}/roles` && req.method === 'POST') { const r = { id: id(), ...body }; state.roles.push(r); return send(200, r); }
      if ((m = path.match(/^\/guilds\/\d+\/roles\/(\d+)$/)) && req.method === 'PATCH') { const r = state.roles.find((x) => x.id === m[1]); Object.assign(r, body); return send(200, r); }
      if ((m = path.match(/^\/guilds\/\d+\/members\/(\d+)$/))) return send(200, state.members[m[1]]);
      if ((m = path.match(/^\/guilds\/\d+\/members\/(\d+)\/roles\/(\d+)$/))) { state.members[m[1]].roles.push(m[2]); return send(204); }
      if (path === `/guilds/${GUILD}/channels` && req.method === 'GET') return send(200, state.channels);
      if (path === `/guilds/${GUILD}/channels` && req.method === 'POST') {
        if (body.type === 15 && !state.guild.features.includes('COMMUNITY')) return send(400, { code: 50024, message: 'Cannot execute action on this channel type' });
        const c = { id: id(), topic: null, permission_overwrites: [], available_tags: [], ...body };
        c.available_tags = (c.available_tags ?? []).map((t) => ({ id: id(), ...t }));
        state.channels.push(c); state.messages[c.id] = []; return send(200, c);
      }
      if ((m = path.match(/^\/channels\/(\d+)$/)) && req.method === 'PATCH') {
        const c = state.channels.find((x) => x.id === m[1]); Object.assign(c, body); return send(200, c);
      }
      if ((m = path.match(/^\/channels\/(\d+)\/pins$/))) return send(200, state.messages[m[1]].filter((x) => x.pinned));
      if ((m = path.match(/^\/channels\/(\d+)\/messages$/)) && req.method === 'GET') return send(200, [...state.messages[m[1]]].reverse().slice(0, 50));
      if ((m = path.match(/^\/channels\/(\d+)\/messages$/)) && req.method === 'POST') {
        const msg = { id: id(), author: { id: BOT }, pinned: false, embeds: body.embeds.map((e) => ({ ...e })) };
        state.messages[m[1]].push(msg); return send(200, msg);
      }
      if ((m = path.match(/^\/channels\/(\d+)\/messages\/(\d+)$/)) && req.method === 'PATCH') {
        const msg = state.messages[m[1]].find((x) => x.id === m[2]); msg.embeds = body.embeds; return send(200, msg);
      }
      if ((m = path.match(/^\/channels\/(\d+)\/pins\/(\d+)$/))) { state.messages[m[1]].find((x) => x.id === m[2]).pinned = true; return send(204); }
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
  // The setup is run as its own process, exactly as the workflow runs it. Asynchronously:
  // the fake answers from this process, and a blocking spawn would never let it.
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [new URL('./discord.mjs', import.meta.url).pathname], {
      env: { ...process.env, DISCORD_API: `http://127.0.0.1:${port}/api`, DISCORD_ICON: '', ...env },
    });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { child.kill(); reject(new Error(`setup hung:\n${out}\n${err}`)); }, 30_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`setup failed:\n${out}\n${err}`)); else resolve(out);
    });
  });
}

const changes = (out) => out.split('\n').filter((l) => /\b(made|posted|edited|corrected|given|set)\b/.test(l));
let failed = 0;
const check = (ok, what) => { console.log(`${ok ? '✓' : '✗'} ${what}`); if (!ok) failed++; };

async function scenario(opts) {
  const { server, state } = fakeDiscord(opts);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const env = { DISCORD_BOT_TOKEN: 'test-token', DISCORD_GUILD_ID: GUILD };
  try { return await opts.body(port, env, state); } finally { server.close(); }
}

// 1. No token: the plan, and not one call.
await scenario({ body: async (port, _env, state) => {
  const out = await runSetup(port, { DISCORD_BOT_TOKEN: '', DISCORD_GUILD_ID: '' });
  check(state.calls.length === 0 && /nothing was touched/.test(out), 'with no token, nothing is called and the plan is printed');
} });

// 2, 3 and 4.
await scenario({ body: async (port, env, state) => {
  // 手 A channel Bruno made by hand before the bot ever ran.
  state.channels.push({ id: id(), name: 'música', type: 0, topic: 'playlists', permission_overwrites: [] });
  const first = await runSetup(port, env);
  const wanted = SPEC.categories.reduce((n, c) => n + c.channels.length, 0);
  const made = state.channels.filter((c) => c.type !== 4 && c.name !== 'música').length;
  check(made === wanted, `first run makes all ${wanted} channels (made ${made})`);
  check(state.channels.filter((c) => c.type === 4).length === SPEC.categories.length, 'and every category');
  check(state.roles.length === SPEC.roles.length + 1, 'and every role');
  check(state.members[OWNER].roles.length === 1, 'and gives the owner the master role');
  check(state.guild.name === SPEC.name, 'and names the server');
  const posted = Object.values(state.messages).flat();
  check(posted.length === SPEC.messages.length && posted.every((m) => m.pinned === !!SPEC.messages.find((s) => s.title === m.embeds[0].title).pin),
    `and posts and pins the ${SPEC.messages.length} messages`);
  check(state.limited, 'and survives a rate limit on the way');
  const forums = state.channels.filter((c) => c.type === 15);
  check(forums.length === 2 && forums.every((f) => f.available_tags.length > 0), 'the two forums carry their tags');
  const readOnly = state.channels.filter((c) => c.permission_overwrites?.some((o) => o.id === GUILD && BigInt(o.deny) & (1n << 11n)));
  const wantRO = SPEC.categories.flatMap((c) => c.channels).filter((c) => c.readOnly).length;
  check(readOnly.length === wantRO, `the ${wantRO} read-only channels are read-only for @everyone`);
  const priv = state.channels.filter((c) => c.permission_overwrites?.some((o) => o.id === GUILD && BigInt(o.deny) & (1n << 10n)));
  check(priv.length === 1 && priv[0].name.endsWith('team'), 'the team channel is hidden from @everyone');
  check(state.guild.features.includes('COMMUNITY') && state.guild.rules_channel_id && state.guild.public_updates_channel_id === priv[0].id,
    'Community is switched on, with the rules and the private team channel');
  check(forums.length === 2, 'and the forums are made after it, as forums');
  const inviteLine = first.split('\n').find((l) => l.startsWith('Invite: https://discord.gg/'));
  check(!!inviteLine && state.invites.length === 1 && state.invites[0].max_age === 0, 'one permanent invite is made and printed');
  check(posted.filter((m) => m.embeds[0].image?.url).length === SPEC.messages.filter((m) => m.image).length, 'the messages with a painting carry it');

  const second = await runSetup(port, env);
  check(changes(second).length === 0, `second run changes nothing${changes(second).length ? `: ${changes(second).join(' | ')}` : ''}`);
  check(Object.values(state.messages).flat().length === SPEC.messages.length, 'and posts nothing twice');
  check(state.invites.length === 1 && second.includes(inviteLine), 'and finds the same invite again');

  // 漂 A topic edited by hand drifts back, and nothing else moves.
  const bugs = state.channels.find((c) => c.name.endsWith('bugs'));
  bugs.topic = 'someone typed here';
  const third = await runSetup(port, env);
  check(changes(third).length === 1 && bugs.topic === SPEC.categories[1].channels[0].topic, 'a drifted topic is put back, and only that');
  check(state.channels.some((c) => c.name === 'música' && c.topic === 'playlists'), 'a channel made by hand is never touched');

  // 編 A message whose words changed in server.json is edited in place, never posted again.
  const edited = structuredClone(SPEC);
  edited.messages[0].body = [...edited.messages[0].body, 'Uma linha nova.'];
  const specPath = join(mkdtempSync(join(tmpdir(), 'discord-')), 'server.json');
  writeFileSync(specPath, JSON.stringify(edited));
  const fourth = await runSetup(port, { ...env, DISCORD_SPEC: specPath });
  const welcome = Object.values(state.messages).flat().find((m) => m.embeds[0].title === SPEC.messages[0].title);
  check(/edited/.test(fourth) && welcome.embeds[0].description.endsWith('Uma linha nova.')
    && Object.values(state.messages).flat().length === SPEC.messages.length, 'a message changed in server.json is edited in place, not posted again');
} });

// 5. Community refused (a bot without Manage Server): forums fall back to text.
await scenario({ communityOk: false, body: async (port, env, state) => {
  const out = await runSetup(port, env);
  const asText = state.channels.filter((c) => /bugs|ideas/.test(c.name));
  check(asText.length === 2 && asText.every((c) => c.type === 0 && /Tags:/.test(c.topic)), 'without Community the forums are made as text, tags in the topic');
  check(/Enable Community/.test(out), 'and the log says how to get the forums');
  const again = await runSetup(port, env);
  check(changes(again).length === 0, 'and a second run does not fight the text channels it made');
} });

if (failed) { console.error(`\n${failed} check(s) failed.`); process.exit(1); }
console.log('\n測 the setup makes the server once, and a second run changes nothing.');
