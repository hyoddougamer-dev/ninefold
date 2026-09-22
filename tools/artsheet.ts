/**
 * 藝 The art sheet: everything 九境 draws, on one page, with the numbers under it.
 *
 * Bruno: *"preciso de um resumo da arte existente, penso que de momento seja a parte
 * mais fraca do jogo."* A summary of art written in prose is worth nothing, so this is
 * the contact sheet: every drawing the game has, called through the game's own
 * functions, at the size the player meets it and again large enough to see what it is.
 * The verdict at the top is mine, and everything it claims is visible underneath it.
 *
 * Run with `npm run artsheet`. It writes art.html.
 */
import { writeFileSync } from 'node:fs';
import { BEASTS, WARDENS } from '../src/data/bestiary.ts';
import { REALMS, realm as realmOf } from '../src/data/realms.ts';
import { GEAR, RARITIES, RARITY_INFO, SLOTS, SLOT_INFO, REALM_SETS } from '../src/data/gear.ts';
import { ARTS, STANCES } from '../src/data/arts.ts';
import { PILL_LINES } from '../src/data/alchemy.ts';
import { ALL_CARDS } from '../src/data/awakening.ts';
import { MEETINGS } from '../src/data/meetings.ts';
import { HERBS } from '../src/data/herbs.ts';
import { ROOM_INFO } from '../src/data/secret.ts';
import { HEAVENS } from '../src/data/heavens.ts';
import { ALL_NODES } from '../src/data/techniques.ts';
import { AUTHORS, ICONS } from '../src/art/icons.generated.ts';
import { icon } from '../src/art/icon.ts';
import { portrait, seal } from '../src/art/aura.ts';
import { arenaScene } from '../src/art/scene.ts';
import { gearTile } from '../src/art/gear.ts';
import { tower, furnace, pool } from '../src/art/trials.ts';
import { chamber } from '../src/art/secret.ts';
import { PLATE_CSS, liftArt, writePlates } from './lift.ts';

/** 數 What there is, counted rather than remembered. */
const gearIcons = new Set(GEAR.map((g) => g.icon));
const referenced = new Set<string>();
const add = (k?: string) => { if (k) referenced.add(k); };
BEASTS.forEach((b) => add(b.icon));
GEAR.forEach((g) => add(g.icon));
[...ARTS, ...ALL_CARDS, ...MEETINGS, ...HERBS, ...ALL_NODES, ...Object.values(PILL_LINES)]
  .forEach((x) => add((x as { icon?: string }).icon));
Object.values(ROOM_INFO).forEach((r) => add(r.icon));
HEAVENS.forEach((h) => add(h.dragon.icon));
REALMS.forEach((r) => r.aura.forEach(add));

/**
 * 一 Every icon is drawn at the same size on this page, on purpose.
 *
 * The drawings are lifted into files named after a hash of themselves, so an icon at 44
 * and the same icon at 38 are two files. Holding them all at one size is what keeps the
 * page to one file per drawing rather than three.
 */
const ICON_SIZE = 40;
const cell = (key: string, label: string, sub: string, colour: string, size = ICON_SIZE) => `
  <figure class="cell" style="--hue:${colour}">
    <span class="ic" style="width:${size}px;height:${size}px">${icon(key, size)}</span>
    <figcaption><b>${label}</b><i>${sub}</i></figcaption>
  </figure>`;

/** 獸 Every beast, in the colour of the realm it lives in. */
const beasts = REALMS.map((r) => {
  const mine = BEASTS.filter((b) => b.realm === r.n);
  return `<div class="band" style="--hue:${r.colour}">
    <h4><span class="cjk">${r.han}</span> ${r.name}</h4>
    <div class="grid">${mine.map((b) => cell(b.icon, b.han,
      `${b.name}${WARDENS.some((w) => w.key === b.key) ? ' · warden' : ''}`, r.colour)).join('')}</div>
  </div>`;
}).join('');

/** 器 The gear, which is 54 drawings carrying 486 pieces. */
const gearBySlot = SLOTS.map((slot) => {
  const mine = GEAR.filter((g) => g.slot === slot);
  const seen = new Set<string>();
  const one = mine.filter((g) => !seen.has(g.icon) && seen.add(g.icon));
  return `<div class="band" style="--hue:var(--cyan)">
    <h4><span class="cjk">${SLOT_INFO[slot].han}</span> ${SLOT_INFO[slot].name}
      <em>${mine.length} pieces, ${one.length} drawings</em></h4>
    <div class="grid">${one.map((g) => cell(g.icon, g.han, g.name, '#5FDCFF')).join('')}</div>
  </div>`;
}).join('');

