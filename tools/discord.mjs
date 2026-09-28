/**
 * 測 The Ninefold Discord server, made to match tools/discord/server.json.
 *
 * It runs in GitHub Actions (.github/workflows/discord.yml), never from the sandbox, for
 * the reason the ranked server does: the sandbox cannot reach discord.com, and a bot token
 * belongs in a GitHub secret, never in a chat or a file.
 *
 *   DISCORD_BOT_TOKEN  the bot's token (secret)
 *   DISCORD_GUILD_ID   the server's id (a repository variable, not a secret)
 *   DISCORD_ICON       optional path to a PNG for the server's icon
 *   DISCORD_API        optional, for the tests: where the API is
 *   DISCORD_SPEC       optional, for the tests: another server.json
 *
 * 冪 It is idempotent. Everything is found by name first and only made when it is missing,
 * what drifted is put back, and each message is found by its title and edited in place
 * rather than posted again. Running it twice changes nothing the second time, which
 * tools/discord-check.mjs proves against a fake that enforces Discord's own rules.
 *
 * 讓 It never deletes. A channel Bruno made by hand, or one this file no longer names,
 * is left exactly where it is.
 *
 * 續 One step failing does not stop the others. Each is tried, what failed is listed at the
 * end, and the run exits red if anything did, so a missing permission is read off the log
 * as one line instead of a half-made server.
 */
import { readFileSync, existsSync } from 'node:fs';

const API = process.env.DISCORD_API ?? 'https://discord.com/api/v10';
const TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const GUILD = process.env.DISCORD_GUILD_ID ?? '';
const ICON = process.env.DISCORD_ICON ?? '';
const SPEC = JSON.parse(readFileSync(process.env.DISCORD_SPEC || new URL('./discord/server.json', import.meta.url), 'utf8'));

// Permission bits, from the Discord documentation, by the names server.json uses.
const BIT = {
  INVITE: 0, KICK: 1, ADMIN: 3, MANAGE_CHANNELS: 4, MANAGE_GUILD: 5, REACT: 6, STREAM: 9, VIEW: 10,
  SEND: 11, MANAGE_MESSAGES: 13, EMBED: 14, ATTACH: 15, HISTORY: 16, MENTION_EVERYONE: 17,
  EXTERNAL_EMOJIS: 18, CONNECT: 20, SPEAK: 21, MUTE_MEMBERS: 22, MOVE_MEMBERS: 24, VAD: 25,
  CHANGE_NICKNAME: 26, MANAGE_NICKNAMES: 27, MANAGE_ROLES: 28, APP_COMMANDS: 31, MANAGE_THREADS: 34,
  THREADS: 35, EXTERNAL_STICKERS: 37, SEND_THREADS: 38, MODERATE_MEMBERS: 40, VOICE_MESSAGES: 46,
  POLLS: 49, PIN: 51,
};
const perms = (...names) => names.flat().reduce((a, n) => a | (1n << BigInt(BIT[n])), 0n);
const TYPE = { text: 0, voice: 2, category: 4, announcement: 5, forum: 15 };
const colour = (hex) => (hex ? parseInt(hex.slice(1), 16) : 0);
const said = [];
const failed = [];
const log = (line) => { said.push(line); console.log(line); };

