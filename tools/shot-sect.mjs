/**
 * 位 The sect rank, shot off the built game (docs/SEASON-RANKS.md, section 7): the head of
 * Rankings, the board rows (layout B as built, and layout A as a mockup of the same markup),
 * the Sect's Ladder, a seal's 註 note, the rank on 修 (with the widest case: a rank, 期十, 先行
 * and a life's name together), the one rise card, the held line, the signed-out line, the 修士
 * nudge, and the Rankings screen before the switch, where none of it shows.
 *
 * Every state is a real one: a fabricated season save (season: 's0', 'whom' seen), the game's
 * own clock installed into the season, and a stand-in for the ranked server (the sandbox cannot
 * reach Supabase) answering what the migration answers. At 320, 400 and a PC window.
 *
 *   npx vite preview --port 4191 &
 *   BASE=http://localhost:4191/ SHOTS=/some/dir node tools/shot-sect.mjs
 *
 * It checks what it shows, with a floor on how many shots it took, so a walk stopped by a card
 * it never got past fails rather than printing a tick.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { SEASON_START, rungOf } from './cliff-fixture.mjs';

const BASE = process.env.BASE ?? 'http://localhost:4173/';
const SHOTS = process.env.SHOTS ?? 'sect-shots';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const API = 'https://yqppvmuwlhibswbbvjzz.supabase.co';
mkdirSync(SHOTS, { recursive: true });

const DAY = 86_400;
const SIZES = [['320', 320, 720, 2], ['400', 400, 860, 2], ['pc', 1280, 800, 1]];
const USER = { id: '0b5e2f4a-1111-4222-8333-944455556666', aud: 'authenticated', role: 'authenticated', email: null, is_anonymous: true };
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS' };
const session = (at) => ({ access_token: 'test-token', token_type: 'bearer', expires_in: 3600, expires_at: at + 3600, refresh_token: 'test-refresh', user: USER });

let failed = 0;
let shots = 0;
const check = (ok, what, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${what}${ok ? '' : `  ${detail}`}`);
  if (!ok) failed++;
};

/** The board on day 60 of the season: every rank from Inner Disciple to Peak Lord on it. Names invented. */
function boardRows(me, myClimb) {
  return [
    { name: 'Mistwalker', climb: 80, marks: 7, title: '天下第一', calling: 'swordimmortal', forerunner: true },
    { name: 'Lan Feng', climb: 80, marks: 2, title: '期首', calling: 'qi:2', forerunner: false },
    { name: 'Old Pine', climb: 66, marks: 0, title: null, calling: 'sorcerer:9', forerunner: true },
    { name: 'Yuki', climb: 49, marks: 0, title: null, calling: 'sword:2', forerunner: false },
    { name: me, climb: myClimb, marks: 0, title: '期十', calling: 'qi:2', forerunner: true, me: true },
    { name: 'Sword Cultivator Lan', climb: 30, marks: 0, title: null, calling: 'sword:2', forerunner: false },
    { name: '修士 7F3A', climb: 12, marks: 0, title: null, calling: null, forerunner: false },
  ].map((r, i) => ({ rank: i + 1, tower: 40 - i * 5, gain: 30 - i * 3, me: false, ...r, rung: rungOf(r.climb + r.marks) }));
}
const COUNTS = [214, 163, 88, 41, 12, 3, 1, 0, 0];

