/**
 * 測 The testers' Discord server, made to match tools/discord/server.json.
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
 * a channel's topic and permissions are corrected when they drift, and each message is
 * found by its title and edited in place rather than posted again. Running it twice
 * changes nothing the second time, which tools/discord-check.mjs proves against a fake.
 *
 * 讓 It never deletes. A channel Bruno made by hand, or one this file no longer names,
 * is left exactly where it is.
 *
 * With no token it prints the plan and stops, so the workflow can be run safely before
 * the secret exists.
 */
import { readFileSync, existsSync } from 'node:fs';

const API = process.env.DISCORD_API ?? 'https://discord.com/api/v10';
const TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const GUILD = process.env.DISCORD_GUILD_ID ?? '';
const ICON = process.env.DISCORD_ICON ?? '';
const SPEC = JSON.parse(readFileSync(process.env.DISCORD_SPEC || new URL('./discord/server.json', import.meta.url), 'utf8'));

// Permission bits, from the Discord documentation.
const P = {
  INVITE: 1n << 0n, VIEW: 1n << 10n, SEND: 1n << 11n, REACT: 1n << 6n, HISTORY: 1n << 16n,
  THREADS: 1n << 35n, SEND_THREADS: 1n << 38n, ATTACH: 1n << 15n, EMBED: 1n << 14n,
};
const TYPE = { text: 0, category: 4, forum: 15 };
const colour = (hex) => parseInt(hex.slice(1), 16);
const said = [];
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

const same = (a, b) => a.normalize('NFC').toLowerCase() === b.normalize('NFC').toLowerCase();

/** The body of a message as one string, which is what an embed carries. */
const bodyOf = (m) => m.body.join('\n');

function plan() {
  log(`Server: ${SPEC.name}`);
  for (const r of SPEC.roles) log(`  role ${r.name}`);
  for (const c of SPEC.categories) {
    log(`  category ${c.name}`);
    for (const ch of c.channels) log(`    ${ch.type.padEnd(5)} #${ch.name}${ch.readOnly ? '  (read-only)' : ch.private ? '  (private)' : ''}`);
  }
  for (const m of SPEC.messages) log(`  message "${m.title}" in #${m.channel}${m.pin ? ', pinned' : ''}`);
  if (SPEC.community) log('  Community on, with the rules and a private team channel');
  if (SPEC.invite) log('  one permanent invite, printed at the end');
}

