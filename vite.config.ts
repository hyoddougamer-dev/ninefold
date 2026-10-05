/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

/** 版 Which build this is: the commit and the day, for a tester reporting a bug. */
function buildId(): string {
  let sha = 'dev';
  try { sha = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* not a checkout */ }
  return `${new Date().toISOString().slice(0, 10)} · ${sha}`;
}

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
  /**
   * 驗 The agent worktrees under .claude are whole old copies of the repository, tests and
   * all. Collected, they were a thousand stale files run beside the real sixty-odd.
   */
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
  define: { __ART_HASH__: JSON.stringify(artHashes()), __BUILD__: JSON.stringify(buildId()) },
  // Relative, because the same build is served from a web host and from inside the APK.
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: {
      // Two entries: the game, and the arena's test bench.
      input: { main: 'index.html', lab: 'arena-lab.html' },
      output: {
        /**
         * 包 The icons and React in chunks of their own. Together they were two thirds of
         * one 772 KB file, and neither changes when the game does, so a player's update
         * downloads the game and keeps the rest it already has.
         */
        manualChunks(id: string) {
          if (id.includes('icons.generated')) return 'icons';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});
