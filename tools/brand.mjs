/**
 * 標 Every icon, splash and wordmark the game ships, made from the two pictures Bruno
 * chose on 2026-09-28 (docs/brand/source). Run it again whenever those change:
 *
 *   node tools/brand.mjs
 *
 * The icon is a gold ensō with the seated cultivator inside, painted on a warm dark
 * ground. Where a platform lays the icon over a colour of its own (the Android adaptive
 * icon, the splash), the painting is lifted off its ground so no square shows round it.
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const ICON = 'docs/brand/source/icon.webp';
const WORDMARK = 'docs/brand/source/wordmark.webp';
const PAPER = { r: 25, g: 13, b: 3 };      // the icon's own ground, read off its corners
const WORD_PAPER = { r: 21, g: 9, b: 0 };   // and the wordmark's
const GROUND = '#14110D';                   // the game's ground (src/app/theme.css --ground)
// The ensō's box in the 1254px source, measured: everything brighter than the ground.
const RING = { left: 205, top: 180, width: 845, height: 877 };

for (const d of ['public/brand', 'assets', 'docs/brand']) mkdirSync(d, { recursive: true });

/** 揭 The painting lifted off its ground: alpha from how far a pixel is above the paper. */
async function lifted(file = ICON, paper = PAPER) {
  const PAPER = paper;
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  const bgL = 0.299 * PAPER.r + 0.587 * PAPER.g + 0.114 * PAPER.b;
  for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const a = Math.max(0, Math.min(1, (0.299 * r + 0.587 * g + 0.114 * b - bgL - 8) / 110));
    const un = (c, p) => (a > 0 ? Math.max(0, Math.min(255, Math.round((c - p * (1 - a)) / a))) : 0);
    out[o] = un(r, PAPER.r); out[o + 1] = un(g, PAPER.g); out[o + 2] = un(b, PAPER.b); out[o + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** 置 The lifted ensō, its ring `ring` px across, centred on a `size` square of `bg`. */
async function onGround(mark, size, ring, bg) {
  const scale = ring / RING.width;
  const art = await sharp(mark).extract(RING).resize(Math.round(RING.width * scale), Math.round(RING.height * scale)).png().toBuffer();
  const m = await sharp(art).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: art, left: Math.round((size - m.width) / 2), top: Math.round((size - m.height) / 2) }]).png();
}

const mark = await lifted();
const clear = { r: 0, g: 0, b: 0, alpha: 0 };

// 網 The web app: the painting as painted. The ring is two thirds of the square, inside
// the circle a maskable icon promises to keep, so one file serves both purposes.
await sharp(ICON).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(ICON).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(ICON).resize(180, 180).png().toFile('public/apple-touch-icon.png');
// A tab is 16 to 32px: the ring alone, filling the square, reads there; the figure does not.
await sharp(ICON).extract({ left: 170, top: 165, width: 910, height: 910 }).resize(64, 64).png().toFile('public/favicon.png');
await sharp(ICON).resize(512, 512).png().toFile('docs/brand/icon-512.png');   // Discord's server icon
await sharp(mark).png().toFile('docs/brand/mark.png');

// 名 The wordmark, trimmed to its painting, for the testers' page and anywhere else.
await sharp(await lifted(WORDMARK, WORD_PAPER)).extract({ left: 140, top: 225, width: 1420, height: 460 }).resize(1136).webp({ quality: 88 }).toFile('public/brand/wordmark.webp');

// 機 Android, for @capacitor/assets in .github/workflows/apk.yml. It insets each adaptive
// layer by a sixth, so these squares are exactly what the launcher shows before cutting it
// to a circle or a squircle: the ring stands at two thirds, as it does in the web icon.
await sharp(ICON).resize(1024, 1024).png().toFile('assets/icon-only.png');
await (await onGround(mark, 1024, 676, clear)).toFile('assets/icon-foreground.png');
// The layer under it is the game's ground, not the painting's paper: Android 12 draws the
// splash as this icon on that ground, and a paper disc would show on it as a dark coin.
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: GROUND } }).png().toFile('assets/icon-background.png');
await (await onGround(mark, 2732, 720, GROUND)).toFile('assets/splash.png');
await (await onGround(mark, 2732, 720, GROUND)).toFile('assets/splash-dark.png');

console.log('標 icons, favicon, wordmark, Android icon layers and splash made from docs/brand/source.');