/** 階 The same sword at all five ranks, which is the whole of what a rank looks like. */
const sword = GEAR.find((g) => g.slot === 'weapon' && g.realm === 5)!;
const ranks = RARITIES.map((rank) => `
  <figure class="cell wide">
    ${gearTile({ id: rank, template: sword.key, rarity: rank, rolls: [] }, { size: 76 })}
    <figcaption><b class="cjk">${RARITY_INFO[rank].han}</b><i>${RARITY_INFO[rank].name}</i></figcaption>
  </figure>`).join('');

/** 境 Nine realms, one figure, and the air around it doing all the work. */
const portraits = REALMS.map((r) => `
  <figure class="cell wide" style="--hue:${r.colour}">
    <span class="fig">${portrait({ realm: r.n })}</span>
    <figcaption><b class="cjk">${r.han}</b><i>${r.name}</i></figcaption>
  </figure>`).join('');

const scenes = [1, 5, 9].map((n) => `
  <figure class="cell scene">
    <span class="sc">${arenaScene(n)}</span>
    <figcaption><b class="cjk">${realmOf(n).han}</b><i>${realmOf(n).name}</i></figcaption>
  </figure>`).join('');

const rooms = (['spring', 'shrine', 'brazier', 'beast'] as const).map((k, i) => `
  <figure class="cell scene">
    <span class="sc">${chamber({ kind: k, step: i * 2, realm: 6 })}</span>
    <figcaption><b class="cjk">${ROOM_INFO[k].han}</b><i>${ROOM_INFO[k].name}</i></figcaption>
  </figure>`).join('');

const places = `
  <figure class="cell wide"><span class="fig">${tower(60)}</span>
    <figcaption><b class="cjk">無盡塔</b><i>The tower, at floor 60</i></figcaption></figure>
  <figure class="cell wide"><span class="fig">${furnace(7, 18)}</span>
    <figcaption><b class="cjk">丹爐</b><i>The furnace, 18 brewed</i></figcaption></figure>
  <figure class="cell wide"><span class="fig">${pool(0.7, 4)}</span>
    <figcaption><b class="cjk">雷池</b><i>The pool, at four marks</i></figcaption></figure>`;

const seals = WARDENS.map((w) => `
  <figure class="cell" style="--hue:${realmOf(w.realm).colour}">
    <span class="sl">${seal(w.icon, realmOf(w.realm).colour, true)}</span>
    <figcaption><b class="cjk">${w.han}</b><i>${w.name}</i></figcaption>
  </figure>`).join('');

const library = Object.keys(ICONS).sort().map((k) => `
  <figure class="cell lib" data-off="${referenced.has(k) ? undefined : 'true'}">
    <span class="ic" style="width:${ICON_SIZE}px;height:${ICON_SIZE}px">${icon(k, ICON_SIZE)}</span>
    <figcaption><i>${k}</i></figcaption>
  </figure>`).join('');

const group = (han: string, name: string, items: readonly { han: string; name: string; icon: string }[]) => `
  <div class="band" style="--hue:var(--gold)">
    <h4><span class="cjk">${han}</span> ${name} <em>${items.length}</em></h4>
    <div class="grid">${items.map((x) => cell(x.icon, x.han, x.name, '#FFCE6B')).join('')}</div>
  </div>`;

