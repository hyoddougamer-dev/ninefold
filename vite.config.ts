import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

/**
 * 版 A short hash of every painting, so its address changes when its pixels do.
 *
 * Bruno looked at the arena after 紙 the figures were recut and saw the old ones: same
 * name, same address, and a browser that had it already was entitled to keep it. With
 * the hash in the address a recut painting is a new file to every cache there is, and an
 * unchanged one is still the same file, so an update downloads only what changed.
 */
function artHashes(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const kind of readdirSync('public/art')) {
    for (const file of readdirSync(`public/art/${kind}`)) {
      if (!file.endsWith('.webp')) continue;
      const h = createHash('sha1').update(readFileSync(`public/art/${kind}/${file}`)).digest('hex');
      out[`${kind}/${file.slice(0, -5)}`] = h.slice(0, 8);
    }
  }
  return out;
}

/**
 * Vite marks its own script and stylesheet tags `crossorigin`, which is harmless on the
 * web and fatal behind a service worker: a request in CORS mode may not be answered with
 * a `basic` response, so every cached asset is rejected with ERR_FAILED and the game
 * opens offline as a blank page with the right title. The files are same-origin, so the
 * attribute buys nothing: out it comes.
 */
const noCrossOrigin = {
  name: 'no-crossorigin',
  transformIndexHtml(html: string) {
    return html.replace(/\s+crossorigin(?=[\s>])/g, '');
  },
};

export default defineConfig({
  plugins: [react(), noCrossOrigin],
  define: { __ART_HASH__: JSON.stringify(artHashes()) },
  // Relativo, porque o mesmo build é servido por um host web e de dentro do APK.
  base: './',
  build: {
    target: 'es2020',
    // Duas entradas: o jogo, e o banco de ensaios da arena.
    rollupOptions: { input: { main: 'index.html', lab: 'arena-lab.html' } },
  },
});
