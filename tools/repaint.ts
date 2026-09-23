/**
 * 色 The repainting, before and beside after.
 *
 * Bruno, on seeing the first real paintings next to the game: *"sim vamos ter de alterar
 * a paleta no geral para fazer sentido."* He is right, and this is the receipt. Every
 * pair on this page is the same cultivator on the same screen, shot out of the real app
 * by `node tools/shot-screens.mjs`, before the palette changed and after it.
 *
 * 圖 A palette is not a change that can be reported in words, and this repository's one
 * standing rule about the look is that it is shown. So the page is built from the
 * screenshots rather than from a description of them, and it reads the two folders: if a
 * screen was not shot, it is not on the page.
 *
 * Run with `npm run repaint`. It writes repaint.html.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { REALMS } from '../src/data/realms.ts';
import { HEAVENS } from '../src/data/heavens.ts';
import { RARITY_INFO } from '../src/data/gear.ts';

/** 舊 What each one used to be, kept here so the page can show the change rather than assert it. */
const WAS = {
  realms: ['#5FDCFF', '#5FC4FF', '#77AEFF', '#9B9BFF', '#B587FF', '#CC79FF', '#E571F0', '#FF63CE', '#FF5AA6'],
  heavens: ['#FF5AA6', '#FF6E8E', '#FF8878', '#FFA268', '#FFBC5E', '#FFCE6B', '#FFE08F', '#FFEFC0', '#FFFFFF'],
  rarities: ['#7A80B8', '#5FDCFF', '#9B9BFF', '#FFCE6B', '#FF5FC8'],
  chrome: [
    ['ground', '#080A18', '#14110D', 'The page. Midnight blue, now ink.'],
    ['panel', '#111433', '#1E1A14', 'A card.'],
    ['line', '#252A5C', '#3A3226', 'Every border.'],
    ['text', '#E7EAFF', '#EDE3D2', 'What you read. Blue-white, now paper.'],
    ['faint', '#7A80B8', '#9C907C', 'The second line of everything.'],
    ['accent', '#5FDCFF', '#7FB495', 'Alive: the open tab, the live number. Cyan, now jade.'],
    ['rare', '#FF5FC8', '#D2604E', 'Rare or dangerous. Magenta, now cinnabar.'],
    ['gold', '#FFCE6B', '#D4AF56', 'A price, a payoff. Now gold leaf.'],
  ] as const,
};

const SCREENS = [
  ['cultivate', '修', 'Cultivate', 'The screen the game is mostly looked at on.'],
  ['hunt', '狩', 'Hunt', 'Thirty-six paintings land here. It was thirty-six silhouettes.'],
  ['arena', '鬥', 'The fight',
   'Three changes, and the first one was a mistake of mine. The beast wore 牌 the plate here, and at full size a painting on a paper disc inside a ring is a sticker: Bruno, <i>"está um badge ampliado e mal cortado circular."</i> So the creature now stands in the place with the paper keyed off it, the circle that was clipping the crab\'s claws is gone, and the realm\'s own landscape is behind instead of the drawn ridges.'],
  ['trials', '塔', 'Trials', 'The tower now climbs through the realm ramp: jade at the foot, cinnabar at the top.'],
  ['gear', '器', 'Gear', 'The rarities are minerals now: plain stone, jade, old bronze, gold leaf, cinnabar.'],
  ['dao', '道', 'The path', 'Three branches: a blade, a spirit, and luck.'],
] as const;

/** 境 One screen has no before, because it did not have a painting to show until now. */
const NEW_SCREENS = [
  ['realmcard', '境', 'What a realm is',
   'The nine landscapes were painted for this: mountains across the middle and an empty bottom, so the name can sit on it. Before this there was only the figure.'],
] as const;

