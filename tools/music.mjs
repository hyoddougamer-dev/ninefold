/**
 * 樂 The game's music, made from Bruno's own tracks in music-src/ (made in Suno, on a
 * plan that allows a game to use them). Run again whenever a track is added or changed:
 *
 *   FFMPEG=/path/to/ffmpeg node tools/music.mjs      (or ffmpeg on the PATH)
 *
 * Each track has the silence at either end cut, so a loop never sits in a gap; is brought
 * to one loudness, so moving from one screen to the next does not jump; and is written as
 * AAC at 96 kbps, which every browser and both phones play, and as Opus at 80 kbps for
 * the few Chromium builds that ship without AAC. The game asks the browser which it can
 * play and fetches that one only. The cover picture Suno puts inside the file is dropped.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync } from 'node:fs';

const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
mkdirSync('public/music', { recursive: true });
const trim = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05';
for (const file of readdirSync('music-src').filter((f) => f.endsWith('.mp3')).sort()) {
  const name = file.replace(/\.mp3$/, '');
  // Cut the silence off the front, then off the back by doing the same to it reversed.
  const af = `${trim},areverse,${trim},areverse,loudnorm=I=-18:TP=-1.5:LRA=11`;
  const base = ['-y', '-hide_banner', '-loglevel', 'error', '-i', `music-src/${file}`, '-vn', '-af', af, '-ac', '2'];
  execFileSync(FFMPEG, [...base, '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', `public/music/${name}.m4a`]);
  execFileSync(FFMPEG, [...base, '-ar', '48000', '-c:a', 'libopus', '-b:a', '80k', `public/music/${name}.webm`]);
  const mb = (ext) => (statSync(`public/music/${name}.${ext}`).size / 1e6).toFixed(2);
  console.log(`  ${name.padEnd(12)} ${mb('m4a')} MB aac · ${mb('webm')} MB opus`);
}
console.log('樂 every track trimmed, levelled and written to public/music.');