async function call(method, path, body) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json',
                 'User-Agent': 'NinefoldSetup (https://github.com/hyoddougamer-dev/ninefold, 1)' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    // 慢 Rate limited: wait what Discord says and try again.
    if (res.status === 429) {
      const wait = Number((await res.json().catch(() => ({}))).retry_after ?? 1);
      await new Promise((r) => setTimeout(r, Math.ceil(wait * 1000) + 50));
      continue;
    }
    if (res.status === 204) return null;
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data)}`);
      err.status = res.status; err.data = data;
      throw err;
    }
    return data;
  }
  throw new Error(`${method} ${path}: still rate limited after six tries`);
}

/** 續 Try one step; on failure note it, say what to do, and carry on. */
async function step(what, fn, hint = '') {
  try { return await fn(); } catch (e) {
    failed.push(what);
    const detail = e.data ? `${e.status} ${e.data.message ?? ''} ${e.data.errors ? JSON.stringify(e.data.errors) : ''}` : e.message;
    log(`  ✗ ${what}: ${detail.trim()}${hint ? `. ${hint}` : ''}`);
    return undefined;
  }
}

const same = (a, b) => a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase();

function plan() {
  log(`Server: ${SPEC.name}`);
  for (const r of SPEC.roles) log(`  role ${r.name}${r.permissions ? ` (${r.permissions.join(', ')})` : ''}`);
  for (const c of SPEC.categories) {
    log(`  category ${c.name}`);
    for (const ch of c.channels) {
      const note = ch.readOnly ? '  (read-only)' : ch.private ? `  (only ${ch.private.join(', ')})` : '';
      log(`    ${ch.type.padEnd(12)} #${ch.name}${note}`);
    }
  }
  for (const m of SPEC.messages) log(`  message "${m.title}" in #${m.channel}${m.pin ? ', pinned' : ''}`);
  if (SPEC.community) log('  Community on, a welcome screen, and onboarding that hands out 測 Tester');
  for (const p of SPEC.onboarding?.prompts ?? []) log(`  onboarding asks "${p.title}" (${p.options.map((o) => o.title).join(', ')})`);
  for (const r of SPEC.automod?.rules ?? []) log(`  AutoMod: ${r.name}`);
  if (SPEC.invite) log('  one permanent invite, printed at the end');
}

