/**
 * 旗 The banners at the head of every Discord post: the guides, the dev logs, the
 * welcome and the launch. One design, drawn from the game's own art, so the server looks
 * like the game rather than like a wall of bot text.
 *
 * Each banner is a realm's or a heaven's painting, darkened towards the words; a figure
 * cut from the game (a beast, the cultivator, a Dragon) standing on the right; the
 * system's character in a gold seal; the title in the logo's lettering; and the frame the
 * game's cards wear, a gilt hairline with a bracket at each corner.
 *
 *     node tools/banners.mjs [key…]    → public/discord/banner/<key>.webp
 *
 * It fetches its fonts from Google Fonts with curl (the logo's Cinzel, Cormorant, and only
 * the Chinese characters the banners use from Noto Serif SC), and draws in the test
 * Chromium. Pages serves the result; commit it before the posts that point at it, so
 * Discord never caches a missing image.
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'public/discord/banner';
mkdirSync(OUT, { recursive: true });

/** 旗 Every banner: its seal, the line above the title, the title, the line under it, and its art. */
export const BANNERS = [
  { key: 'welcome', seal: '入', over: '九境 Ninefold', title: 'Welcome, Cultivator', sub: 'An idle cultivation game, painted in ink', bg: 'realm/1', fig: 'self/woman-1' },
  { key: 'launch', seal: '告', over: '告 Announcement', title: 'The First Closed Test', sub: 'Nine realms, and nothing taken for being away', bg: 'realm/9', fig: 'cut/heaven-1' },
  { key: 'devlog-1', seal: '筆', over: '筆 Dev log · 01', title: 'A Face, a Finish and Music', sub: 'Before the first testers arrive', bg: 'realm/5', fig: 'self/man-5' },
  { key: 'g-install', seal: '裝', over: '書 Guide · Before you play', title: 'Installing on Android', sub: 'Two ways onto your phone, step by step', bg: 'realm/3', fig: 'self/woman-3' },
  { key: 'g-start', seal: '入', over: '書 Guide · 01 of 14', title: 'Start Here', sub: 'Your first hour, and the three promises', bg: 'realm/1', fig: 'self/man-1' },
  { key: 'g-qi', seal: '氣', over: '書 Guide · 02 of 14', title: 'Qi and the Nine Realms', sub: 'Layers, sitting, and breaking through', bg: 'realm/2', fig: 'self/woman-2' },
  { key: 'g-hunt', seal: '狩', over: '書 Guide · 03 of 14', title: 'The Hunt', sub: 'Beasts, the Record and Beast Cores', bg: 'realm/3', fig: 'cut/tiger' },
  { key: 'g-gear', seal: '器', over: '書 Guide · 04 of 14', title: 'Gear', sub: 'Ranks, sets, classes and refining', bg: 'realm/4', fig: 'self/woman-4' },
  { key: 'g-classes', seal: '職', over: '書 Guide · 05 of 14', title: 'Classes', sub: 'What you wear is who you become', bg: 'realm/4', fig: 'self/man-7' },
  { key: 'g-pairs', seal: '合', over: '書 Guide · 06 of 14', title: 'The Fifteen Classes', sub: 'Two schools awake, one name, one perk', bg: 'realm/6', fig: 'self/woman-7' },
  { key: 'g-path', seal: '道', over: '書 Guide · 07 of 14', title: 'The Path', sub: 'Nodes, keystones, stances and arts', bg: 'realm/6', fig: 'self/man-6' },
  { key: 'g-cave', seal: '秘', over: '書 Guide · 08 of 14', title: 'The Cave and the Vault', sub: 'What grows while you are away, and seven rooms', bg: 'realm/5', fig: 'cut/jiao' },
  { key: 'g-tower', seal: '塔', over: '書 Guide · 09 of 14', title: 'Seclusion and the Tower', sub: 'The heart demon, the endless floors, the Bestiary', bg: 'realm/7', fig: 'cut/wraith' },
  { key: 'g-trib', seal: '劫', over: '書 Guide · 10 of 14', title: 'The Tribulation', sub: 'The Dragon, the Furnace and the nine Heavens', bg: 'heaven/9', fig: 'cut/dragon' },
  { key: 'g-week', seal: '期', over: '書 Guide · 11 of 14', title: 'The Week and the Road', sub: 'What turns every Monday, and who you meet', bg: 'realm/8', fig: 'cut/crane' },
  { key: 'g-ranks', seal: '榜', over: '書 Guide · 12 of 14', title: 'Rankings', sub: 'Three boards, your save, every device', bg: 'heaven/1', fig: 'self/woman-9' },
  { key: 'g-faq', seal: '問', over: '書 Guide · 13 of 14', title: 'Questions', sub: 'What testers ask first', bg: 'realm/2', fig: 'cut/fox' },
  { key: 'g-opens', seal: '開', over: '書 Guide · 14 of 14', title: 'What Each Realm Opens', sub: 'Nine realms, and nothing ever reset', bg: 'heaven/5', fig: 'cut/unicorn' },
  // 業 The workshop: its guide, the post that asks what the testers think, and the dev log that ships it.
  { key: 'g-crafts', seal: '業', over: '書 Guide · The Workshop', title: 'The Seven Crafts', sub: 'Gather, render, forge, brew, write, cut', bg: 'realm/2', fig: 'self/man-2' },
  { key: 'ideas-workshop', seal: '議', over: '議 Your opinion', title: 'The Workshop', sub: 'Seven crafts from 1 to 99: tell us what you think', bg: 'realm/5', fig: 'self/woman-5' },
  { key: 'devlog-2', seal: '筆', over: '筆 Dev log · 02', title: 'The Workshop Is Coming', sub: 'Seven crafts, painted, and a fairer drive', bg: 'realm/6', fig: 'self/woman-6' },
  // 業 The workshop's launch: dev log 3 and the guide to the seven crafts.
  { key: 'devlog-3', seal: '筆', over: '筆 Dev log · 03', title: 'The Workshop Opens', sub: 'Seven crafts, from 1 to 99', bg: 'realm/2', fig: 'self/man-5' },
  // 便 The call for quality-of-life ideas: the forum post that gathers them, and the announcement that points at it.
  { key: 'ideas-qol', seal: '便', over: '議 Your ideas · Quality of life', title: 'What Slows You Down?', sub: 'Tell us every tap, scroll and wait you would cut', bg: 'realm/4', fig: 'self/woman-8' },
  { key: 'news-qol', seal: '便', over: '告 Announcement', title: 'Make Ninefold Easier', sub: 'Your quality-of-life ideas come first this week', bg: 'realm/8', fig: 'self/man-8' },
];

