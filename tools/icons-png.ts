/**
 * The two PNG icons the installed app needs, drawn from the game's own art.
 *
 * A home-screen icon cannot be an SVG on Android, so the 192 and 512 squares are
 * rendered here with the same seated figure and the same ninth-realm magenta the game
 * ends on — no new drawing, no file anyone has to keep in sync by hand.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { ICONS } from '../src/art/icons.generated.ts';
import { realm as realmOf } from '../src/data/realms.ts';

const hue = realmOf(9).colour;
const ring = realmOf(1).colour;

const svg = (S: number) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0C0F26"/>
      <stop offset="1" stop-color="#05060F"/>
    </linearGradient>
    <radialGradient id="a">
      <stop offset="0" stop-color="${hue}" stop-opacity=".95"/>
      <stop offset=".55" stop-color="${hue}" stop-opacity=".45"/>
      <stop offset="1" stop-color="${hue}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>
  <circle cx="${S / 2}" cy="${S * 0.54}" r="${S * 0.46}" fill="url(#a)"/>
  <circle cx="${S / 2}" cy="${S * 0.40}" r="${S * 0.155}" fill="none" stroke="${ring}"
    stroke-width="${S * 0.018}" stroke-opacity=".95"/>
  <g transform="translate(${S * 0.22} ${S * 0.24}) scale(${(S * 0.56) / 512})" fill="#FFFFFF">
    ${ICONS.meditation}
  </g>
</svg>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0}</style>${svg(size)}`);
  const shot = await page.screenshot({ omitBackground: false });
  writeFileSync(`public/icon-${size}.png`, shot);
  await page.close();
  console.log(`public/icon-${size}.png — ${(shot.length / 1024).toFixed(0)} KB`);
}

await browser.close();