async function run() {
  if (!TOKEN || !GUILD) {
    log('No DISCORD_BOT_TOKEN or DISCORD_GUILD_ID: here is what would be made, and nothing was touched.');
    plan();
    return { dry: true, said };
  }

  const me = await call('GET', '/users/@me');
  let guild = await call('GET', `/guilds/${GUILD}`);
  log(`Bot ${me.username} on "${guild.name}".`);

  // 名 The server's name and icon.
  const edit = {};
  if (guild.name !== SPEC.name) edit.name = SPEC.name;
  // 標 The icon is sent every run it is given: Discord hands back a hash, not the picture,
  // so there is nothing to compare. Leave DISCORD_ICON unset once the icon is right.
  if (ICON && existsSync(ICON)) edit.icon = `data:image/png;base64,${readFileSync(ICON).toString('base64')}`;
  if (Object.keys(edit).length) {
    await step('server name and icon', async () => { guild = await call('PATCH', `/guilds/${GUILD}`, edit); log(`  server ${Object.keys(edit).join(' and ')} set`); });
  }

  // 師 Roles: found by name, made if missing, colour and permissions put back, the owner
  // given the developer's role, and @everyone's own permissions set to the baseline.
  const roles = await call('GET', `/guilds/${GUILD}/roles`);
  const roleId = {};
  for (const r of SPEC.roles) {
    const want = { name: r.name, color: colour(r.color), hoist: !!r.hoist, mentionable: false };
    if (r.permissions) want.permissions = String(perms(r.permissions));
    let have = roles.find((x) => same(x.name, r.name));
    if (!have) {
      have = await step(`role ${r.name}`, async () => { const x = await call('POST', `/guilds/${GUILD}/roles`, want); log(`  role ${r.name} made`); return x; });
      if (!have) continue;
    } else if (have.color !== want.color || have.hoist !== want.hoist || (want.permissions && have.permissions !== want.permissions)) {
      await step(`role ${r.name}`, async () => { await call('PATCH', `/guilds/${GUILD}/roles/${have.id}`, want); log(`  role ${r.name} corrected`); });
    }
    roleId[r.key] = have.id;
    if (r.owner && guild.owner_id) {
      await step(`${r.name} for the owner`, async () => {
        const member = await call('GET', `/guilds/${GUILD}/members/${guild.owner_id}`);
        if (!member.roles.includes(have.id)) {
          await call('PUT', `/guilds/${GUILD}/members/${guild.owner_id}/roles/${have.id}`);
          log(`  ${r.name} given to the owner`);
        }
      });
    }
  }
  // 序 The roles stand in server.json's order, top first, in the slots they already hold:
  // hoisted roles are listed in that order, and a guardian can only time out a role below.
  await step('role order', async () => {
    const now = await call('GET', `/guilds/${GUILD}/roles`);
    const ours = SPEC.roles.map((r) => now.find((x) => x.id === roleId[r.key])).filter(Boolean);
    const slots = ours.map((x) => x.position).sort((a, b) => b - a);
    if (ours.some((x, i) => x.position !== slots[i])) {
      await call('PATCH', `/guilds/${GUILD}/roles`, ours.map((x, i) => ({ id: x.id, position: slots[i] })));
      log('  roles put in order');
    }
  });
  if (SPEC.everyone) {
    const base = roles.find((x) => x.id === GUILD);
    const want = String(perms(SPEC.everyone));
    if (base && base.permissions !== want) {
      await step('@everyone permissions', async () => { await call('PATCH', `/guilds/${GUILD}/roles/${GUILD}`, { permissions: want }); log('  @everyone permissions set (no @everyone pings, no managing)'); });
    }
  }

  // 頻 Categories and channels, in two passes: everything that needs no Community first, so
  // the rules and the team channel exist when it is switched on, then what needs it.
  let channels = await call('GET', `/guilds/${GUILD}/channels`);
  const everyone = GUILD;               // @everyone's role id is the guild's id
  const bot = { id: me.id, type: 1, allow: String(perms('VIEW', 'SEND', 'EMBED', 'ATTACH', 'HISTORY', 'MANAGE_MESSAGES', 'PIN')), deny: '0' };
  const master = roleId.master ? [{ id: roleId.master, type: 0, allow: String(perms('VIEW', 'SEND', 'EMBED', 'ATTACH')), deny: '0' }] : [];
  // 讀 Read-only: everybody reads and reacts; the developer and this bot write. The bot's
  // own line is what the first real run was missing: @everyone's deny applied to it too.
  const readOnly = [{ id: everyone, type: 0, allow: String(perms('VIEW', 'HISTORY', 'REACT')), deny: String(perms('SEND', 'THREADS', 'SEND_THREADS')) }, ...master, bot];
  const hiddenFor = (keys) => [{ id: everyone, type: 0, allow: '0', deny: String(perms('VIEW')) },
    ...keys.filter((k) => roleId[k]).map((k) => ({ id: roleId[k], type: 0, allow: String(perms('VIEW', 'SEND', 'EMBED', 'ATTACH', 'HISTORY')), deny: '0' })), bot];
  const overwritesOf = (ch) => (ch.private ? hiddenFor(ch.private) : ch.readOnly ? readOnly : null);
  const community = () => (guild.features ?? []).includes('COMMUNITY');
  const channelId = {};
  const parentId = {};
  let position = 0;
  for (const cat of SPEC.categories) {
    let parent = channels.find((x) => x.type === TYPE.category && same(x.name, cat.name));
    if (!parent) {
      parent = await step(`category ${cat.name}`, async () => { const x = await call('POST', `/guilds/${GUILD}/channels`, { name: cat.name, type: TYPE.category, position: position++ }); log(`  category ${cat.name} made`); return x; });
    }
    if (parent) parentId[cat.name] = parent.id;
  }

  const ensure = async (cat, ch) => {
    const parent = parentId[cat.name];
    const overwrites = overwritesOf(ch);
    // 降 An announcement channel is a Community feature; without it the channel is text.
    const type = ch.type === 'announcement' && !community() ? 'text' : ch.type;
    let have = channels.find((x) => x.type !== TYPE.category && same(x.name, ch.name));
    if (!have) {
      const body = { name: ch.name, parent_id: parent, type: TYPE[type] };
      if (ch.topic && type !== 'voice') body.topic = ch.topic;
      if (overwrites) body.permission_overwrites = overwrites;
      if (ch.slowmode) body.rate_limit_per_user = ch.slowmode;
      if (type === 'forum') body.available_tags = ch.tags.map(([name, emoji]) => ({ name, emoji_name: emoji }));
      have = await step(`#${ch.name}`, async () => {
        try {
          const x = await call('POST', `/guilds/${GUILD}/channels`, body); log(`  #${ch.name} made (${type})`); return x;
        } catch (e) {
          // 論 A forum refused: a text channel, the tags in the topic, and how to fix it.
          if (type !== 'forum') throw e;
          const x = await call('POST', `/guilds/${GUILD}/channels`, { name: ch.name, parent_id: parent, type: TYPE.text,
            topic: `${ch.topic} Tags: ${ch.tags.map((t) => t[0]).join(', ')}.`, permission_overwrites: overwrites ?? undefined });
          log(`  #${ch.name} made as text: Discord refused a forum. Give the bot Administrator, delete #${ch.name}, and run this again`);
          return x;
        }
      });
      if (!have) return;
      channels = [...channels, have];
    } else {
      const fix = {};
      // 升 A text channel that should announce becomes one once Community allows it.
      if (have.type === TYPE.text && type === 'announcement') fix.type = TYPE.announcement;
      const wantTopic = have.type === TYPE.text && type === 'forum' ? null : ch.topic;
      if (wantTopic && type !== 'voice' && (have.topic ?? '') !== wantTopic) fix.topic = wantTopic;
      if (have.parent_id !== parent) fix.parent_id = parent;
      if (type !== 'voice' && (ch.slowmode ?? 0) !== (have.rate_limit_per_user ?? 0)) fix.rate_limit_per_user = ch.slowmode ?? 0;
      // 權 Permissions are only this file's business on a read-only or private channel.
      // Anywhere else they are left to Bruno, so a change made by hand is never undone.
      const sig = (list) => JSON.stringify(list.map((o) => `${o.id}:${o.allow}:${o.deny}`).sort());
      if (overwrites && sig(have.permission_overwrites ?? []) !== sig(overwrites)) fix.permission_overwrites = overwrites;
      if (have.type === TYPE.forum && type === 'forum') {
        const names = (have.available_tags ?? []).map((t) => t.name);
        const missing = ch.tags.filter(([t]) => !names.includes(t));
        if (missing.length) fix.available_tags = [...(have.available_tags ?? []), ...missing.map(([name, emoji]) => ({ name, emoji_name: emoji }))];
      }
      if (Object.keys(fix).length) {
        await step(`#${ch.name}`, async () => {
          const x = await call('PATCH', `/channels/${have.id}`, fix);
          Object.assign(have, x ?? fix);
          log(`  #${ch.name} corrected (${Object.keys(fix).join(', ')})`);
        });
      }
    }
    channelId[ch.key] = have.id;
  };
  for (const cat of SPEC.categories) for (const ch of cat.channels) if (ch.type !== 'forum') await ensure(cat, ch);

  // 社 Community: forums, announcement channels, a welcome screen and onboarding. Discord
  // lets only an Administrator switch it on, and asks for a rules channel, a channel for its
  // own notices (the private team one), verified email and media scanned for everyone.
  if (SPEC.community && !community()) {
    await step('Community', async () => {
      guild = await call('PATCH', `/guilds/${GUILD}`, {
        features: [...(guild.features ?? []), 'COMMUNITY'],
        rules_channel_id: channelId[SPEC.community.rules],
        public_updates_channel_id: channelId[SPEC.community.updates],
        verification_level: Math.max(1, guild.verification_level ?? 0),
        explicit_content_filter: 2,
      });
      log('  Community switched on');
    }, 'Only an Administrator can switch it on: Server Settings → Roles → the bot\'s role → Administrator, then run this again');
    // Now that it is on, the announcement channels made as text become announcement ones.
    if (community()) for (const cat of SPEC.categories) for (const ch of cat.channels) if (ch.type === 'announcement') await ensure(cat, ch);
  }
  for (const cat of SPEC.categories) for (const ch of cat.channels) if (ch.type === 'forum') await ensure(cat, ch);

  // 設 Quiet defaults: only mentions notify, join messages in general, no boost nagging.
  if (SPEC.settings) {
    const want = { default_message_notifications: 1, verification_level: Math.max(1, guild.verification_level ?? 0),
      explicit_content_filter: 2, system_channel_id: channelId[SPEC.settings.system] ?? null, system_channel_flags: (1 << 1) | (1 << 2) };
    if (community() && SPEC.description) want.description = SPEC.description;
    const diff = Object.fromEntries(Object.entries(want).filter(([k, v]) => (guild[k] ?? null) !== v));
    if (Object.keys(diff).length) {
      await step('server settings', async () => { guild = await call('PATCH', `/guilds/${GUILD}`, diff); log(`  settings set (${Object.keys(diff).join(', ')})`); });
    }
  }

  // 迎 The welcome screen a new member sees before the first channel.
  if (SPEC.welcomeScreen && community()) {
    const want = { enabled: true, description: SPEC.welcomeScreen.description,
      welcome_channels: SPEC.welcomeScreen.channels.filter((w) => channelId[w.channel])
        .map((w) => ({ channel_id: channelId[w.channel], description: w.description, emoji_id: null, emoji_name: w.emoji })) };
    await step('welcome screen', async () => {
      const have = await call('GET', `/guilds/${GUILD}/welcome-screen`).catch(() => null);
      const key = (s) => JSON.stringify({ d: s?.description ?? '', c: (s?.welcome_channels ?? []).map((w) => [w.channel_id, w.description, w.emoji_name]) });
      if (!have || key(have) !== key(want) || !(guild.features ?? []).includes('WELCOME_SCREEN_ENABLED')) {
        await call('PATCH', `/guilds/${GUILD}/welcome-screen`, want); log('  welcome screen set');
        guild.features = [...new Set([...(guild.features ?? []), 'WELCOME_SCREEN_ENABLED'])];
      }
    });
  }

  // 導 Onboarding: the questions on the way in, which hand out the roles. A question or an
  // answer that is already there keeps its id, so what members picked is kept with it.
  if (SPEC.onboarding && community()) {
    await step('onboarding', async () => {
      const have = await call('GET', `/guilds/${GUILD}/onboarding`).catch(() => null);
      let n = 0;
      const snow = () => String(((BigInt(Date.now()) - 1420070400000n) << 22n) + BigInt(++n));
      const want = {
        enabled: true, mode: 0,
        default_channel_ids: SPEC.onboarding.defaults.map((k) => channelId[k]).filter(Boolean),
        prompts: SPEC.onboarding.prompts.map((p) => {
          const was = (have?.prompts ?? []).find((x) => x.title === p.title);
          return {
            id: was?.id ?? snow(), type: 0, title: p.title, single_select: !!p.single, required: !!p.required, in_onboarding: true,
            options: p.options.map((o) => ({ id: was?.options?.find((x) => x.title === o.title)?.id ?? snow(), title: o.title,
              description: o.description, emoji_name: o.emoji, role_ids: (o.roles ?? []).map((k) => roleId[k]).filter(Boolean), channel_ids: [] })),
          };
        }),
      };
      const key = (x) => JSON.stringify([[...(x?.default_channel_ids ?? [])].sort(), (x?.prompts ?? []).map((p) => [p.title, !!p.single_select, !!p.required,
        p.options.map((o) => [o.title, o.description ?? '', o.emoji?.name ?? o.emoji_name ?? '', [...(o.role_ids ?? [])].sort()])])]);
      if (have?.enabled && key(have) === key(want)) return;
      await call('PUT', `/guilds/${GUILD}/onboarding`, want);
      log('  onboarding set');
    });
  }

  // 守 AutoMod: Discord's own guardian, so nobody has to be awake for it. Spam, the preset
  // word lists and mention spam are one rule each per server, so one already there (Discord
  // makes some itself) is taken over and renamed; a keyword rule is found by its name.
  if (SPEC.automod) {
    const TRIGGER = { keyword: 1, spam: 3, preset: 4, mentions: 5 };
    const PRESET = { profanity: 1, sexual: 2, slurs: 3 };
    const have = await step('AutoMod rules', () => call('GET', `/guilds/${GUILD}/auto-moderation/rules`));
    const alerts = channelId[SPEC.automod.alerts];
    for (const rule of have ? SPEC.automod.rules : []) {
      const type = TRIGGER[rule.trigger];
      const meta = rule.trigger === 'keyword' ? { keyword_filter: rule.keywords ?? [], regex_patterns: rule.regex ?? [], allow_list: [] }
        : rule.trigger === 'preset' ? { presets: rule.presets.map((p) => PRESET[p]), allow_list: [] }
        : rule.trigger === 'mentions' ? { mention_total_limit: rule.limit, mention_raid_protection_enabled: !!rule.raid } : {};
      const actions = [{ type: 1, metadata: { custom_message: SPEC.automod.message } }];
      if (alerts) actions.push({ type: 2, metadata: { channel_id: alerts } });
      if (rule.timeout) actions.push({ type: 3, metadata: { duration_seconds: rule.timeout } });
      const want = { name: rule.name, event_type: 1, trigger_metadata: meta, actions, enabled: true,
        exempt_roles: (rule.exempt ?? []).map((k) => roleId[k]).filter(Boolean),
        exempt_channels: (rule.exemptChannels ?? []).map((k) => channelId[k]).filter(Boolean) };
      const mine = have.find((x) => x.trigger_type === type && (type !== TRIGGER.keyword || same(x.name, rule.name)));
      const sorted = (v) => (Array.isArray(v) ? [...v].sort() : v);
      const sig = (r) => JSON.stringify([r.name, !!r.enabled, Object.keys(meta).sort().map((k) => [k, sorted(r.trigger_metadata?.[k])]),
        (r.actions ?? []).map((a) => [a.type, a.metadata?.custom_message ?? '', a.metadata?.channel_id ?? '', a.metadata?.duration_seconds ?? 0]),
        sorted(r.exempt_roles ?? []), sorted(r.exempt_channels ?? [])]);
      if (!mine) {
        await step(`AutoMod ${rule.name}`, async () => { await call('POST', `/guilds/${GUILD}/auto-moderation/rules`, { ...want, trigger_type: type }); log(`  AutoMod ${rule.name} made`); });
      } else if (sig(mine) !== sig(want)) {
        await step(`AutoMod ${rule.name}`, async () => { await call('PATCH', `/guilds/${GUILD}/auto-moderation/rules/${mine.id}`, want); log(`  AutoMod ${rule.name} set`); });
      }
    }
  }

  // 告 The messages, each found by its title among the bot's own and edited in place.
  // {#key} in a body or a field becomes a link to that channel.
  const linked = (text) => text.replace(/\{#(\w+)\}/g, (_, k) => (channelId[k] ? `<#${channelId[k]}>` : `#${k}`));
  for (const m of SPEC.messages) {
    const where = channelId[m.channel];
    if (!where) continue;
    const embed = { title: m.title, description: linked(m.body.join('\n')), color: colour(m.color) };
    if (m.image) embed.image = { url: m.image };
    if (m.fields) embed.fields = m.fields.map(([name, value]) => ({ name, value: linked(value), inline: false }));
    if (m.footer) embed.footer = { text: m.footer };
    await step(`message "${m.title}"`, async () => {
      // 釘 The pins first: a pinned message in a busy channel is long past the last fifty.
      const pins = await call('GET', `/channels/${where}/pins`);
      const recent = await call('GET', `/channels/${where}/messages?limit=50`);
      const ours = (x) => x.author?.id === me.id && x.embeds?.[0]?.title === m.title;
      const mine = pins.find(ours) ?? recent.find(ours);
      let id;
      if (!mine) {
        id = (await call('POST', `/channels/${where}/messages`, { embeds: [embed] })).id;
        log(`  "${m.title}" posted`);
      } else {
        id = mine.id;
        const sig = (x) => JSON.stringify([x.description, x.color, x.image?.url ?? '', (x.fields ?? []).map((f) => [f.name, f.value]), x.footer?.text ?? '']);
        if (sig(mine.embeds[0]) !== sig(embed)) {
          await call('PATCH', `/channels/${where}/messages/${id}`, { embeds: [embed] });
          log(`  "${m.title}" edited`);
        }
      }
      if (m.pin && !(mine?.pinned)) await call('PUT', `/channels/${where}/pins/${id}`);
    });
  }

  // 邀 One invite that never expires, to the welcome channel, found again rather than
  // made again. The link is printed on every run so it can be read off the log.
  let invite = null;
  if (SPEC.invite && channelId[SPEC.invite]) {
    await step('invite', async () => {
      const at = channelId[SPEC.invite];
      const all = await call('GET', `/guilds/${GUILD}/invites`).catch(() => []);
      invite = all.find((i) => i.channel?.id === at && i.max_age === 0 && i.inviter?.id === me.id);
      if (!invite) {
        invite = await call('POST', `/channels/${at}/invites`, { max_age: 0, max_uses: 0, unique: false });
        log('  invite made');
      }
      log(`Invite: https://discord.gg/${invite.code}`);
    });
  }

  if (failed.length) {
    log(`\n${failed.length} step(s) did not work: ${failed.join('; ')}. Everything else is done; run this again after fixing them.`);
    process.exitCode = 1;
  } else {
    log('Done. Anything not named in server.json was left as it was.');
  }
  return { dry: false, said, channelId, roleId, invite: invite?.code, failed };
}

export { run, perms };
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
