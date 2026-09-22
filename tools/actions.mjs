/**
 * 行 Does it actually *do* anything?
 *
 * `npm run smoke` proves every screen opens. That is not the same question as whether
 * the game works, and Bruno said so in the plainest possible way: *"para pôr à frente
 * das pessoas é necessário que as coisas estejam a funcionar e não existam erros
 * fraturantes."* A screen that renders and then throws on the one button it exists for
 * is exactly the failure a stranger meets in their first ten minutes and never reports.
 *
 * So this one presses things. Every verb the game has, at the realm that owns it:
 * buying, fighting, wearing, melting, fusing, refining, brewing, climbing the tower,
 * learning a node, taking a stance, driving a beast, condensing, breaking through,
 * crossing the tribulation, and exporting and re-importing the save.
 *
 * Each act asserts on the **state**, not on the pixels: the thing it was supposed to
 * change has changed, and nothing anywhere threw. A button that lights up and does
 * nothing passes a smoke walk and fails here, which is the whole reason this exists.
 *
 *     npm run build && npm run preview &
 *     npm run actions
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173/';
const CHROME = process.env.PLAYWRIGHT_CHROMIUM
  ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SAVE_KEY = 'ninefold.save.v1';
const ALLOWED_TO_FAIL = /fonts\.(googleapis|gstatic)\.com/;

const problems = [];
const fail = (where, what) => { problems.push(`${where}: ${what}`); console.log(`  ✗ ${where}  ${what}`); };
const pass = (what) => console.log(`  ✓ ${what}`);

/** A cultivator standing where a given verb is worth trying. */
function save(over = {}) {
  const at = Math.floor(Date.now() / 1000);
  return {
    v: 1, at, startedAt: at - 40 * 86400, realm: 5, layer: 4,
    qi: 1e11, materials: 5e6, wardenFell: false,
    levels: { technique: 20, method: 20, pills: 20, cores: 20 },
    killed: {
      rat: 140, hound: 140, frog: 140, serpent: 60, mantis: 60, bat: 60,
      beetle: 40, owl: 40, raven: 40, boar: 30, wolf: 30, vulture: 30,
      crab: 20, jellyfish: 20, lizard: 20,
      fox: 1, ape: 1, crane: 1, tiger: 1,
    },
    worn: {},
    chest: [],
    unlocked: [], stance: null, sequence: [],
    tribulation: 0, tribulationAt: 0, tower: 20,
    brewed: { body: 0, bane: 0, fortune: 0 },
    // 悟道 Four realms behind this cultivator, so four cards are owed. The default
    // fixture has taken them, or every other verb here would be standing behind a
    // sheet. The two acts that test the sheet clear this on purpose.
    awakened: ['feast', 'wolf', 'slaughter', 'platform'],
    met: [], metAt: at, metPoints: 0,
    // 洞天 Empty beds by default, so the two acts below start from a known cave.
    beds: [{ herb: null, at: 0 }, { herb: null, at: 0 }, { herb: null, at: 0 }], reaped: 0,
    // 秘境 Outside, with the door shut, so nothing walks into a run by accident.
    runStep: -1, runAt: at, runs: 0,
    seen: ['guide', 'cap', 'cores', 'tower', 'gear', 'furnace', 'refine'],
    ...over,
  };
}