async function run() {
  if (!TOKEN || !GUILD) {
    log('No DISCORD_BOT_TOKEN or DISCORD_GUILD_ID: here is what would be made, and nothing was touched.');
    plan();
    return { dry: true, said };
  }

  const me = await call('GET', '/users/@me');
  const guild = await call('GET', `/guilds/${GUILD}`);
  log(`Bot ${me.username} on "${guild.name}".`);

  // 名 The server's name and icon.
  const edit = {};
  if (guild.name !== SPEC.name) edit.name = SPEC.name;
  // 標 The icon is sent every run it is given, because Discord hands back a hash of it and
  // not the picture, so there is nothing to compare against. Leave DISCORD_ICON unset once
  // the icon is right.
  if (ICON && existsSync(ICON)) edit.icon = `data:image/png;base64,${readFileSync(ICON).toString('base64')}`;
  if (Object.keys(edit).length) { await call('PATCH', `/guilds/${GUILD}`, edit); log(`  server ${Object.keys(edit).join(' and ')} set`); }

  // 師 Roles, found by name, made if missing, and the owner given the master's role.
  const roles = await call('GET', `/guilds/${GUILD}/roles`);
  const roleId = {};
  for (const r of SPEC.roles) {
    const want = { name: r.name, color: colour(r.color), hoist: !!r.hoist };
    let have = roles.find((x) => same(x.name, r.name));
    if (!have) { have = await call('POST', `/guilds/${GUILD}/roles`, want); log(`  role ${r.name} made`); }
    else if (have.color !== want.color || have.hoist !== want.hoist) {
      await call('PATCH', `/guilds/${GUILD}/roles/${have.id}`, want); log(`  role ${r.name} corrected`);
    }
    roleId[r.key] = have.id;
    if (r.owner && guild.owner_id) {
      const member = await call('GET', `/guilds/${GUILD}/members/${guild.owner_id}`).catch(() => null);
      if (member && !member.roles.includes(have.id)) {
        await call('PUT', `/guilds/${GUILD}/members/${guild.owner_id}/roles/${have.id}`);
        log(`  ${r.name} given to the owner`);
      }
    }
  }

  // 頻 Categories and channels, in two passes: everything that is not a forum first, so
  // the rules and the team channel exist when Community is switched on, then the forums,
  // which Discord only allows in a Community server.
  let channels = await call('GET', `/guilds/${GUILD}/channels`);
  const everyone = GUILD;               // @everyone's role id is the guild's id
  const master = roleId.master ? [{ id: roleId.master, type: 0, allow: String(P.VIEW | P.SEND | P.EMBED | P.ATTACH), deny: '0' }] : [];
  const readOnly = [{ id: everyone, type: 0, allow: String(P.VIEW | P.HISTORY | P.REACT), deny: String(P.SEND | P.THREADS | P.SEND_THREADS) }, ...master];
  const hidden = [{ id: everyone, type: 0, allow: '0', deny: String(P.VIEW) }, ...master];
  const overwritesOf = (ch) => (ch.private ? hidden : ch.readOnly ? readOnly : null);
  const channelId = {};
  const parentId = {};
  let position = 0;
  for (const cat of SPEC.categories) {
    let parent = channels.find((x) => x.type === TYPE.category && same(x.name, cat.name));
    if (!parent) {
      parent = await call('POST', `/guilds/${GUILD}/channels`, { name: cat.name, type: TYPE.category, position: position++ });
      log(`  category ${cat.name} made`);
    }
    parentId[cat.name] = parent.id;
  }

  const ensure = async (cat, ch) => {
    const parent = parentId[cat.name];
    const overwrites = overwritesOf(ch);
    let have = channels.find((x) => x.type !== TYPE.category && same(x.name, ch.name));
    if (!have) {
      const body = { name: ch.name, topic: ch.topic, parent_id: parent, type: TYPE[ch.type] };
      if (overwrites) body.permission_overwrites = overwrites;
      if (ch.type === 'forum') body.available_tags = ch.tags.map((name) => ({ name }));
      try {
        have = await call('POST', `/guilds/${GUILD}/channels`, body);
        log(`  #${ch.name} made (${ch.type})`);
      } catch (e) {
        // 論 Still refused: a text channel, the tags written into the topic, and the log
        // says how to have the forum. A text channel cannot become a forum, so it has to go.
        if (ch.type !== 'forum') throw e;
        const topic = `${ch.topic} Tags: ${ch.tags.join(', ')}.`;
        have = await call('POST', `/guilds/${GUILD}/channels`, { name: ch.name, topic, parent_id: parent, type: TYPE.text });
        log(`  #${ch.name} made as text: Discord refused a forum. Turn Community on (Server Settings → Enable Community), delete #${ch.name}, and run this again`);
      }
    } else {
      // 權 Permissions are only this file's business on a read-only or private channel.
      // Anywhere else they are left to Bruno, so a change made by hand is never undone.
      const ids = (list) => JSON.stringify(list.map((o) => o.id).sort());
      const drift = (have.topic ?? '') !== ch.topic && !(have.type === TYPE.text && ch.type === 'forum')
        || have.parent_id !== parent
        || (overwrites && ids(have.permission_overwrites ?? []) !== ids(overwrites));
      if (drift) {
        const fix = { topic: ch.topic, parent_id: parent };
        if (overwrites) fix.permission_overwrites = overwrites;
        if (have.type === TYPE.forum && ch.type === 'forum') {
          const names = (have.available_tags ?? []).map((t) => t.name);
          fix.available_tags = [...(have.available_tags ?? []), ...ch.tags.filter((t) => !names.includes(t)).map((name) => ({ name }))];
        }
        await call('PATCH', `/channels/${have.id}`, fix);
        log(`  #${ch.name} corrected`);
      }
    }
    channelId[ch.key] = have.id;
  };
  for (const cat of SPEC.categories) for (const ch of cat.channels) if (ch.type !== 'forum') await ensure(cat, ch);

  // 社 Community: what lets a server have forums, a rules screen and a welcome for new
  // members. Discord asks for a rules channel, a channel for its own notices (the private
  // team one), members to have a verified email, and media scanned for everyone.
  if (SPEC.community && !(guild.features ?? []).includes('COMMUNITY')) {
    try {
      await call('PATCH', `/guilds/${GUILD}`, {
        features: [...(guild.features ?? []), 'COMMUNITY'],
        rules_channel_id: channelId[SPEC.community.rules],
        public_updates_channel_id: channelId[SPEC.community.updates],
        verification_level: Math.max(1, guild.verification_level ?? 0),
        explicit_content_filter: 2,
        default_message_notifications: 1,
      });
      log('  Community switched on');
    } catch (e) {
      log(`  could not switch Community on (${e.status}): turn it on by hand in Server Settings → Enable Community`);
    }
  }
  for (const cat of SPEC.categories) for (const ch of cat.channels) if (ch.type === 'forum') await ensure(cat, ch);

  // 告 The messages, each found by its title among the bot's own and edited in place.
  for (const m of SPEC.messages) {
    const where = channelId[m.channel];
    const embed = { title: m.title, description: bodyOf(m), color: colour(m.color) };
    if (m.image) embed.image = { url: m.image };
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
      const e = mine.embeds[0];
      if (e.description !== embed.description || e.color !== embed.color || (e.image?.url ?? '') !== (m.image ?? '')) {
        await call('PATCH', `/channels/${where}/messages/${id}`, { embeds: [embed] });
        log(`  "${m.title}" edited`);
      }
    }
    if (m.pin && !(mine?.pinned)) {
      await call('PUT', `/channels/${where}/pins/${id}`).catch((e) => log(`  could not pin "${m.title}": ${e.message}`));
    }
  }

  // 邀 One invite that never expires, to the welcome channel, found again rather than
  // made again. The link is printed on every run so it can be read off the log.
  let invite = null;
  if (SPEC.invite) {
    const at = channelId[SPEC.invite];
    const all = await call('GET', `/guilds/${GUILD}/invites`).catch(() => []);
    invite = all.find((i) => i.channel?.id === at && i.max_age === 0 && i.inviter?.id === me.id);
    if (!invite) {
      invite = await call('POST', `/channels/${at}/invites`, { max_age: 0, max_uses: 0, unique: false });
      log('  invite made');
    }
    log(`Invite: https://discord.gg/${invite.code}`);
  }

  log('Done. Anything not named in server.json was left as it was.');
  return { dry: false, said, channelId, roleId, invite: invite?.code };
}

export { run };
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
