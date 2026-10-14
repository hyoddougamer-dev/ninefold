/**
 * 聲 The Season 0 trailer voice, made with Azure Speech (Bruno, 2026-10-14). Reads
 * tools/voice/lines.json and writes media/voice/<voice>-<n>.mp3 for every voice and line,
 * so the takes can be compared. Runs only in the voice workflow, where the key is a secret;
 * nothing here prints the key or the audio.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = (process.env.AZURE_SPEECH_REGION ?? '').trim();
if (!KEY || !REGION) {
  console.log('AZURE_SPEECH_KEY or AZURE_SPEECH_REGION is not set, so nothing was made.');
  process.exit(1);
}
const spec = JSON.parse(readFileSync(new URL('./lines.json', import.meta.url), 'utf8'));
const out = new URL('../../media/voice/', import.meta.url);
mkdirSync(out, { recursive: true });
const ssml = (v, text) => `<speak version="1.0" xml:lang="zh-CN" xmlns:mstts="https://www.w3.org/2001/mstts">`
  + `<voice name="${v.voice}">${v.style ? `<mstts:express-as style="${v.style}">` : ''}`
  + `<prosody rate="${v.rate}" pitch="${v.pitch}">${text}</prosody>${v.style ? '</mstts:express-as>' : ''}</voice></speak>`;
let made = 0;
for (const v of spec.voices) {
  for (const [i, text] of spec.lines.entries()) {
    const name = `${v.key}-${String(i + 1).padStart(2, '0')}.mp3`;
    for (let tries = 0; ; tries++) {
      const r = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-48khz-192kbitrate-mono-mp3',
          'User-Agent': 'ninefold-voice',
        },
        body: ssml(v, text),
      });
      if (r.ok) { writeFileSync(new URL(name, out), Buffer.from(await r.arrayBuffer())); made++; console.log(`  ${name} made`); break; }
      if (tries < 3 && (r.status === 429 || r.status >= 500)) { await new Promise((ok) => setTimeout(ok, 2000 * (tries + 1))); continue; }
      console.log(`  ${name} refused: HTTP ${r.status}`);
      process.exit(1);
    }
  }
}
console.log(`${made} takes made.`);
