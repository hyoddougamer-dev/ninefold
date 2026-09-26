/**
 * 聽 Every sound cue in the game, rendered to a file a person can listen to.
 *
 * A change to how the game sounds is a change to how it looks, as far as reviewing it
 * goes: it has to be heard, not described. This bundles src/app/sound.ts, renders every
 * cue in its score through an OfflineAudioContext in the real browser engine, and writes
 * one WAV per cue, plus one file of all of them in a row.
 *
 * It also fails if a cue is silent, clips, or is so loud next to the others that it would
 * jump out of the game: a sound a harness cannot hear is a sound nobody checked.
 *
 *   npm run sounds            → sounds/<cue>.wav and sounds/all.wav
 *   OUT=dir npm run sounds    → somewhere else
 */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.env.OUT ?? 'sounds';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const RATE = 44100;

const bundle = await build({
  entryPoints: ['src/app/sound.ts'], bundle: true, write: false, format: 'iife',
  globalName: 'Sound', platform: 'browser', target: 'es2020',
});
const code = bundle.outputFiles[0].text;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setContent('<!doctype html><title>sounds</title>');
await page.addScriptTag({ content: code });

const names = await page.evaluate(() => Object.keys(window.Sound.CUES));
const rendered = {};
for (const name of names) {
  rendered[name] = await page.evaluate(async ({ name, RATE }) => {
    const seconds = name === 'breakthrough' ? 4.5 : 3;
    const ctx = new OfflineAudioContext(2, Math.floor(RATE * seconds), RATE);
    const s = window.Sound.stageOn(ctx, 1);
    window.Sound.CUES[name](s, 0.02);
    const buf = await ctx.startRendering();
    const l = buf.getChannelData(0), r = buf.getChannelData(1);
    let peak = 0, sum = 0, last = 0;
    for (let i = 0; i < l.length; i++) {
      const v = Math.max(Math.abs(l[i]), Math.abs(r[i]));
      if (!Number.isFinite(l[i]) || !Number.isFinite(r[i])) return { error: 'NaN' };
      peak = Math.max(peak, v); sum += l[i] * l[i];
      if (v > 0.001) last = i;
    }
    return { l: Array.from(l.slice(0, last + RATE / 10)), r: Array.from(r.slice(0, last + RATE / 10)),
      peak, rms: Math.sqrt(sum / l.length), length: (last / RATE) };
  }, { name, RATE });
}
await browser.close();

function wav(l, r) {
  const n = l.length;
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i])) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i])) * 32767), 46 + i * 4);
  }
  return b;
}

mkdirSync(OUT, { recursive: true });
let failed = 0;
let allL = [], allR = [];
const gap = new Array(Math.floor(RATE * 0.6)).fill(0);
console.log(`\n聽 ${names.length} cues\n`);
for (const name of names) {
  const c = rendered[name];
  if (c.error) { console.log(`  ✗ ${name}: ${c.error}`); failed++; continue; }
  writeFileSync(`${OUT}/${name}.wav`, wav(c.l, c.r));
  allL = allL.concat(c.l, gap); allR = allR.concat(c.r, gap);
  const problems = [];
  if (c.peak < 0.02) problems.push('silent');
  if (c.peak > 0.98) problems.push('clips');
  console.log(`  ${problems.length ? '✗' : '✓'} ${name.padEnd(13)} peak ${c.peak.toFixed(2)}  ${c.length.toFixed(2)} s${problems.length ? `  ${problems.join(', ')}` : ''}`);
  if (problems.length) failed++;
}
writeFileSync(`${OUT}/all.wav`, wav(allL, allR));
console.log(failed ? `\n${failed} cues failed` : `\n聽 every cue sounds, none clips. Written to ${OUT}/.`);
process.exit(failed ? 1 : 0);