const pair = (key: string, han: string, name: string, note: string) => {
  const before = `shots-before/${key}.png`;
  const after = `shots-after/${key}.png`;
  if (!existsSync(before) || !existsSync(after)) return '';
  return `<section class="sec">
    <h2><span class="h cjk">${han}</span> ${name}</h2>
    <p class="t">${note}</p>
    <div class="rpair">
      <figure><img src="${before}" alt="${name} before"><figcaption>Before</figcaption></figure>
      <figure><img src="${after}" alt="${name} after"><figcaption>After</figcaption></figure>
    </div>
  </section>`;
};

const ramp = (was: readonly string[], now: readonly { colour: string; han: string; name: string }[], stuffs: readonly string[]) =>
  `<div class="rramp">
    ${now.map((r, i) => `<figure>
      <span class="chips"><i style="background:${was[i]}"></i><i style="background:${r.colour}"></i></span>
      <figcaption><b class="cjk">${r.han}</b><i>${r.name}</i><em>${stuffs[i] ?? ''}</em></figcaption>
    </figure>`).join('')}
  </div>`;

const page = `<meta charset="utf-8">
<title>九境 Ninefold · 色 the repainting</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#14110D; --panel:#1E1A14; --panel2:#191510; --line:#3A3226;
          --paper:#EDE3D2; --text:#DCD2C2; --faint:#9C907C; --gold:#D4AF56;
          --jade:#7FB495; --cinnabar:#D2604E; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.7 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:980px; margin:0 auto; padding:34px 18px 90px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(40px,12vw,60px); font-weight:400;
       color:var(--gold); line-height:1; margin:0; }
  h2 { font-family:Rajdhani,sans-serif; font-size:26px; margin:0; display:flex; gap:11px;
       align-items:baseline; color:var(--paper); }
  h2 .h { font-family:'Noto Serif SC',serif; font-weight:400; font-size:30px; color:var(--gold); }
  p { margin:0; }
  .lead { font-size:19px; margin-top:14px; color:var(--faint); }
  .sec { margin-top:40px; border-top:1px solid var(--line); padding-top:22px;
         display:flex; flex-direction:column; gap:14px; }
  .t { color:var(--faint); max-width:68ch; }
  .t b { color:var(--paper); font-weight:600; }
  .rule { border-left:3px solid var(--gold); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; color:var(--faint); }
  .rule b { color:var(--gold); }
  .rpair { display:grid; gap:14px; grid-template-columns:1fr 1fr; }
  .rpair figure { margin:0; }
  .rpair img { display:block; width:100%; border:1px solid var(--line); border-radius:6px; }
  .rpair figcaption { margin-top:7px; font-size:11px; letter-spacing:.16em;
                      text-transform:uppercase; color:var(--faint); font-weight:600; }
  .rramp { display:grid; gap:10px; grid-template-columns:repeat(auto-fill,minmax(122px,1fr)); }
  .rramp figure { margin:0; }
  .rramp .chips { display:grid; grid-template-columns:1fr 1fr; height:42px; border-radius:4px;
                  overflow:hidden; }
  .rramp .chips i { display:block; }
  .rramp figcaption { margin-top:6px; }
  .rramp b { display:block; font-family:'Noto Serif SC',serif; font-weight:400; font-size:16px;
             color:var(--paper); }
  .rramp i { display:block; font-style:normal; font-size:11.5px; color:var(--faint); }
  .rramp em { display:block; font-style:normal; font-size:10px; color:var(--gold);
              letter-spacing:.09em; text-transform:uppercase; }
  table { border-collapse:collapse; width:100%; font-size:14px; }
  th { text-align:left; font-family:Rajdhani,sans-serif; font-size:12px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; padding:0 8px 6px; font-weight:700; }
  td { border-top:1px solid var(--line); padding:8px; color:var(--faint); vertical-align:top; }
  td b { color:var(--paper); font-weight:600; }
  .sw { display:inline-block; width:15px; height:15px; border-radius:3px; vertical-align:-2px;
        margin-right:6px; }
  code { font-family:'Roboto Mono',monospace; font-size:12.5px; color:var(--gold); }
  a { color:var(--gold); }
</style>

<div class="sheet">
  <header>
    <h1>色</h1>
    <p class="lead"><b style="color:var(--paper)">The game is repainted.</b> Cyan and
      magenta on blue-black are gone, and what is there instead is ink, aged paper, gold
      leaf and cinnabar: the four things actually used on a Chinese painting.</p>
    <p class="t" style="margin-top:12px">Bruno, seeing the first thirty-six paintings land
      in a neon game: <i>"sim vamos ter de alterar a paleta no geral para fazer sentido."</i>
      Every pair below is the same cultivator on the same screen, shot out of the real app
      before and after.</p>
  </header>

  <section class="sec">
    <h2><span class="h">骨</span> The eight colours everything is made of</h2>
    <p class="t">Left half of each chip is what it was. <b>Nothing in the new set emits
      light.</b> That is the whole rule: a lantern and the moon are allowed to, and
      nothing else is.</p>
    <table>
      <tr><th>Token</th><th>Was</th><th>Is</th><th>What wears it</th></tr>
      ${WAS.chrome.map(([name, was, now, what]) => `<tr>
        <td><b>${name}</b></td>
        <td><span class="sw" style="background:${was}"></span><code>${was}</code></td>
        <td><span class="sw" style="background:${now}"></span><code>${now}</code></td>
        <td>${what}</td></tr>`).join('')}
    </table>
  </section>

  <section class="sec">
    <h2><span class="h">境</span> The nine realms</h2>
    <p class="t">The ramp keeps its one job, which is that a realm must be readable from
      its colour alone. What changed is the road it walks: <b>jade, then gold, then
      cinnabar, then imperial violet.</b> Green is the first breath and the body, gold is
      the core, red is the furnace and the tribulation, and violet is what is left after
      all of it.</p>
    ${ramp(WAS.realms, REALMS, REALMS.map((r) => r.stuff))}
    <div class="rule"><b>Each is lifted a little off the true pigment.</b> A realm's name
      is written in its colour on a dark ground, and true cinnabar at <code>#B4332C</code>
      is not readable there. The pigment itself is in the paintings. This is the pigment
      seen by lamplight.</div>
  </section>

  <section class="sec">
    <h2><span class="h">境外</span> The nine heavens</h2>
    <p class="t">They carry on from where 渡劫 the ninth realm ends, so they leave in
      imperial violet and climb through gold leaf to bone white.</p>
    ${ramp(WAS.heavens, HEAVENS, HEAVENS.map(() => ''))}
  </section>

  <section class="sec">
    <h2><span class="h">器</span> The five rarities</h2>
    <p class="t">As materials rather than as hues, which is what they were always called:
      plain stone, jade, old bronze, gold leaf, cinnabar.</p>
    ${ramp(WAS.rarities, Object.values(RARITY_INFO), ['plain stone', 'jade', 'old bronze', 'gold leaf', 'cinnabar'])}
  </section>

  ${SCREENS.map(([k, han, name, note]) => pair(k, han, name, note)).join('')}

  ${NEW_SCREENS.map(([k, han, name, note]) => existsSync(`shots-after/${k}.png`)
    ? `<section class="sec">
    <h2><span class="h cjk">${han}</span> ${name}</h2>
    <p class="t">${note}</p>
    <div class="rpair"><figure><img src="shots-after/${k}.png" alt="${name}"><figcaption>New</figcaption></figure></div>
  </section>`
    : '').join('')}

  <footer class="sec" style="color:var(--faint);font-size:13.5px">
    <p>Written by <code>npm run repaint</code>, from the screenshots
      <code>node tools/shot-screens.mjs</code> takes out of the built game. The ramps are
      read from the game's own tables, so this page cannot show a colour the game does not
      use.</p>
  </footer>
</div>
`;

writeFileSync('repaint.html', page);
console.log(`repaint.html · ${Math.round(page.length / 1024)} KB`);