const page = `<meta charset="utf-8">
<title>九境 Ninefold · 藝 the art, as it stands</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#080A18; --panel:#111433; --panel2:#0C0F26; --line:#252A5C;
          --cyan:#5FDCFF; --magenta:#FF5FC8; --text:#E7EAFF; --faint:#8289C0;
          --gold:#FFCE6B; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.65 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:920px; margin:0 auto; padding:34px 18px 90px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(38px,11vw,56px); font-weight:400;
       color:var(--cyan); line-height:1; margin:0; }
  h2 { font-family:Rajdhani,sans-serif; font-size:25px; margin:0; display:flex; gap:11px;
       align-items:baseline; }
  h2 .h { font-family:'Noto Serif SC',serif; font-weight:400; font-size:29px; color:var(--cyan); }
  h3 { font-family:Rajdhani,sans-serif; font-size:13px; color:var(--faint); margin:0;
       letter-spacing:.1em; text-transform:uppercase; }
  h4 { font-family:Rajdhani,sans-serif; font-size:15px; margin:0 0 9px; font-weight:700;
       display:flex; gap:9px; align-items:baseline; color:var(--hue); }
  h4 .cjk { font-weight:400; font-size:18px; }
  h4 em { font-style:normal; margin-left:auto; font-size:12px; color:var(--faint);
          font-family:Archivo,sans-serif; font-weight:400; }
  p { margin:0; }
  .lead { font-size:19px; margin-top:13px; color:var(--faint); }
  .sec { margin-top:38px; border-top:1px solid var(--line); padding-top:20px;
         display:flex; flex-direction:column; gap:13px; }
  .t { color:var(--faint); max-width:64ch; }
  .t b { color:var(--text); font-weight:600; }
  .rule { border-left:3px solid var(--cyan); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; color:var(--faint); }
  .rule b { color:var(--cyan); }
  .warn { border-left:3px solid var(--magenta); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; color:var(--faint); }
  .warn b { color:var(--magenta); }
  .tally { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:8px; }
  .tally span { background:var(--panel2); border:1px solid var(--line); border-radius:11px;
                padding:11px 13px; }
  .tally b { display:block; font-family:Rajdhani,sans-serif; font-weight:700; font-size:23px;
             color:var(--gold); }
  .tally i { font-style:normal; font-size:11.5px; color:var(--faint); }
  .band { background:var(--panel2); border:1px solid var(--line); border-radius:13px;
          padding:14px 15px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(86px,1fr)); gap:10px; }
  .cell { margin:0; display:flex; flex-direction:column; align-items:center; gap:6px;
          text-align:center; }
  .cell .ic { display:grid; place-items:center; color:var(--hue,var(--cyan)); }
  .cell .ic svg { display:block; }
  .cell figcaption b { display:block; font-size:14px; font-weight:400; color:var(--hue,var(--cyan));
                       font-family:'Noto Serif SC',serif; }
  .cell figcaption i { display:block; font-style:normal; font-size:10.5px; color:var(--faint);
                       line-height:1.3; }
  .cell.wide { width:auto; }
  .cell .fig { display:block; width:130px; height:130px; }
  .cell .fig svg { display:block; width:100%; height:100%; }
  .cell .sl svg { display:block; }
  .cell.scene { width:100%; }
  .cell .sc { display:block; width:100%; height:118px; border-radius:11px; overflow:hidden;
              border:1px solid var(--line); }
  .cell .sc svg { display:block; width:100%; height:100%; }
  .wides { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:12px; }
  .scenes { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:12px; }
  .cell.lib[data-off] { opacity:.4; }
  .cell.lib figcaption i { font-size:9.5px; word-break:break-all; }
  .libgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(70px,1fr)); gap:9px; }
  .bands { display:grid; gap:10px; }
  table { border-collapse:collapse; width:100%; font-size:14px; }
  th { text-align:left; font-family:Rajdhani,sans-serif; font-size:12px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; padding:0 8px 6px; font-weight:700; }
  td { border-top:1px solid var(--line); padding:7px 8px; color:var(--faint); }
  td b { color:var(--text); font-weight:600; }
  code { font-family:'Roboto Mono',monospace; font-size:13px; color:var(--cyan); }
  ${PLATE_CSS}
</style>

<div class="sheet">
  <header>
    <h1>藝</h1>
    <p class="lead"><b style="color:var(--text)">The art of 九境, as it stands.</b>
      Every drawing the game has, called through the game's own functions, at the size a
      player meets it and again large enough to see what it is. Nothing here is a mockup:
      if it is on this page, it is in the game.</p>
  </header>

  <section class="sec">
    <h2><span class="h">數</span> What there is</h2>
    <div class="tally">
      <span><b>${Object.keys(ICONS).length}</b><i>icons in the library</i></span>
      <span><b>${referenced.size}</b><i>of them used</i></span>
      <span><b>${AUTHORS.length}</b><i>artists, all borrowed</i></span>
      <span><b>6</b><i>drawings written as code</i></span>
      <span><b>${BEASTS.length}</b><i>beasts</i></span>
      <span><b>${GEAR.length}</b><i>pieces of gear</i></span>
      <span><b>${gearIcons.size}</b><i>gear drawings</i></span>
      <span><b>${REALMS.length}</b><i>realms drawn</i></span>
    </div>
    <p class="t">The library is <b>game-icons.net</b> under CC BY 3.0, by
      ${AUTHORS.join(', ')}. The six written as code are 氣象 the portrait, 境 the arena,
      塔 the tower, 爐 the furnace, 雷池 the pool and 秘境 the chambers. Those six are the
      only drawings in the game that are a <b>reading of the save</b> rather than a
      picture: the tower has as many tiers as you have seals, the furnace burns as high
      as you have brewed, the arches of a room recede with how deep you are in the run.</p>
  </section>

  <section class="sec">
    <h2><span class="h">弱</span> Where it is weakest, and why</h2>
    <div class="warn"><b>一 Every thing in the game is one borrowed silhouette.</b>
      ${referenced.size} icons, eight authors, one flat colour each. Side by side the
      line weights and the density do not match, because they were never drawn to sit
      together: some are three heavy shapes, some are forty thin ones. At 22 to 44 pixels
      in a list that reads as a set of symbols rather than as a world. Scroll 獸 the
      beasts below and the mismatch is visible in one screen.</div>
    <div class="warn"><b>二 The same drawing carries nine realms.</b>
      ${GEAR.length} pieces of gear are ${gearIcons.size} drawings recoloured. A first
      realm 凡 Common sword and a ninth realm 天 Heaven sword are the same shape: what
      changes is the frame, the glow and the two small characters in the corners. The
      frames are good and they are doing all of the work.</div>
    <div class="warn"><b>三 The fight is the thing a player looks at most, and it is the
      least drawn.</b> 境 The arena is a real place and 氣象 the cultivator is a real
      drawing, and the beast opposite is a flat single-colour icon at 70% of the frame.
      One side of every fight in the game has art and the other side has a symbol.</div>
    <div class="warn"><b>四 勢 The nine stances have no drawing at all.</b> A stance is
      the one thing in the game you choose and then carry into every fight, and it is
      two characters and a line of text. The nine arts have icons; their stances do
      not.</div>
    <div class="rule"><b>What is actually good, and worth building on.</b> The six
      procedural drawings look like one hand, they all read the save, and they cost
      nothing to extend. 印 The warden seals are the proof: the same borrowed silhouette
      inside a drawn frame stops reading as clip art and starts reading as a set. That
      treatment exists and is used on nine beasts out of ${BEASTS.length}.</div>
  </section>

  <section class="sec">
    <h2><span class="h">獸</span> The beasts</h2>
    <p class="t">${BEASTS.length} of them, three commons and a warden to a realm, in the
      colour of the realm they live in. This is the screen the mismatch is easiest to
      see on: compare the weight of 山鼠 the rat with 石猿 the stone ape two rows down.</p>
    <div class="bands">${beasts}</div>
  </section>

  <section class="sec">
    <h2><span class="h">印</span> The warden seals</h2>
    <p class="t">The same icons, inside a drawn frame that the game generates. Nine of
      them, and they are the strongest thing on this page: a frame is what makes a
      borrowed silhouette belong to a set.</p>
    <div class="band"><div class="grid">${seals}</div></div>
  </section>

  <section class="sec">
    <h2><span class="h">器</span> The gear</h2>
    <p class="t">${gearIcons.size} drawings, one per archetype, and every one of them is
      worn at all nine realms and at all five ranks. That is ${GEAR.length} pieces from
      ${gearIcons.size} pictures, nine pieces to a picture.</p>
    <div class="bands">${gearBySlot}</div>
    <h3>階 And what a rank looks like</h3>
    <p class="t">The same sword at all five: the frame, the corner marks and the glow are
      the whole of the difference. ${REALM_SETS.length} realm sets exist and they are told
      apart by colour and by the lineage character in the bottom left.</p>
    <div class="band"><div class="wides">${ranks}</div></div>
  </section>

  <section class="sec">
    <h2><span class="h">境</span> The nine realms</h2>
    <p class="t">One figure, and the air around it doing all the work. The rule the file
      keeps is that a realm has to be readable from the aura alone, without reading a
      word, and it holds. What it does not do is ever change the figure.</p>
    <div class="band"><div class="wides">${portraits}</div></div>
  </section>

  <section class="sec">
    <h2><span class="h">場</span> The places that are drawn from the save</h2>
    <p class="t">境 The arena is the beast's own realm: its sky, its hills, its floor.
      Three of the nine are here.</p>
    <div class="band"><div class="scenes">${scenes}</div></div>
    <h3>秘境 And the rooms of the run</h3>
    <div class="band"><div class="scenes">${rooms}</div></div>
    <h3>塔 爐 雷池 The three late places</h3>
    <div class="band"><div class="wides">${places}</div></div>
  </section>

  <section class="sec">
    <h2><span class="h">物</span> Everything else that has a picture</h2>
    <div class="bands">
      ${group('訣', 'Arts', ARTS)}
      <div class="band" style="--hue:var(--magenta)">
        <h4><span class="cjk">勢</span> Stances <em>${STANCES.length}, none of them drawn</em></h4>
        <div class="grid">${STANCES.map((x) => `
          <figure class="cell" style="--hue:var(--magenta)">
            <span class="ic" style="width:${ICON_SIZE}px;height:${ICON_SIZE}px;
                  border:1px dashed var(--line);border-radius:9px"></span>
            <figcaption><b>${x.han}</b><i>${x.name}</i></figcaption>
          </figure>`).join('')}</div>
      </div>
      ${group('悟道', 'Awakening cards', ALL_CARDS)}
      ${group('緣', 'Meetings', MEETINGS)}
      ${group('靈草', 'Herbs', HERBS)}
      ${group('龍', 'The dragons of the heavens', HEAVENS.map((h) => ({ han: h.dragon.han, name: h.dragon.name, icon: h.dragon.icon })))}
      ${group('秘境', 'The rooms', Object.values(ROOM_INFO))}
      ${group('丹', 'The pill lines', Object.values(PILL_LINES))}
    </div>
  </section>

  <section class="sec">
    <h2><span class="h">庫</span> The whole library</h2>
    <p class="t">All ${Object.keys(ICONS).length} icons the game ships, in one place. The
      faded ones are the ${Object.keys(ICONS).length - referenced.size} nothing points at
      yet.</p>
    <div class="band"><div class="libgrid">${library}</div></div>
  </section>

  <section class="sec">
    <h2><span class="h">路</span> Where the next hour of art should go</h2>
    <p class="t">In order of what a player looks at per minute, which is the only
      ordering worth using:</p>
    <table>
      <tr><th>What</th><th>Why it is first</th></tr>
      <tr><td><b>對 The beast in the arena</b></td>
        <td>Every fight in the game shows a drawn cultivator against a flat symbol. Giving
          the beast the same treatment the cultivator has, a frame and an aura of its own
          realm, is one function and it fixes the most looked at screen.</td></tr>
      <tr><td><b>印 A frame for every beast</b></td>
        <td>The seals already do it for nine. Extending the same frame to all
          ${BEASTS.length} makes eight authors read as one set without redrawing a single
          silhouette.</td></tr>
      <tr><td><b>階 A rank that changes shape</b></td>
        <td>天 Heaven and 凡 Common differ in frame and glow only. A silhouette that gains
          something at 玄 and again at 天 would make a drop readable at a glance.</td></tr>
      <tr><td><b>氣象 A figure that climbs</b></td>
        <td>The aura earns its nine realms and the figure never changes. Even a posture
          change at the fourth and the seventh would make the portrait a progress bar.</td></tr>
      <tr><td><b>動 Motion</b></td>
        <td>There is almost none: a few CSS transitions and one animated clash. A fight is
          two static figures and a number.</td></tr>
    </table>
    <p class="t">None of these needs an artist. Every one of them is a function in
      <code>src/art/</code> that reads the save, which is the thing this game's art is
      already good at.</p>
  </section>

  <footer class="sec" style="color:var(--faint);font-size:13.5px">
    <p>Written by <code>npm run artsheet</code> from the game's own tables and drawing
      functions. Icons from game-icons.net under CC BY 3.0.</p>
  </footer>
</div>
`;

// 圖外 The drawings come off the page and live beside it, the same way 頁 the bible's
// do: this page is almost nothing but drawings, and inline it is three quarters of a
// megabyte, which is a page that cannot be republished over itself.
const lifted = liftArt(page, 'art-plates');
writeFileSync('art.html', lifted.page);
const plateKb = Math.round(writePlates('art-plates', lifted.plates) / 1024);
console.log(`art.html · ${Math.round(lifted.page.length / 1024)} KB · ${Object.keys(ICONS).length} icons, `
  + `${referenced.size} used, ${gearIcons.size} gear drawings for ${GEAR.length} pieces`);
console.log(`art-plates/ · ${lifted.plates.size} drawings · ${plateKb} KB, lifted off the page`);