const curl = (url, binary = false) => execFileSync('curl', ['-sSL', '--max-time', '30', '-A',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', url],
  binary ? {} : { encoding: 'utf8' });

/** Google's CSS, with every font file pulled down and set inline, latin only. */
export function fonts(extra = '') {
  const han = [...new Set([...BANNERS.flatMap((b) => [...b.seal, ...b.over]), ...extra].filter((c) => /\p{Script=Han}/u.test(c)))].join('');
  const css = [
    curl('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@1,600&display=swap'),
    curl(`https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600&text=${encodeURIComponent(han)}`),
  ].join('\n');
  return css.replace(/\/\*\s*(cyrillic|vietnamese|latin-ext|greek)[\s\S]*?\}\s*/g, '')
    .replace(/url\((https:[^)]+)\)/g, (_, u) => `url(data:font/woff2;base64,${curl(u, true).toString('base64')})`);
}

export const data = (file) => `data:image/webp;base64,${readFileSync(file).toString('base64')}`;
const G = 'rgba(212, 175, 86, .8)';
const bracket = (x, y) => [
  `linear-gradient(${G}, ${G}) ${x} ${y} / 30px 2px no-repeat`,
  `linear-gradient(${G}, ${G}) ${x} ${y} / 2px 30px no-repeat`,
].join(',');