/** A stand-in for the ranked server after the switch (or before it, with `before`). */
function server(page, o) {
  return page.route(`${API}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const reply = (status, body) => route.fulfill({ status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const body = req.postDataJSON?.() ?? null;
    const dark = (r) => (o.before ? { ...r, rung: null } : r);
    switch (url.pathname) {
      case '/auth/v1/user': return reply(200, USER);
      case '/auth/v1/token': return reply(200, session(Math.floor(Date.now() / 1000)));
      case '/functions/v1/sync': return reply(200, { ranked: !o.suspect, state: 'verified', why: [], suspect: !!o.suspect, standing: null, behindHours: 0 });
      case '/rest/v1/rpc/board': {
        const rows = boardRows(o.name, o.climb + o.marks > 80 ? 80 : o.climb).map(dark);
        return reply(200, o.suspect ? rows.filter((r) => !r.me) : body?.kind === 'tower' ? rows.filter((r) => r.tower > 0) : rows);
      }
      case '/rest/v1/rpc/samsara_board': return reply(200, []);
      case '/rest/v1/rpc/my_standing':
        return reply(200, {
          name: o.name, suspect: !!o.suspect, banned: false, climb: o.climb, marks: o.marks, tower: 12,
          verified_at: new Date().toISOString(), latest_at: new Date().toISOString(), title: o.title ?? null, forerunner: !!o.forerunner,
          rung: o.before || o.suspect ? null : rungOf(o.climb + o.marks), carved: o.before ? null : o.suspect ? [] : o.carved,
        });
      case '/rest/v1/rpc/rungs': return reply(200, COUNTS.map((players, rung) => ({ rung, players: o.before ? 0 : players })));
      case '/rest/v1/rpc/cliff': return reply(200, []);
      case '/rest/v1/rpc/forerunners': return reply(200, []);
      default: return reply(404, { error: url.pathname });
    }
  });
}

/** A season cultivator in realm `realm`, layer `layer`, every first-run card read. */
function cultivator(realm, layer, at, extra = {}) {
  const wardens = ['fox', 'ape', 'crane', 'tiger', 'turtle', 'golem', 'direwolf', 'jiao'];
  const killed = { rat: 120, hound: 40, frog: 12, serpent: 30, mantis: 11, bat: 3, beetle: 15, owl: 2, boar: 12, wolf: 3, crab: 11, centipede: 10 };
  wardens.slice(0, realm - 1).forEach((k) => { killed[k] = 1; });
  const cap = realm * 6;
  return {
    v: 1, season: 's0', at: at - 30, startedAt: Math.min(SEASON_START + 600, at - 20 * DAY),
    realm, layer, qi: 10 ** (realm + 2), materials: 10 ** (realm + 1), wardenFell: false,
    levels: { technique: cap, method: cap, pills: cap, cores: Math.max(0, cap - 6) },
    killed, worn: {}, chest: [], unlocked: [], self: 'woman', stance: 'swift', sequence: [],
    tribulation: 0, tribulationAt: 0, tower: 0, brewed: { body: 0, bane: 0, fortune: 0 },
    // Every first-run card and every one-time notice already read, so only the sect's own card can arrive.
    seen: ['guide', 'marks', 'reach', 'tree', 'stance', 'gear', 'tower', 'keystones', 'bestiary', 'salvage', 'fuse', 'whom', 'cave', 'secret',
      'cap', 'cores', 'platform', 'furnace', 'refine', 'record', 'workshop', 'pool'],
    ...extra,
  };
}

/** Open the built game at `day` into the season (negative: before it), with this save and this server. */
async function open(browser, [label, W, H, scale], { day = 60, save, srv, signed = true }) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const at = Math.floor(SEASON_START + day * DAY + 11 * 3600);
  await page.clock.install({ time: new Date(at * 1000) });
  await server(page, srv);
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([s, sess, on]) => {
    localStorage.clear();
    localStorage.setItem('ninefold.save.v1', JSON.stringify(s));
    if (on) { localStorage.setItem('ninefold.ranked', '1'); localStorage.setItem('ninefold.auth', JSON.stringify(sess)); }
  }, [save(at), session(at), signed]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(900);
  return { page, errors, label };
}

/** Take the 悟道 cards and every game notice, but stop at the sect's own card if `keep` says so. */
async function clear(page, keep = false) {
  for (let i = 0; i < 30; i++) {
    const card = await page.$('.awaken .acard');
    if (card) { await card.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(220); continue; }
    const n = await page.$('.notice');
    if (n) {
      const t = (await n.textContent()) ?? '';
      if (keep && /sect raises|on the Cliff/.test(t)) return true;
      await page.click('.notice button').catch(() => {});
      await page.waitForTimeout(220);
      continue;
    }
    if (!keep) return false;
    await page.waitForTimeout(250);
  }
  return false;
}

const shot = async (page, name) => { await page.screenshot({ path: `${SHOTS}/${name}.png` }); shots++; };
const full = async (page, name) => {
  await page.locator('.ranks').evaluate((el) => { el.style.height = 'auto'; el.style.maxHeight = 'none'; el.style.overflow = 'visible'; });
  await page.locator('.ranks').screenshot({ path: `${SHOTS}/${name}.png` });
  shots++;
};
async function openRanks(page) {
  await page.click('nav.tabs button.ranktab');
  await page.waitForSelector('.ranks', { timeout: 6000 });
  await page.waitForTimeout(600);
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

// The True Disciple on day 60: realm 6, layer 2 (climb 47), five gates carved, nothing shown yet.
const TRUE = { name: 'Kestrel', climb: 47, marks: 0, title: '期十', forerunner: true,
  carved: [{ gate: 1, rank: 23 }, { gate: 2, rank: 5 }, { gate: 3, rank: 14 }, { gate: 4, rank: 9 }, { gate: 5, rank: 31 }] };

for (const size of SIZES) {
  console.log(`\n${size[0]}`);
  const { page, errors, label } = await open(browser, size, { save: (at) => cultivator(6, 2, at), srv: TRUE });

  // 升 The one rise card, with the carving through its gate and the others counted.
  const kept = await clear(page, true);
  const said = await page.locator('.notice').textContent().catch(() => '');
  check(kept && /The sect raises you to True Disciple 真傳弟子/.test(said) && /31st through the Black Turtle's gate/.test(said)
    && /through 4 more gates/.test(said), 'one card: the rise, its gate, and the other gates counted', said);
  await shot(page, `rise-${label}`);
  await page.click('.notice button');
  await page.waitForTimeout(300);
  const seen = await page.evaluate(() => { try { return localStorage.getItem('ninefold.save.v1'); } catch { return ''; } });
  await clear(page);

  // 修 The rank first among the marks under the realm's name.
  await page.locator('nav.tabs button').first().click().catch(() => {});
  await page.waitForSelector('.c-rung', { timeout: 6000 }).catch(() => {});
  check(/True Disciple/.test(await page.locator('.c-rung').textContent().catch(() => '')), '修 wears the rank, in English beside its seal');
  check(await page.locator('.c-rung [role="img"][aria-label="True Disciple"]').count() === 1, 'and the seal is labelled in English');
  await shot(page, `cultivate-${label}`);

  // 榜 The head and the rows (layout B, as built).
  await openRanks(page);
  await page.waitForSelector('.ranks .rsect', { timeout: 6000 }).catch(() => {});
  check(/True Disciple 真傳弟子/.test(await page.locator('.ranks .rsect').textContent().catch(() => '')), 'the head names the rank in English and characters');
  check(/16 layers to Guardian 護法/.test(await page.locator('.ranks .rsectfar').textContent().catch(() => '')),
    'and says what the next rank needs', await page.locator('.ranks .rsectfar').textContent().catch(() => ''));
  check(await page.locator('.ranks .rsectbar i[data-on]').count() === 4, 'four of the nine steps lit');
  await page.waitForSelector('.ranks .rlist li', { timeout: 6000 }).catch(() => {});
  check(await page.locator('.ranks .rlist .rrowseal').count() === 7, 'a seal on every row', String(await page.locator('.ranks .rlist .rrowseal').count()));
  const lead = await page.locator('.ranks .rlist li').first().locator('.rsub').textContent().catch(() => '');
  check(/^Peak Lord/.test(lead ?? ''), 'the English rank leads the second line', lead);
  const wide = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth }));
  check(wide.doc <= wide.vw, 'nothing scrolls sideways', JSON.stringify(wide));
  await shot(page, `ranks-${label}`);
  await page.locator('.ranks .rlist').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await shot(page, `rows-B-${label}`);

  // 註 The head's seal answers with its note, with the way to the ladder inside it.
  await page.locator('.ranks .rsect .term').click();
  await page.waitForTimeout(300);
  const note = await page.locator('.termtip').textContent().catch(() => '');
  check(/reached when you arrive in Void Refining/.test(note ?? '') && /See the whole ladder/.test(note ?? ''), 'the seal answers with its note and a way to the ladder', note);
  await shot(page, `note-${label}`);
  if (await page.locator('.termtip .termgo').isVisible().catch(() => false)) await page.locator('.termtip .termgo').click();
  else await page.locator('.ranks .rsectgo').click();
  await page.waitForTimeout(400);

  // 位階 The ladder, in place of the boards.
  check(await page.locator('.ranks .rstepslist li').count() === 9, 'the ladder lists nine ranks');
  check(/True Disciple/.test(await page.locator('.ranks .rstepslist li[data-me]').textContent().catch(() => '')), 'with the player\'s own lit');
  check(/88 hold it/.test(await page.locator('.ranks .rstepslist').textContent().catch(() => '')), 'and how many hold each');
  await shot(page, `ladder-${label}`);
  await full(page, `ladder-${label}-full`);
  await page.reload();
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(700);
  await clear(page);
  check(!(await page.$('.notice')) || !/sect raises/.test(await page.locator('.notice').textContent().catch(() => '')),
    'and the rise card does not come back after a reload');

  // 榜 Layout A, a mockup of the same markup: the seal moved before the name.
  await openRanks(page);
  await page.waitForSelector('.ranks .rlist .rrowseal', { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => {
    for (const li of document.querySelectorAll('.ranks .rlist li')) {
      const seal = li.querySelector('.rn .term');
      const who = li.querySelector('.rwho');
      if (seal && who) who.prepend(seal);
    }
  });
  await page.locator('.ranks .rlist').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await shot(page, `rows-A-${label}`);
  check(errors.length === 0, 'no errors on the page', errors.join(' | '));
  void seen;
  await page.close();
}

// 修 The widest line at 320: Peak Lord, 期十, 先行 and a life's name, on a reborn summit cultivator.
console.log('\nthe widest 修 line');
for (const size of SIZES) {
  const lives = (at) => [{ marks: 3, at: SEASON_START + 30 * DAY }, { marks: 4, at: SEASON_START + 50 * DAY }].filter((l) => l.at < at);
  const { page, errors, label } = await open(browser, size, {
    day: 80,
    save: (at) => cultivator(9, 8, at, { tribulation: 6, levels: { technique: 60, method: 60, pills: 60, cores: 54 }, lives: lives(at),
      killed: { rat: 40, hound: 30, frog: 20, serpent: 20, mantis: 15, bat: 12, beetle: 12, owl: 8, raven: 8, boar: 8, wolf: 6,
        vulture: 6, crab: 6, jellyfish: 5, lizard: 5, centipede: 4, scorpion: 4, gargoyle: 3, minotaur: 3, squid: 3,
        fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1 } }),
    srv: { name: 'Mistwalker', climb: 80, marks: 6, title: '期十', forerunner: true,
      carved: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((gate) => ({ gate, rank: 60 + gate })) },
  });
  await clear(page);
  await page.locator('nav.tabs button').first().click().catch(() => {});
  await page.waitForSelector('.c-rung', { timeout: 6000 }).catch(() => {});
  check(/Peak Lord/.test(await page.locator('.c-rung').textContent().catch(() => '')), `${label}: Peak Lord on 修`);
  const box = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.c-rung, .wears, .c-fore, .lifewears')];
    return { n: els.length, over: els.some((e) => e.getBoundingClientRect().right > innerWidth), doc: document.documentElement.scrollWidth, vw: innerWidth };
  });
  check(box.n >= 3 && !box.over && box.doc <= box.vw, `${label}: the marks wrap inside the screen`, JSON.stringify(box));
  await shot(page, `cultivate-wide-${label}`);
  await openRanks(page);
  await page.waitForSelector('.ranks .rsect', { timeout: 6000 }).catch(() => {});
  check(/4 marks to Supreme Elder 太上長老/.test(await page.locator('.ranks .rsectfar').textContent().catch(() => '')), `${label}: past the summit the head counts marks`);
  await shot(page, `ranks-peak-${label}`);
  check(errors.length === 0, 'no errors on the page', errors.join(' | '));
  await page.close();
}

// The other states, at 320 and 400: held, signed out, the 修士 nudge, and before the switch.
console.log('\nheld, signed out, the nudge, before the switch');
for (const size of SIZES) {
  {
    const { page, label } = await open(browser, size, { save: (at) => cultivator(4, 3, at), srv: { ...TRUE, climb: 30, suspect: true } });
    await clear(page);
    check(await page.locator('.c-rung').count() === 0, `${label}: held, 修 wears no rank`);
    await openRanks(page);
    await page.waitForSelector('.ranks .rsectnote', { timeout: 6000 }).catch(() => {});
    check(/returns when the review is done/.test(await page.locator('.ranks .rsectnote').textContent().catch(() => '')), `${label}: held, the head says the rank returns after the review`);
    await shot(page, `held-${label}`);
    await page.close();
  }
  {
    const { page, label } = await open(browser, size, { save: (at) => cultivator(2, 3, at), srv: TRUE, signed: false });
    await clear(page);
    await openRanks(page);
    check(/Sign in and the sect will record your rank/.test(await page.locator('.ranks .rsectout').textContent().catch(() => '')), `${label}: signed out, the sect asks for a sign-in`);
    await shot(page, `signedout-${label}`);
    await page.close();
  }
  {
    const { page, label } = await open(browser, size, { day: 2, save: (at) => cultivator(2, 3, at),
      srv: { name: '修士 0B5E', climb: 12, marks: 0, title: null, forerunner: false, carved: [{ gate: 1, rank: 61 }] } });
    const kept = await clear(page, true);
    const said = await page.locator('.notice').textContent().catch(() => '');
    check(kept && /Inner Disciple 內門弟子/.test(said) && /61st through the Spirit Fox's gate/.test(said) && /Choose your own name/.test(said),
      `${label}: a 修士 name hears the rise and the carving, and is asked for a name`, said);
    await shot(page, `rise-unnamed-${label}`);
    await clear(page);
    await openRanks(page);
    await page.waitForSelector('.ranks .rnudge', { timeout: 6000 }).catch(() => {});
    check(await page.locator('.ranks .rnudge').isVisible(), `${label}: the nudge stands under the head`);
    await shot(page, `nudge-${label}`);
    await page.click('.ranks .rnudge button.act');
    await page.waitForTimeout(500);
    check(await page.locator('.ranks .raccount input').first().isVisible() && await page.locator('.ranks .rnudge').count() === 0,
      `${label}: answering it opens the name box, and it goes`);
    await page.close();
  }
  {
    const { page, errors, label } = await open(browser, size, { day: -3, save: (at) => cultivator(6, 2, at), srv: { ...TRUE, before: true } });
    await clear(page);
    check(await page.locator('.c-rung').count() === 0 && !(await page.$('.notice')), `${label}: before the switch, no rank on 修 and no card`);
    await openRanks(page);
    await page.waitForSelector('.ranks .rlist li', { timeout: 6000 }).catch(() => {});
    check(await page.locator('.ranks .rsect, .ranks .rsectnote, .ranks .rrowseal, .ranks .rsub, .ranks .rnudge').count() === 0,
      `${label}: before the switch, Rankings shows no rank anywhere`);
    await shot(page, `before-${label}`);
    check(errors.length === 0, 'no errors on the page', errors.join(' | '));
    await page.close();
  }
}

await browser.close();
const FLOOR = 45;
check(shots >= FLOOR, `took ${shots} shots, and there should be at least ${FLOOR}`);
console.log(failed ? `\n${failed} failed` : `\n位 the sect rank holds: ${shots} shots in ${SHOTS}`);
process.exit(failed ? 1 : 0);
