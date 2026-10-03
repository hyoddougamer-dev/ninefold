/**
 * 讀 What the testers wrote: every post in 報-bugs and 議-ideas, with its tags, its first
 * message and the replies under it, and the last hundred messages of each channel they
 * talk in, as one Markdown digest. The channels came in on 2026-10-02: rekaris asked what
 * 福星 Lucky Star does in a channel, not a forum, and the digest never saw it.
 *
 * Bruno: "valida o discord bugs e ideas de players e comenta comigo o que podemos
 * melhorar". The sandbox cannot reach Discord and the Action logs of this repository are
 * public, so the digest never appears in them as text: .github/workflows/discord-read.yml
 * seals it to tools/discord/reader.pub.pem (a key whose private half lives only in the
 * working session) and prints the sealed copy. Read only; nothing in Discord is touched.
 *
 *     DISCORD_BOT_TOKEN=… DISCORD_GUILD_ID=… node tools/discord-read.mjs > digest.md
 */
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
const API = 'https://discord.com/api/v10';
if (!TOKEN || !GUILD) { console.error('DISCORD_BOT_TOKEN and DISCORD_GUILD_ID are needed.'); process.exit(1); }

async function call(path) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bot ${TOKEN}`, 'User-Agent': 'NinefoldReader (https://github.com/hyoddougamer-dev/ninefold, 1)' },
    });
    if (res.status === 429) {
      const wait = Number((await res.json().catch(() => ({}))).retry_after ?? 1);
      await new Promise((r) => setTimeout(r, Math.ceil(wait * 1000) + 50));
      continue;
    }
    if (!res.ok) throw new Error(`GET ${path.replace(/\d{17,}/g, 'id')} → ${res.status}`);
    return res.json();
  }
  throw new Error(`GET ${path}: still rate limited`);
}

const FORUMS = ['bugs', 'ideas'];
const channels = await call(`/guilds/${GUILD}/channels`);
const live = (await call(`/guilds/${GUILD}/threads/active`)).threads ?? [];
const day = (iso) => (iso ? iso.slice(0, 16).replace('T', ' ') : '');
const clip = (t, n) => (t.length > n ? `${t.slice(0, n)}…` : t);
const out = [`# Discord digest, ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, ''];

for (const key of FORUMS) {
  const forum = channels.find((c) => c.type === 15 && c.name.endsWith(key));
  if (!forum) { out.push(`## ${key}: no forum found`, ''); continue; }
  const tags = Object.fromEntries((forum.available_tags ?? []).map((t) => [t.id, t.name]));
  const old = (await call(`/channels/${forum.id}/threads/archived/public?limit=100`)).threads ?? [];
  const threads = [...live.filter((t) => t.parent_id === forum.id), ...old]
    .sort((a, b) => (b.thread_metadata?.create_timestamp ?? '').localeCompare(a.thread_metadata?.create_timestamp ?? ''));
  out.push(`## ${forum.name} (${threads.length} posts)`, '');
  for (const t of threads) {
    const msgs = (await call(`/channels/${t.id}/messages?limit=50`)).reverse();
    const first = msgs[0];
    const tagNames = (t.applied_tags ?? []).map((x) => tags[x]).filter(Boolean).join(', ');
    out.push(`### ${t.name}`);
    out.push(`- tags: ${tagNames || 'none'} · by ${first?.author?.username ?? '?'}${first?.author?.bot ? ' (bot)' : ''} · ${day(t.thread_metadata?.create_timestamp)} · ${msgs.length} messages${t.thread_metadata?.archived ? ' · archived' : ''}`);
    for (const [i, m] of msgs.entries()) {
      const text = [m.content, ...(m.embeds ?? []).map((e) => [e.title, e.description].filter(Boolean).join(': '))].filter(Boolean).join(' / ');
      const files = (m.attachments ?? []).length ? ` [${m.attachments.length} image/file]` : '';
      out.push(`${i === 0 ? '>' : '  -'} **${m.author?.username ?? '?'}**: ${clip(text.replace(/\s+/g, ' ').trim(), i === 0 ? 4000 : 4000)}${files}`);
    }
    out.push('');
  }
}
// 談 The channels people talk in. Never the team's own, and never the ones only the
// developer and the bot write in.
const TALK = ['general', 'screenshots', 'rankings'];
for (const c of channels.filter((x) => x.type === 0 && TALK.some((k) => x.name.endsWith(k)))) {
  const msgs = (await call(`/channels/${c.id}/messages?limit=100`)).reverse().filter((m) => !m.author?.bot);
  out.push(`## ${c.name} (last ${msgs.length} messages)`, '');
  for (const m of msgs) {
    const files = (m.attachments ?? []).length ? ` [${m.attachments.length} image/file]` : '';
    const text = clip((m.content ?? '').replace(/\s+/g, ' ').trim(), 1500);
    if (text || files) out.push(`- ${day(m.timestamp)} **${m.author?.username ?? '?'}**: ${text}${files}`);
  }
  out.push('');
}
console.log(out.join('\n'));