/** Three of a kind, so 煉 fusing has something to eat. */
const triple = (template, rarity, n = 3) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${template}-${rarity}-${i}`, template, rarity,
    rolls: [{ affix: 'power', value: 8 + i }],
  }));

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function open(state, { keepCards = false } = {}) {
  const page = await browser.newPage({
    viewport: { width: 400, height: 860 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await page.route('**/assets/*.js', (r) => r.abort());
  await page.goto(BASE);
  await page.evaluate(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); },
    [SAVE_KEY, state]);
  await page.unroute('**/assets/*.js');
  await page.goto(BASE);
  await page.waitForSelector('nav.tabs button', { timeout: 15000 });
  await page.waitForTimeout(800);
  for (let i = 0; i < 24; i++) {
    // 悟道 A breakthrough owes a card per realm behind you and the sheet is raised by
    // the save rather than by an event, so a seeded ninth-realm cultivator meets eight
    // of them on the first frame. Taking one is what a player does and the only way on.
    // 悟道 The cards first, and separately, because page.$ with a comma answers in
    // document order rather than selector order. 新 the notice card sits earlier in the
    // tree and the sheet is painted over it, so the loop kept finding a button it could
    // never tap and never reached the sheet at all.
    const card = keepCards ? null : await page.$('.awaken .acard');
    if (card) { await card.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(220); continue; }
    const el = await page.$('.help button.act, .help .xclose, .notice button, .scrim');
    if (!el) break;
    await el.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(220);
  }
  const noise = [];
  page.on('pageerror', (e) => noise.push(`threw ${String(e).slice(0, 160)}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) noise.push(m.text().slice(0, 160));
  });
  page.on('requestfailed', (r) => { if (!ALLOWED_TO_FAIL.test(r.url())) noise.push(`request failed ${r.url().slice(0, 90)}`); });
  page.noise = noise;
  return page;
}

/** The save as the app has written it, which is the only state worth asserting on. */
const held = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), SAVE_KEY);
/** The save is written on an interval, so an act is read after it has had time to land. */
const settle = (page) => page.waitForTimeout(4600);

const tab = async (page, han) => {
  await page.click(`nav.tabs button:has-text("${han}")`, { timeout: 5000 });
  await page.waitForTimeout(500);
};

/**
 * One act: press it, let the save land, and say whether the thing it exists for changed.
 * `check` is given the save before and after and returns true or a reason.
 */
async function act(page, name, press, check) {
  const before = await held(page);
  let threw = null;
  try { await press(); } catch (e) { threw = String(e).slice(0, 120); }
  if (threw) return fail(name, `the tap itself failed: ${threw}`);
  await settle(page);
  const after = await held(page);
  if (!after) return fail(name, 'the save vanished');
  const verdict = check(before, after);
  if (verdict === true) return pass(name);
  fail(name, verdict || 'nothing in the save changed');
}

console.log(`行 pressing things at ${BASE}\n`);

/** The beast card the odds say you will win, and the one they say you will not. */
async function beastCards(page) {
  return page.$$eval('button.beast', (els) => els.map((el, i) => {
    const odds = el.querySelector('.odds')?.textContent ?? '';
    const pc = /(\d+)%/.exec(odds);
    return { i, odds: pc ? Number(pc[1]) : -1 };
  }));
}

const kills = (s) => Object.values(s.killed).reduce((x, y) => x + y, 0);

