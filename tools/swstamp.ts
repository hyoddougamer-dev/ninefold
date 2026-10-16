/**
 * 新 The service worker carries the build it shipped with, so a new build is a new worker.
 *
 * A browser decides there is a new version by comparing the worker's own bytes, nothing else.
 * public/sw.js last changed on 28 September, and dist/sw.js was a byte-for-byte copy of it, so
 * from then on no release was ever a new worker: the game never offered 新 the update, while the
 * posts told players to take it when it offered. Measured in the audit of 16 October: the same
 * sw.js gave no updatefound and no bar; one appended line gave both.
 *
 * So the build writes its id at the end of dist/sw.js. The id is the day and the commit
 * (vite.config.ts, buildId), and every push to main is a new commit.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MARK = '// build ';

/** `text` with one stamp line at its end, replacing any stamp already there. */
export function stampWorker(text: string, id: string): string {
  const body = text.split('\n').filter((line) => !line.startsWith(MARK)).join('\n').replace(/\s+$/, '');
  return `${body}\n${MARK}${id.replace(/[\r\n]+/g, ' ')}\n`;
}

/** The stamp a stamped worker carries, or null. */
export function stampOf(text: string): string | null {
  const line = text.split('\n').reverse().find((l) => l.startsWith(MARK));
  return line ? line.slice(MARK.length) : null;
}

/**
 * The Vite plugin: once the bundle is written (public/ copied in with it), stamp the worker
 * in the output folder. A build without a worker is left alone.
 */
export function swStamp(id: string, worker = 'sw.js') {
  let outDir = 'dist';
  return {
    name: 'sw-stamp',
    apply: 'build' as const,
    configResolved(config: { root: string; build: { outDir: string } }) {
      outDir = join(config.root, config.build.outDir);
    },
    closeBundle() {
      const file = join(outDir, worker);
      let text: string;
      try { text = readFileSync(file, 'utf8'); } catch { return; }
      writeFileSync(file, stampWorker(text, id));
    },
  };
}