function page(b, css) {
  return `<!doctype html><meta charset="utf-8"><style>${css}
  * { box-sizing: border-box; } body { margin: 0; background: #0D0B08; }
  .b { width: 1200px; height: 450px; position: relative; overflow: hidden; background: #0D0B08; }
  .bg { position: absolute; inset: -8px; background: url(${data(`public/art/${b.bg}.webp`)}) center 60% / cover; filter: saturate(.9) brightness(.7); }
  .shade { position: absolute; inset: 0; background:
      linear-gradient(90deg, rgba(13,11,8,.97) 0%, rgba(13,11,8,.9) 34%, rgba(13,11,8,.35) 66%, rgba(13,11,8,.15) 82%, rgba(13,11,8,.6) 100%),
      linear-gradient(0deg, rgba(13,11,8,.8) 0%, transparent 35%); }
  .fig { position: absolute; right: 78px; bottom: 24px; height: 380px; width: auto;
         filter: drop-shadow(0 18px 28px rgba(0,0,0,.65)) drop-shadow(0 0 40px rgba(212,175,86,.12)); }
  .frame { position: absolute; inset: 20px; border: 1px solid rgba(212,175,86,.38);
           background: ${bracket('left 8px', 'top 8px')}, ${bracket('right 8px', 'top 8px')},
                       ${bracket('left 8px', 'bottom 8px')}, ${bracket('right 8px', 'bottom 8px')}; }
  .seal { position: absolute; left: 70px; top: 50%; transform: translateY(-50%); width: 148px; height: 148px;
          display: grid; place-items: center; border: 2px solid #D4AF56; border-radius: 6px;
          background: radial-gradient(circle at 50% 40%, rgba(212,175,86,.16), rgba(212,175,86,.03) 70%);
          box-shadow: inset 0 0 0 6px rgba(13,11,8,.9), inset 0 0 0 7px rgba(212,175,86,.45), 0 0 50px rgba(212,175,86,.14);
          font: 600 92px/1 'Noto Serif SC', serif; color: #E2C26A; text-shadow: 0 0 24px rgba(212,175,86,.35); }
  .text { position: absolute; left: 256px; top: 50%; transform: translateY(-50%); width: 560px; }
  .over { font: 600 15px/1 Cinzel, serif; letter-spacing: .32em; text-transform: uppercase; color: #8FB49B; }
  .over .h { font-family: 'Noto Serif SC', serif; letter-spacing: .1em; color: #D4AF56; }
  h1 { margin: 14px 0 12px; font: 700 50px/1.06 Cinzel, serif; letter-spacing: .03em; color: #F3E8CF;
       text-shadow: 0 2px 0 rgba(0,0,0,.5), 0 0 30px rgba(212,175,86,.18); }
  .rule { width: 120px; height: 1px; background: linear-gradient(90deg, #D4AF56, transparent); margin-bottom: 12px; }
  .sub { font: italic 600 26px/1.25 'Cormorant Garamond', serif; color: #CDB67F; }
  .brand { position: absolute; right: 48px; top: 40px; display: flex; align-items: center; gap: 10px; opacity: .9; }
  .brand img.m { width: 38px; height: auto; } .brand img.n { width: 118px; height: auto; }
  </style>
  <div class="b">
    <div class="bg"></div><div class="shade"></div>
    <img class="fig" src="${data(`public/art/${b.fig}.webp`)}" alt="">
    <div class="frame"></div>
    <div class="seal">${b.seal}</div>
    <div class="text">
      <div class="over">${b.over.replace(/^(\p{Script=Han}+)/u, '<span class="h">$1</span>')}</div>
      <h1>${b.title}</h1><div class="rule"></div><div class="sub">${b.sub}</div>
    </div>
    <div class="brand"><img class="m" src="${data('public/brand/mark.webp')}" alt=""><img class="n" src="${data('public/brand/name.webp')}" alt=""></div>
  </div>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const css = fonts();
  const browser = await chromium.launch({ executablePath: CHROME });
  const tab = await browser.newPage({ viewport: { width: 1200, height: 450 } });
  // Only the banners named on the command line, when any are: the rest are already up,
  // and Discord keeps the copy it first fetched of each.
  const only = process.argv.slice(2);
  for (const b of BANNERS.filter((x) => !only.length || only.includes(x.key))) {
    await tab.setContent(page(b, css));
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(150);
    const png = await tab.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 450 } });
    await sharp(png).webp({ quality: 86 }).toFile(`${OUT}/${b.key}.webp`);
    console.log(`  ${b.key}`);
  }
  await browser.close();
  console.log(`旗 banners in ${OUT}.`);
}
