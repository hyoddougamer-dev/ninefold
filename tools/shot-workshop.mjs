/**
 * 業 The workshop on the real build, for the post that shows it: three phone screens from
 * a sixth-realm cultivator, and one from the day it opens.
 *
 *     npm run build && npm run preview &
 *     node tools/shot-workshop.mjs            → public/discord/workshop-*.webp
 *
 * Every picture is the game itself on a fabricated save, never a mockup of one, so what
 * the testers are asked about is exactly what they will get.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const SAVE_KEY = 'ninefold.save.v1';
const OUT = process.argv[2] ?? 'public/discord';
mkdirSync(OUT, { recursive: true });

// 經 RuneScape's table, the same one data/crafts.ts builds.
const XP = [0, 0];
{ let p = 0; for (let l = 1; l < 99; l++) { p += Math.floor(l + 300 * 2 ** (l / 7)); XP[l + 1] = Math.floor(p / 4); } }
const WARDENS = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
const COMMONS = { 1: ['rat', 'hound', 'frog'], 2: ['serpent', 'mantis', 'bat'], 3: ['beetle', 'owl', 'raven'],
  4: ['boar', 'wolf', 'vulture'], 5: ['crab', 'jellyfish', 'lizard'], 6: ['centipede', 'scorpion', 'worm'] };

function cultivator(realm, levels, crafts) {
  const at = Math.floor(Date.now() / 1000);
  const cap = realm * 6;
  const killed = {};
  for (let r = 1; r <= realm; r++) for (const k of COMMONS[r] ?? []) killed[k] = 30 + r * 8;
  WARDENS.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  const xp = {};
  for (const [k, l] of Object.entries(levels)) xp[k] = XP[l] + Math.floor((XP[l + 1] - XP[l]) * 0.45);
  return {
    v: 1, at, startedAt: at - 40 * 86400, realm, layer: 5, qi: 10 ** (realm + 2), materials: 10 ** (realm + 3),
    wardenFell: false, levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) }, killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
    chest: [], self: 'woman', stance: 'swift', sequence: realm >= 3 ? ['crane'] : [], tribulation: 0, tribulationAt: 0,
    tower: realm >= 5 ? realm * 10 : 0, brewed: { body: 0, bane: 0, fortune: 0 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew'].slice(0, [0, 0, 2, 2, 4, 4, 6][realm]),
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom'],
    crafts: { xp, since: at - 5, made: {}, tools: {}, arrays: [], carry: { elixir: null, sigil: null }, seek: 0, ...crafts },
  };
}

const SIXTH = cultivator(6, { herb: 58, vein: 55, render: 52, forge: 50, alchemy: 55, sigil: 34 }, {
  task: 'alchemy:might5',
  pouch: { moss: 120, bark: 60, orchid: 40, dragonblood: 30, lotus: 22, ginseng: 18, iron: 80, cinnabar: 40, stone: 30,
    bronze: 40, frostsilver: 24, jade: 12, 'part:boar': 12, 'part:wolf': 9, 'part:vulture': 5, 'part:crab': 8,
    'part:jellyfish': 6, 'part:lizard': 9, 'part:fox': 4, 'part:raven': 5, metal3: 8, metal4: 6, metal5: 4,
    'might5@2': 3, 'might4@4': 1, 'guard4@1': 2, 'mend5@0': 5, 'sigil:warding@1': 4, 'sigil:thunder@3': 2, 'sigil:binding@0': 1,
    'sigil:seeking': 3 },
  made: { 'alchemy:might5': 140, 'forge:gear:crab:lamellar': 31 },
  tools: { herb: 2, vein: 2, render: 1, forge: 3, alchemy: 1 },
  carry: { elixir: 'might5@2', sigil: 'sigil:thunder@3' },
  seek: 1,
});
const SECOND = cultivator(2, { herb: 9, vein: 7, render: 5, forge: 3 }, {
  task: 'herb:bark', pouch: { moss: 44, bark: 6, iron: 20, 'part:rat': 12, 'part:hound': 4 }, made: { 'herb:moss': 44 },
});

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(save) {
  const page = await browser.newPage({ viewport: { width: 400, height: 860 }, deviceScaleFactor: 2 });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [SAVE_KEY, save]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(800);
  await clear(page);
  await page.click('nav.tabs button:has-text("業")');
  await page.waitForTimeout(700);
  await clear(page);
  return page;
}

/** 掩 Whatever floats over the screen, answered the way a player answers it. */
async function clear(page) {
  for (let i = 0; i < 8; i++) {
    const b = await page.$('.notice button, .awaken button, .home button');
    if (!b) break;
    await b.click().catch(() => {});
    await page.waitForTimeout(200);
  }
}

/** Scroll the screen so this element sits near the top, then shoot the phone. */
async function shoot(page, name, selector, offset = 70) {
  if (selector) {
    await page.evaluate(([sel, off]) => {
      const el = document.querySelector(sel);
      const box = [...document.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 40
        && /(auto|scroll)/.test(getComputedStyle(e).overflowY));
      if (el && box) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - off;
    }, [selector, offset]);
    await page.waitForTimeout(300);
  }
  const png = await page.screenshot();
  await sharp(png).webp({ quality: 86 }).toFile(`${OUT}/${name}.webp`);
  console.log(`  ${OUT}/${name}.webp`);
}

let page = await open(SIXTH);
await shoot(page, 'workshop', null);
// 鑄 The forge, on the gear it can make: the piece you choose, in the shape a beast teaches.
await page.click('.crafts .cskill:has-text("Forging")');
await page.waitForTimeout(250);
await page.click('.crafts .cgroups button:has-text("Gear")');
await page.waitForTimeout(250);
await shoot(page, 'workshop-forge', '.crafts .cgroups', 12);
// 攜 What goes into a hard fight: the carried pair, and a thing in the pouch opened.
await page.click('.crafts .cskill:has-text("Alchemy")');
await page.waitForTimeout(250);
// 版 On a phone the pouch is the second view of the screen.
await page.click('.crafts .cswitch button:nth-child(2)');
await page.waitForTimeout(250);
const pill = await page.$('.crafts .cpc[aria-label^="Jade Tide Pill"]');
if (pill) { await pill.click(); await page.waitForTimeout(250); }
await shoot(page, 'workshop-carry', '.crafts .ccarry', 12);
await page.close();

page = await open(SECOND);
await shoot(page, 'workshop-first', null);
await page.close();
await browser.close();
