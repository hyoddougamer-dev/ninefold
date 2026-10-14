/**
 * 聲 The Season 0 trailer voice, made with ElevenLabs (Bruno, 2026-10-14: his account is on the
 * free plan). Reads tools/voice/lines.json and writes media/voice/e<k>-<n>.mp3 for up to three
 * voices, plus media/voice/takes.json naming which voice made which take. The voices are the ones
 * in the repository variable ELEVENLABS_VOICES (comma-separated voice ids) or, without it, the
 * three most used native Mandarin male narrators in the shared library, added to the account.
 * Runs only in the voice workflow, where the key is a secret; nothing here prints it.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.log('ELEVENLABS_API_KEY is not set, so nothing was made.'); process.exit(1); }
const MODEL = (process.env.ELEVENLABS_MODEL ?? '').trim() || 'eleven_multilingual_v2';
const API = process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io';
const call = async (method, path, body) => {
  const r = await fetch(`${API}${path}`, {
    method, headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', accept: '*/*' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r;
};
const json = async (method, path, body) => {
  const r = await call(method, path, body);
  if (!r.ok) throw new Error(`${method} ${path.split('?')[0]}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

// 擇 The voices: the ones Bruno named, or three found in the shared library.
let voices = (process.env.ELEVENLABS_VOICES ?? '').split(',').map((v) => v.trim()).filter(Boolean).slice(0, 3)
  .map((id) => ({ id, name: id }));
if (!voices.length) {
  const mine = (await json('GET', '/v1/voices')).voices ?? [];
  const found = [];
  for (const age of ['old', 'middle_aged']) {
    const q = new URLSearchParams({ page_size: '30', language: 'zh', gender: 'male', age, sort: 'usage_character_count_1y' });
    const page = await json('GET', `/v1/shared-voices?${q}`).catch((e) => { console.log(`  search: ${e.message}`); return { voices: [] }; });
    for (const v of page.voices ?? []) if (!found.some((f) => f.voice_id === v.voice_id)) found.push(v);
  }
  // Narrators first, then anyone else who speaks Mandarin natively.
  const rank = (v) => (/narrat|story|documentar|audiobook/i.test(`${v.use_case} ${v.descriptive} ${v.description}`) ? 0 : 1);
  found.sort((a, b) => rank(a) - rank(b));
  for (const v of found) {
    if (voices.length === 3) break;
    const have = mine.find((m) => m.sharing?.original_voice_id === v.voice_id || m.voice_id === v.voice_id);
    if (have) { voices.push({ id: have.voice_id, name: v.name }); continue; }
    const r = await call('POST', `/v1/voices/add/${v.public_owner_id}/${v.voice_id}`, { new_name: `Ninefold ${v.name}`.slice(0, 40) });
    if (r.ok) voices.push({ id: (await r.json()).voice_id, name: v.name });
    else console.log(`  could not add "${v.name}" to the account: HTTP ${r.status}`);
  }
  if (!voices.length) {
    // Free accounts may not add library voices: fall back to the account's own voices.
    voices = mine.slice(0, 3).map((m) => ({ id: m.voice_id, name: m.name }));
  }
}
if (!voices.length) { console.log('No voice could be found or added.'); process.exit(1); }

const spec = JSON.parse(readFileSync(new URL('./lines.json', import.meta.url), 'utf8'));
// ElevenLabs reads <break time="0.4s" />; lines.json writes Azure's 400ms.
const text = (line) => line.replace(/<break time="(\d+)ms"\/>/g, (_, ms) => ` <break time="${(Number(ms) / 1000).toFixed(1)}s" /> `);
const out = new URL('../../media/voice/', import.meta.url);
mkdirSync(out, { recursive: true });
const takes = [];
for (const [k, v] of voices.entries()) {
  const take = `e${k + 1}`;
  takes.push({ take, voice: v.name, id: v.id, model: MODEL });
  for (const [i, line] of spec.lines.entries()) {
    const name = `${take}-${String(i + 1).padStart(2, '0')}.mp3`;
    for (let tries = 0; ; tries++) {
      const r = await call('POST', `/v1/text-to-speech/${v.id}?output_format=mp3_44100_128`, {
        text: text(line), model_id: MODEL,
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true, speed: 0.9 },
      });
      if (r.ok) { writeFileSync(new URL(name, out), Buffer.from(await r.arrayBuffer())); console.log(`  ${name} made (${v.name})`); break; }
      if (tries < 3 && (r.status === 429 || r.status >= 500)) { await new Promise((ok) => setTimeout(ok, 3000 * (tries + 1))); continue; }
      console.log(`  ${name} refused: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
      process.exit(1);
    }
  }
}
writeFileSync(new URL('takes.json', out), `${JSON.stringify(takes, null, 2)}\n`);
console.log(`${takes.length * spec.lines.length} takes made.`);