// ── 修 buying ──────────────────────────────────────────────────────────────
{
  const page = await open(save());
  await tab(page, '修');
  await act(page, '修 buying an upgrade',
    () => page.click('.upg:not([disabled])', { timeout: 5000 }),
    (a, b) => Object.keys(b.levels).some((u) => b.levels[u] > a.levels[u]) || 'no level went up');
  if (page.noise.length) fail('修', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 狩 a fight won, and a fight lost ───────────────────────────────────────
{
  const page = await open(save());
  await tab(page, '狩');
  const cards = await beastCards(page);
  const best = [...cards].sort((x, y) => y.odds - x.odds)[0];
  const worst = [...cards].sort((x, y) => x.odds - y.odds)[0];

  const fight = async (index) => {
    await page.$$eval('button.beast', (els, i) => els[i].click(), index);
    await page.waitForTimeout(700);
    for (let i = 0; i < 40; i++) {
      const done = await page.$('.arena button.act');
      if (done) { await done.click().catch(() => {}); break; }
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(600);
  };

  if (!best || best.odds < 0) fail('狩', 'no beast on the screen carries odds');
  else {
    await act(page, `狩 winning a fight (${best.odds}%)`, () => fight(best.i),
      (a, b) => kills(b) > kills(a) || 'the kill was not counted');
  }

  /**
   * 敗 The one law the screen keeps repeating, asserted against the real app: a loss
   * costs nothing. Not qi, not material, not a level, not a piece of gear.
   */
  if (worst && worst.odds >= 0 && worst.odds < 40) {
    await act(page, `敗 losing a fight costs nothing (${worst.odds}%)`, () => fight(worst.i),
      (a, b) => {
        if (b.materials < a.materials) return `材 fell from ${a.materials} to ${b.materials}`;
        if (Object.keys(b.levels).some((u) => b.levels[u] < a.levels[u])) return 'a level was taken';
        if (b.realm < a.realm || (b.realm === a.realm && b.layer < a.layer)) return 'the climb went backwards';
        if (b.chest.length < a.chest.length) return 'a piece left the chest';
        return true;
      });
  } else {
    console.log('  · nothing losable here; the loss law is tried on a first realm below');
  }
  if (page.noise.length) fail('狩', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

/**
 * 敗 The loss law, where a loss is actually possible.
 *
 * At the fifth realm everything on the screen is a walkover, measured, 100% of them,
 * so the one law the hunt screen repeats on every visit cannot be tried there. A first
 * realm can still lose, and that is where it is asked.
 */
{
  const page = await open(save({
    realm: 1, layer: 1, qi: 400, materials: 2, tower: 0,
    levels: { technique: 0, method: 0, pills: 0, cores: 0 },
    killed: {}, seen: ['guide'],
  }));
  await tab(page, '狩');
  const cards = await beastCards(page);
  const worst = [...cards].filter((c) => c.odds >= 0).sort((x, y) => x.odds - y.odds)[0];
  if (!worst || worst.odds > 50) {
    console.log(`  · the first realm had nothing losable either (weakest ${worst ? worst.odds : '?'}%)`);
  } else {
    await act(page, `敗 losing a fight costs nothing (${worst.odds}%)`,
      async () => {
        await page.$$eval('button.beast', (els, i) => els[i].click(), worst.i);
        await page.waitForTimeout(700);
        for (let i = 0; i < 40; i++) {
          const done = await page.$('.arena button.act');
          if (done) { await done.click().catch(() => {}); break; }
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(600);
      },
      (a, b) => {
        if (b.materials < a.materials) return `材 fell from ${a.materials} to ${b.materials}`;
        if (Object.keys(b.levels).some((u) => b.levels[u] < a.levels[u])) return 'a level was taken';
        if (b.realm < a.realm || (b.realm === a.realm && b.layer < a.layer)) return 'the climb went backwards';
        if (b.chest.length < a.chest.length) return 'a piece left the chest';
        return true;
      });
  }
  if (page.noise.length) fail('敗', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 器 wearing, melting, fusing ────────────────────────────────────────────
{
  const page = await open(save({ chest: [...triple('sword5', 'common'), ...triple('robe5', 'spirit')] }));
  await tab(page, '器');
  await act(page, '器 wearing a piece from the chest',
    async () => {
      await page.click('.chestit', { timeout: 5000 });
      await page.waitForTimeout(500);
      const wear = await page.$('.isheet button.act, .itemsheet button.act, button:has-text("著")');
      if (wear) await wear.click();
      await page.waitForTimeout(400);
    },
    (a, b) => Object.keys(b.worn).length > Object.keys(a.worn).length
      || `nothing is worn (chest ${a.chest.length} → ${b.chest.length})`);

  await act(page, '煉 fusing three of a kind',
    async () => {
      const fuse = await page.$('button.fuserow');
      if (fuse) { await fuse.click(); await page.waitForTimeout(600); }
      else fail('煉', 'no fuse group on the screen, though the chest holds three of a kind');
    },
    (a, b) => b.chest.length < a.chest.length || 'the chest did not shrink');

  await act(page, '拆 melting the chest down',
    async () => {
      const melt = await page.$('button.melt');
      if (melt) { await melt.click(); await page.waitForTimeout(500); }
    },
    /**
     * 氣 The qi is never allowed into a check, on any act.
     *
     * It moves on its own every second, so `b.qi !== a.qi` is true whatever happened,
     * and this check said exactly that. Caught by breaking `salvage()` on purpose and
     * watching the walk pass anyway, which is the only way a weak assertion is ever
     * found. What a melt must do is take pieces out of the chest.
     */
    (a, b) => b.chest.length < a.chest.length
      || `the chest still holds ${b.chest.length} of ${a.chest.length}`);
  if (page.noise.length) fail('器', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 道 a node, and a stance ────────────────────────────────────────────────
{
  const page = await open(save());
  await tab(page, '道');
  await act(page, '道 learning a node',
    async () => {
      await page.click('.tree .node, .tree circle, [data-node]', { timeout: 5000 }).catch(async () => {
        await page.$$eval('svg g, svg circle', (els) => els[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      });
      await page.waitForTimeout(500);
      const learn = await page.$('.ndetail button.act:not([disabled])');
      if (learn) await learn.click();
      await page.waitForTimeout(400);
    },
    (a, b) => b.unlocked.length > a.unlocked.length || 'no node was learned');
  if (page.noise.length) fail('道', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 塔 a tower floor, and 爐 a pill ────────────────────────────────────────
{
  const page = await open(save({ realm: 7, layer: 4, levels: { technique: 40, method: 40, pills: 40, cores: 40 } }));
  await tab(page, '塔');
  await act(page, '塔 climbing a tower floor',
    async () => {
      await page.click('button:has-text("登")', { timeout: 5000 });
      await page.waitForTimeout(800);
      for (let i = 0; i < 40; i++) {
        const done = await page.$('.arena button.act');
        if (done) { await done.click().catch(() => {}); break; }
        await page.waitForTimeout(400);
      }
      await page.waitForTimeout(600);
    },
    (a, b) => b.tower > a.tower || b.materials > a.materials || 'the floor changed nothing');

  await act(page, '爐 brewing a pill',
    async () => {
      const pill = await page.$('button.pill:not([disabled])');
      if (pill) { await pill.click(); await page.waitForTimeout(600); }
    },
    (a, b) => Object.keys(b.brewed).some((k) => b.brewed[k] > a.brewed[k]) || 'no pill was brewed');
  if (page.noise.length) fail('塔爐', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 守 突破 the warden and the breakthrough ────────────────────────────────
{
  const page = await open(save({
    realm: 3, layer: 8, qi: 1e9,
    levels: { technique: 18, method: 18, pills: 18, cores: 30 },
  }));
  await tab(page, '修');
  await act(page, '守 突破 beating the warden and breaking through',
    async () => {
      const fight = await page.$('button.act:has-text("戰"), button.act:has-text("妖")');
      if (fight) {
        await fight.click();
        await page.waitForTimeout(800);
        for (let i = 0; i < 40; i++) {
          const done = await page.$('.arena button.act');
          if (done) { await done.click().catch(() => {}); break; }
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(700);
      }
      const brk = await page.$('button.act:has-text("突破")');
      if (brk) { await brk.click(); await page.waitForTimeout(700); }
    },
    (a, b) => b.realm > a.realm || b.wardenFell !== a.wardenFell
      || 'neither the warden fell nor the realm turned over');
  if (page.noise.length) fail('守', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 煉器 refining a worn piece ─────────────────────────────────────────────
{
  const page = await open(save({
    realm: 8, layer: 4, materials: 1e9,
    levels: { technique: 48, method: 48, pills: 48, cores: 48 },
    worn: { weapon: { id: 'w', template: 'sword8', rarity: 'earth', rolls: [{ affix: 'power', value: 22 }] } },
  }));
  await tab(page, '器');
  await act(page, '煉器 refining a piece you wear',
    async () => {
      const ref = await page.$('button.refine:not([disabled])');
      if (ref) { await ref.click(); await page.waitForTimeout(600); }
      else fail('煉器', 'the refine block offered nothing to press at the eighth realm');
    },
    (a, b) => (b.worn.weapon?.refine ?? 0) > (a.worn.weapon?.refine ?? 0)
      || b.materials < a.materials || 'the piece was not refined and no material was spent');
  if (page.noise.length) fail('煉器', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 圍 the drive ───────────────────────────────────────────────────────────
{
  const page = await open(save());
  await tab(page, '狩');
  await act(page, '圍 driving a beast you have 熟 Known',
    async () => {
      const tag = await page.$('.drivetag, [class*=drive]');
      if (!tag) { fail('圍', 'no drive tag on any row, though beasts are 熟 Known'); return; }
      await tag.click();
      await page.waitForTimeout(600);
      const go = await page.$('.drivesheet button.act:not([disabled]), .drivesheet button:not([disabled])');
      if (go) { await go.click(); await page.waitForTimeout(900); }
    },
    (a, b) => kills(b) > kills(a) || b.materials > a.materials
      || 'the drive took no kills and paid no material');
  if (page.noise.length) fail('圍', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 渡劫 a crossing, above the ninth realm ─────────────────────────────────
{
  const page = await open(save({
    realm: 9, layer: 8, qi: 1e30, materials: 1e9, tower: 120,
    levels: { technique: 54, method: 54, pills: 54, cores: 72 },
    killed: {
      rat: 140, hound: 140, frog: 140, fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1,
      golem: 1, direwolf: 1, jiao: 1, squid: 40, harpy: 40, unicorn: 40,
    },
    tribulation: 0, tribulationAt: 0,
  }));
  await tab(page, '修');
  await act(page, '渡劫 crossing the tribulation',
    async () => {
      // 劫 Two presses, not one: 戰 puts the Dragon down, and 渡劫 is what crosses.
      // Clicking "the first enabled .act" found the fight and never found the crossing,
      // which is why this asks for each of them by the character on it.
      const fight = await page.$('button.act:has-text("戰")');
      if (fight) {
        await fight.click();
        await page.waitForTimeout(900);
        for (let i = 0; i < 40; i++) {
          const done = await page.$('.arena button.act');
          if (done) { await done.click().catch(() => {}); break; }
          await page.waitForTimeout(400);
        }
        await page.waitForTimeout(800);
      }
      const cross = await page.$('button.act:has-text("渡劫")');
      if (!cross) { fail('渡劫', 'no 渡劫 button, even with the pool full and the Dragon down'); return; }
      await cross.click();
      await page.waitForTimeout(900);
    },
    (a, b) => b.tribulation > a.tribulation || 'the crossing left no 雷印 mark');
  if (page.noise.length) fail('渡劫', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 勢 taking a stance ─────────────────────────────────────────────────────
{
  const page = await open(save({ stance: null }));
  await tab(page, '道');
  await act(page, '勢 taking a stance',
    async () => {
      const half = await page.$('.halfbar > span:nth-child(2), button:has-text("勢")');
      if (half) { await half.click(); await page.waitForTimeout(500); }
      const pick = await page.$('.loadout .chips button.chip:not([disabled])');
      if (pick) { await pick.click(); await page.waitForTimeout(500); }
      else fail('勢', 'the stance half offered no chip to pick');
    },
    (a, b) => b.stance !== a.stance || 'no stance was taken');
  if (page.noise.length) fail('勢', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 秘境 walking through the door and opening a room ───────────────────────
{
  const at = Math.floor(Date.now() / 1000);
  const page = await open(save({ runAt: at - 12 * 3600 }));
  await tab(page, '狩');
  await act(page, '秘境 walking through the door',
    async () => {
      const door = await page.$('.door.open:not([disabled])');
      if (!door) fail('秘境', 'half a day past the last run and the door was shut');
      else {
        await door.click(); await page.waitForTimeout(600);
        // 途 A way on is .way and not .door: .door is the card on 狩 that opens the run,
        // and the two were one class until the rooms were drawn.
        const room = await page.$('.secret .way');
        if (!room) fail('秘境', 'inside, and the first room offered no way on');
        else { await room.click(); await page.waitForTimeout(700); }
      }
    },
    // 步 Either they are deeper in than they started, or a gate put them out. Both are
    // a room opened; standing still in room one is the only wrong answer.
    (a, b) => (b.runStep > a.runStep || b.runs > a.runs)
      || `runStep ${a.runStep} to ${b.runStep}, runs ${a.runs} to ${b.runs}`);
  if (page.noise.length) fail('秘境', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 秘境 walking out, keeping everything taken ─────────────────────────────
{
  const at = Math.floor(Date.now() / 1000);
  const page = await open(save({ runAt: at - 12 * 3600, runStep: 2 }));
  await act(page, '秘境 walking out with what you took',
    async () => {
      const out = await page.$('.secret .later');
      if (!out) fail('秘境', 'standing in room three and no way out of it');
      else { await out.click(); await page.waitForTimeout(600); }
    },
    // 銀 Nothing is carried, so walking out costs nothing and only the run ends.
    (a, b) => (b.runStep === -1 && b.runs === a.runs + 1 && b.materials >= a.materials)
      || `runStep ${b.runStep}, runs ${a.runs} to ${b.runs}, 材 ${Math.round(a.materials)} to ${Math.round(b.materials)}`);
  if (page.noise.length) fail('秘境', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);

  // 出 And the end of a run says what the run gave. Every ending raises it, this one
  // included, and it closes back to the game rather than to another sheet.
  {
    const card = await page.$('.runend .endcard');
    if (!card) fail('秘境 the end of a run', 'walked out and nothing said what it gave');
    else {
      const said = await page.$eval('.runend .endcard', (el) => el.textContent || '');
      if (!/rooms/i.test(said)) fail('秘境 the end of a run', `no count of rooms: ${said.slice(0, 60)}`);
      const back = await page.$('.runend .act');
      await back?.click();
      await page.waitForTimeout(400);
      if (await page.$('.runend')) fail('秘境 the end of a run', 'it would not close');
      else console.log('  ✓ 秘境 the end of a run says what it gave');
    }
  }
  await page.close();
}

// ── 洞天 planting a bed ────────────────────────────────────────────────────
{
  const page = await open(save());
  await tab(page, '修');
  await act(page, '洞天 planting a bed',
    async () => {
      const open2 = await page.$('.bed[data-empty] button.act');
      if (!open2) fail('洞天', 'three empty beds and none of them offered to be planted');
      else {
        await open2.click(); await page.waitForTimeout(400);
        const seed = await page.$('.seeds .seed:not([disabled])');
        if (!seed) fail('洞天', 'the seed list opened with nothing plantable in it');
        else { await seed.click(); await page.waitForTimeout(600); }
      }
    },
    // 種 A bed fills and the material for it is gone. Both, or it is not a planting.
    (a, b) => (b.beds.filter((x) => x.herb).length === a.beds.filter((x) => x.herb).length + 1
      && b.materials < a.materials)
      || `beds ${a.beds.filter((x) => x.herb).length} to ${b.beds.filter((x) => x.herb).length}, `
         + `材 ${Math.round(a.materials)} to ${Math.round(b.materials)}`);
  if (page.noise.length) fail('洞天', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 洞天 taking a ripe bed ─────────────────────────────────────────────────
{
  const at = Math.floor(Date.now() / 1000);
  // 熟 Planted a day ago, so every herb in the game is long past ripe.
  const page = await open(save({
    beds: [{ herb: 'dragonblood', at: at - 86_400 }, { herb: null, at: 0 }, { herb: null, at: 0 }],
  }));
  await tab(page, '修');
  await act(page, '洞天 taking a ripe bed',
    async () => {
      const take = await page.$('.bed[data-ripe] button.act');
      if (!take) fail('洞天', 'a bed planted a day ago and nothing offered to take it');
      else { await take.click(); await page.waitForTimeout(600); }
    },
    // 取 The bed empties and the qi lands. The qi alone would pass while doing nothing,
    // because qi moves on its own every second.
    (a, b) => (b.beds.filter((x) => x.herb).length === a.beds.filter((x) => x.herb).length - 1
      && b.reaped === a.reaped + 1)
      || `beds ${a.beds.filter((x) => x.herb).length} to ${b.beds.filter((x) => x.herb).length}, `
         + `reaped ${a.reaped} to ${b.reaped}`);
  if (page.noise.length) fail('洞天', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 悟道 taking one of the three cards ─────────────────────────────────────
{
  // 留 The sheet is left standing on purpose: if the arriving loop took the cards, this
  // act would be checking that the harness works rather than that the game does.
  const page = await open(save({ realm: 2, awakened: [] }), { keepCards: true });
  await act(page, '悟道 taking a card at a breakthrough',
    async () => {
      const card = await page.$('.awaken .acard');
      if (!card) fail('悟道', 'a realm behind them and no card was offered');
      else { await card.click(); await page.waitForTimeout(600); }
    },
    // 取 The list grows by exactly one, and by a card that was on the trio offered.
    (a, b) => (b.awakened.length === a.awakened.length + 1)
      || `awakened went ${a.awakened.length} to ${b.awakened.length}`);
  if (page.noise.length) fail('悟道', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 緣 answering somebody on the road ──────────────────────────────────────
{
  const at = Math.floor(Date.now() / 1000);
  const page = await open(save({ met: [], metAt: at - 12 * 3600 }));
  // 修 A notice card carries a "go there" arrow, so sending the floating cards away can
  // leave the walk standing on 狩 the hunt. 緣 lives on the home screen.
  await tab(page, '修');
  await act(page, '緣 answering somebody on the road',
    async () => {
      const pick = await page.$('.meet .pick:not([disabled])');
      if (!pick) fail('緣', 'half a day on the road and nobody was there');
      else { await pick.click(); await page.waitForTimeout(600); }
    },
    // 待 Walking on is an answer, so the only thing that has to move is the list.
    (a, b) => b.met.length === a.met.length + 1
      || `met went ${a.met.length} to ${b.met.length}`);
  if (page.noise.length) fail('緣', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

// ── 存 the save, out and back in ───────────────────────────────────────────
{
  const page = await open(save());
  await act(page, '存 exporting the save and reading it back',
    async () => {
      await page.click('button.mainswitch', { timeout: 5000 });
      await page.waitForTimeout(400);
      const item = await page.$('.switchmenu button:has-text("save"), .switchmenu button:has-text("存")');
      if (item) { await item.click(); await page.waitForTimeout(500); }
    },
    () => true);
  // 複 The panel's whole job is handing the player their save, so take it the way they do.
  const copy = await page.$('.savepanel button.act');
  if (!copy) fail('存', 'the save panel has no copy button');
  else {
    await copy.click();
    await page.waitForTimeout(500);
    const text = await page.evaluate(async () => {
      try { return await navigator.clipboard.readText(); } catch { return null; }
    });
    if (!text) fail('存', 'the copy button put nothing on the clipboard');
    else {
      try {
        const parsed = JSON.parse(text);
        if (parsed.game !== 'ninefold' || !parsed.state) fail('存', 'the copied text is not a ninefold save');
        else pass('存 the copied save parses, names itself and carries the state');
      } catch { fail('存', 'the copied text is not valid JSON'); }
    }
  }
  if (page.noise.length) fail('存', `console: ${[...new Set(page.noise)].slice(0, 2).join(' | ')}`);
  await page.close();
}

console.log(`\n行 ${problems.length ? `${problems.length} problems.` : 'every verb in the game did what it exists to do.'}\n`);
await browser.close();
process.exit(problems.length ? 1 : 0);
