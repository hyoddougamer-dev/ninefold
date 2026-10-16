import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stampOf, stampWorker, swStamp } from '../../../tools/swstamp.ts';

/**
 * 新 Each build is a new service worker, or the open game never offers the update. From 28
 * September to 16 October every release shipped the same sw.js, byte for byte, and the browser
 * (which compares nothing but those bytes) never saw a new version. tools/smoke.mjs checks the
 * built and served worker carries its stamp; this holds the stamp itself and its wiring.
 */
const ROOT = join(__dirname, '../../..');
const WORKER = readFileSync(join(ROOT, 'public/sw.js'), 'utf8');

describe('新 the worker carries its build', () => {
  it('two builds are two different workers', () => {
    const a = stampWorker(WORKER, '2026-10-19 · abc1234');
    const b = stampWorker(WORKER, '2026-10-19 · def5678');
    expect(a).not.toBe(b);
    expect(a).not.toBe(WORKER);
    expect(stampOf(a)).toBe('2026-10-19 · abc1234');
  });

  it('the stamp is a comment at the end: the worker reads the same', () => {
    const a = stampWorker(WORKER, '2026-10-19 · abc1234');
    expect(a.startsWith(WORKER.replace(/\s+$/, ''))).toBe(true);
    expect(a.endsWith('\n// build 2026-10-19 · abc1234\n')).toBe(true);
    // It still parses as a script.
    expect(() => new Function(a)).not.toThrow();
  });

  it('stamping twice replaces the stamp rather than piling them up', () => {
    const once = stampWorker(WORKER, 'one');
    const twice = stampWorker(once, 'two');
    expect(twice).toBe(stampWorker(WORKER, 'two'));
    expect(twice.match(/^\/\/ build /gm)).toHaveLength(1);
  });

  it('a line break in an id cannot end the comment', () => {
    const s = stampWorker(WORKER, 'a\nself.x = 1');
    expect(s.endsWith('\n// build a self.x = 1\n')).toBe(true);
  });

  it('the plugin stamps the worker in the output folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'swstamp-'));
    writeFileSync(join(dir, 'sw.js'), WORKER);
    const plugin = swStamp('2026-10-19 · abc1234');
    plugin.configResolved({ root: dir, build: { outDir: '.' } });
    plugin.closeBundle();
    expect(stampOf(readFileSync(join(dir, 'sw.js'), 'utf8'))).toBe('2026-10-19 · abc1234');
  });

  it('a build without a worker is left alone', () => {
    const dir = mkdtempSync(join(tmpdir(), 'swstamp-'));
    const plugin = swStamp('x');
    plugin.configResolved({ root: dir, build: { outDir: '.' } });
    expect(() => plugin.closeBundle()).not.toThrow();
  });

  it('the build uses it, with the id the menu shows', () => {
    const config = readFileSync(join(ROOT, 'vite.config.ts'), 'utf8');
    expect(config).toMatch(/plugins: \[[^\]]*swStamp\(BUILD\)/);
    expect(config).toMatch(/__BUILD__: JSON\.stringify\(BUILD\)/);
  });
});
