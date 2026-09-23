/**
 * 譯 Every character a player is shown, and whether anything on the screen names it.
 *
 * Bruno, after four content systems shipped: *"existe muita coisa que só tem nomes
 * chineses e não se percebe pra non chinese people."*
 *
 * The rule has been written down since the beginning: **no character is ever the only
 * place a thing is named. English leads; the characters ride alongside.** 釋 The key
 * tests that the *tables* keep it, and 註 the tooltips let a character answer for
 * itself. Neither of those checks the thing Bruno is actually looking at, which is a
 * screen with a character on it and no English anywhere near it.
 *
 * So this walks the built game and reads it the way somebody who does not read Chinese
 * reads it. For every element holding han, it asks one question: **is there a Latin
 * word inside this element, or inside the small block around it?** A character with a
 * name beside it is the deal the game struck. A character alone is the complaint.
 *
 *     npm run build && npm run preview &
 *     npm run han
 */
import { chromium } from 'playwright';
import { GLOSS } from '../src/app/glossary.ts';
import { REALMS } from '../src/data/realms.ts';
import { BEASTS } from '../src/data/bestiary.ts';
import { HERBS } from '../src/data/herbs.ts';
import { ALL_CARDS } from '../src/data/awakening.ts';
import { MEETINGS } from '../src/data/meetings.ts';
import { ROOM_INFO } from '../src/data/secret.ts';
import { REALM_SETS, TEMPLATE_BY_KEY } from '../src/data/gear.ts';
import { ALL_NODES, PATH_INFO } from '../src/data/techniques.ts';

/**
 * 名 Every character the game shows, and the English name it is supposed to carry.
 *
 * Assembled out of the same tables the game plays by, so a new beast or a new herb
 * cannot appear on a screen without this audit knowing what it should be called.
 */
interface HanRow { text: string; where: string; near: string | null; want: string }

/**
 * 一字多義 A character can be more than one thing, and the screen is allowed to mean
 * whichever it means.
 *
 * 劍 is 位 the weapon slot and 三 the Sword path. 吐納 is the 功法 upgrade Breathwork and
 * a node on the tree called Breathing. 運 is an axis on a piece of gear and a whole
 * branch of the tree. Holding one name each made the audit report five screens that
 * were naming their characters perfectly well, just not with the name the first table
 * happened to give.
 *
 * So every name a character has anywhere is kept, and a screen is named if it says any
 * one of them. See the same problem solved for the tooltips in glossary.ts, where a
 * screen asks for the sense it means.
 */
const NAMES: Record<string, string[]> = {};
const put = (han: string, name: string) => {
  if (!han || !name) return;
  (NAMES[han] ??= []).push(name);
};
for (const [han, term] of Object.entries(GLOSS)) if (!han.includes(':')) put(han, term.name);
for (const r of REALMS) put(r.han, r.name);
for (const b of BEASTS) put(b.han, b.name);
for (const h of HERBS) put(h.han, h.name);
for (const c of ALL_CARDS) put(c.han, c.name);
for (const m of MEETINGS) put(m.han, m.name);
for (const k of Object.values(ROOM_INFO)) put(k.han, k.name);
for (const x of REALM_SETS) put(x.han, x.name);
for (const t of Object.values(TEMPLATE_BY_KEY)) put(t.han, t.name);
for (const n of ALL_NODES) put(n.han, n.name);
for (const p of Object.values(PATH_INFO)) put(p.han, p.name);

/**
 * 外 The names that live in copy rather than in a table.
 *
 * 煉 is an affix on a piece of gear, where the table calls it fusion quality, and it is
 * also the refine level, which the card above it calls 煉器 Refine. Both are true, and
 * a table cannot know about the second one because it is written in copy.ts.
 */
put('煉', 'Refining');

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM
  ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const TABS = [['修', 'cultivate'], ['狩', 'hunt'], ['塔', 'trials'], ['器', 'gear'], ['道', 'dao']];

/** A cultivator deep enough that most of the game is on the screen. */
function cultivator(realm: number) {
  const at = Math.floor(Date.now() / 1000);
  const cap = realm * 6;
  const killed: Record<string, number> = { rat: 140, hound: 60, frog: 40, serpent: 40,
    mantis: 30, bat: 20, beetle: 20, owl: 15, raven: 10, boar: 12, wolf: 8, vulture: 5,
    crab: 11, jellyfish: 4, lizard: 3, centipede: 10, scorpion: 2, worm: 2 };
  ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao']
    .slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  return {
    v: 1, at, startedAt: at - realm * 10 * 86400,
    realm, layer: 6, qi: 10 ** (realm + 2), materials: 10 ** (realm + 1), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) },
    killed,
    worn: { weapon: { id: 'w', template: `sword${realm}`, rarity: 'earth', refine: 5,
      rolls: [{ affix: 'power', value: 22 }, { affix: 'qi', value: 9 }] } },
    chest: Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`, template: `${['sword', 'robe', 'plainring', 'sandals'][i % 4]}${Math.max(2, realm - (i % 3))}`,
      rarity: ['common', 'spirit', 'mystic', 'earth', 'heaven'][i % 5],
      rolls: [{ affix: 'power', value: 5 + i }],
    })),
    unlocked: realm >= 4 ? ['root', 'opening', 'edge', 'chain'] : [],
    stance: 'swift', sequence: realm >= 3 ? ['crane'] : [],
    tribulation: 0, tribulationAt: 0, tower: realm >= 5 ? realm * 10 : 0,
    brewed: { body: 2, bane: 1, fortune: 1 },
    awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought']
      .slice(0, Math.max(0, realm - 1)),
    met: [], metAt: at, metPoints: 0,
    beds: [{ herb: 'orchid', at: at - 7200 }, { herb: null, at: 0 }, { herb: null, at: 0 }],
    reaped: 3, runStep: -1, runAt: at, runs: 2,
    seen: ['guide', 'whom', 'marks', 'reach', 'tree', 'stance', 'gear', 'salvage', 'fuse', 'refine',
      'cores', 'record', 'arts', 'tower', 'keystones', 'bestiary', 'cave', 'secret'],
  };
}

/**
 * 讀 What a reader who does not read Chinese can see, element by element.
 *
 * It runs in the page because the question is about what is rendered, not about what is
 * in a file. An element counts as *named* if it holds a Latin word itself, or if the
 * nearest block around it does: 力 183 power is named, and so is a 妖丹 sitting inside a
 * card whose heading says Beast Cores. A bare 妖丹 in a corner is not.
 */
/**
 * 讀 What a reader who does not read Chinese sees, element by element.
 *
 * It is a string and not a function on purpose. tsx compiles this file with esbuild,
 * which wraps every function in a `__name` helper for stack traces, and page.evaluate
 * ships the function's *source* to the browser, where that helper does not exist. The
 * page then throws ReferenceError: __name is not defined and the audit measures
 * nothing. A string crosses unchanged.
 */
const LOOK = `((names) => {
  const HAN = /[㐀-鿿]/;
  const WORD = /[A-Za-z]{3,}/;
  const out = [];
  const seen = new Set();

  /**
   * Whether a piece of text names this character, rather than merely having English in
   * it somewhere. This is the whole of what makes the audit worth reading. Asking "is
   * there a Latin word nearby" was tried in a tight window and a loose one and neither
   * answers the question: tight, a realm's own name one line under its heading does not
   * count; loose, 滿 on a maxed box counted as named because the row above says "Sword
   * Technique", which is a name for something else. Asking whether **this character's
   * own name** is nearby has no window to tune and no false answer.
   */
  const named = (text, han) => {
    const wants = names[han];
    if (!wants || !wants.length) return WORD.test(text);
    return wants.some((want) => oneName(text, want));
  };

  const oneName = (text, want) => {
    const low = text.toLowerCase();
    if (low.indexOf(want.toLowerCase()) >= 0) return true;
    // 合 Two ways the name is really there and a plain includes misses it.
    // 縫 SVG puts a two-line name in two <text> elements, so the parent reads
    //   "OpeningForm" with no space in it.
    if (low.replace(/\\s+/g, '').indexOf(want.toLowerCase().replace(/\\s+/g, '')) >= 0) return true;
    // 詞 And a screen may use another form of the same word: the tab says Hunt where
    //   the table says Hunting, and the card says Refine where the table says Refining.
    //   Those are one name to a reader and two strings to indexOf. Two words that agree
    //   on their first five letters are the same word here. Prefix alone was not enough:
    //   Refine is not the start of Refining, they only share a stem.
    const said = low.match(/[a-z]{3,}/g) || [];
    const same = (a, b) => {
      if (a === b) return true;
      if (a.indexOf(b) === 0 && b.length >= 4) return true;
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i++;
      return i >= 5;
    };
    return want.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 3)
      .some((w) => said.some((t) => same(w, t)));
  };

  for (const el of Array.from(document.querySelectorAll('body *'))) {
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (!text || !HAN.test(text)) continue;
    const han = text.replace(/[^㐀-鿿]/g, '');
    if (!han) continue;
    if (named(text, han)) continue;

    // 標 A control that carries its own accessible name is named: the rank picker on
    // 器 is five characters in a row and each button says "Spirit and below". A reader
    // taps one and the line under it says which; a screen reader is told outright.
    const own = el.closest('[aria-label]');
    if (own && named(own.getAttribute('aria-label') || '', han)) continue;

    // The card it sits in. A name three lines up in the same card is a name a reader
    // finds; the check above is what stops that from being any name at all.
    let near = null;
    let up = el.parentElement;
    for (let i = 0; i < 4 && up; i++, up = up.parentElement) {
      const t = (up.textContent || '').trim();
      if (named(t, han)) { near = t.replace(/\\s+/g, ' ').slice(0, 80); break; }
    }
    const cls = String(el.getAttribute('class') || '').split(' ')[0] || '-';
    const where = el.tagName.toLowerCase() + '.' + cls;
    const key = where + '|' + text;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text: text.slice(0, 24), where, near, want: (names[han] || []).join(' / ') });
  }
  return out;
})`;

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const found = new Map();

async function walk(realm: number) {
  const page = await browser.newPage({ viewport: { width: 400, height: 860 } });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, v]) => localStorage.setItem(k as string, JSON.stringify(v)),
    [SAVE_KEY, cultivator(realm)] as [string, unknown]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(900);
  for (let i = 0; i < 24; i++) {
    const card = await page.$('.awaken .acard');
    if (card) { await card.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(200); continue; }
    const el = await page.$('.help button.act, .help .xclose, .notice button, .scrim, .shut');
    if (!el) break;
    await el.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(200);
  }

  for (const [han, name] of TABS) {
    const tab = await page.$(`nav.tabs button:has-text("${han}")`);
    if (!tab || await tab.getAttribute('data-shut') === 'true') continue;
    await tab.click().catch(() => {});
    await page.waitForTimeout(500);
    if (await page.getAttribute('.sheet', 'data-screen') !== name) continue;
        // 串 A complete call expression, so there is no argument for Playwright to have to
    // hand to a function it may or may not decide to call.
    const rows = (await page.evaluate(`${LOOK}(${JSON.stringify(NAMES)})`)) as HanRow[];
    for (const row of rows) {
      const key = `${row.where}|${row.text}`;
      if (!found.has(key)) found.set(key, { ...row, screens: new Set<string>() });
      found.get(key).screens.add(name);
    }
  }
  await page.close();
}

for (const realm of [2, 4, 6, 9]) await walk(realm);
await browser.close();

const rows = [...found.values()];
const alone = rows.filter((r) => !r.near);
console.log(`\n譯 ${rows.length} places show a character the text beside it does not name.\n`);
console.log(`  ${rows.length - alone.length} are named by the card they sit in, which is the deal.`);
console.log(`  ${alone.length} are a character and nothing else, which is the complaint.\n`);
if (alone.length) {
  console.log('  a character and nothing else:');
  for (const r of alone.sort((a, b) => a.where.localeCompare(b.where))) {
    console.log(`    ${r.text.padEnd(10)} ${r.where.padEnd(24)} `
      + `${r.want ? `should read "${r.want}"` : 'not in any table'}   ${[...r.screens].join(' ')}`);
  }
  console.log();
  process.exit(1);
}
console.log('  ✓ every character on every screen is named by the card it sits in.\n');
