/**
 * 宣 The larger pieces: the key art the announcements carry, the chart of the classes, and
 * the before and after of a dev log. Same hand as tools/banners.mjs (its fonts, its frame,
 * the game's own art and real screens), bigger canvases.
 *
 *     node tools/promo.mjs          → public/discord/promo/<name>.webp
 *
 * The classes chart is made from the game's own tables and the sentences the game shows,
 * so a changed perk changes the chart the next time this runs.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { fonts, data } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'public/discord/promo';
mkdirSync(OUT, { recursive: true });

// 職 The classes, read from the game itself, with the numbers the game shows.
const classes = JSON.parse(execFileSync('npx', ['tsx', '-e', `
  import { schoolSays, pairSays } from './src/app/classes.ts';
  import { SCHOOLS, SCHOOL_INFO, PAIRS } from './src/data/schools.ts';
  console.log(JSON.stringify({
    schools: SCHOOLS.map((s) => ({ key: s, ...SCHOOL_INFO[s], says: schoolSays(s) })),
    pairs: PAIRS.map((p) => ({ ...p, says: pairSays(p.key) })),
  }));`], { encoding: 'utf8' }));
// 業 The workshop, read from the game itself: its seven crafts, ranks, and the numbers the
// balance file sets, so the chart cannot drift from the game it describes.
const craft = JSON.parse(execFileSync('npx', ['tsx', '-e', `
  import { SKILLS, RANKS, RECIPES, ITEMS } from './src/data/crafts.ts';
  import { CRAFT_HOURS_TO_CAP, CRAFT_WORK_HOURS } from './src/sim/balance.ts';
  import { icon } from './src/art/icon.ts';
  import { HABITS, play } from './tools/habits.ts';
  const day = (name) => play(HABITS.find((h) => h.name === name), 400).arrival.map((d) => Math.round(d));
  console.log(JSON.stringify({
    days: { active: day('active'), casual: day('casual') },
    skills: SKILLS.map((k) => ({ ...k, svg: icon(k.icon, 40), toolSvg: icon(k.tool.icon, 22), n: RECIPES.filter((r) => r.skill === k.key).length })),
    ranks: RANKS, hours: CRAFT_HOURS_TO_CAP, away: CRAFT_WORK_HOURS, recipes: RECIPES.length, items: ITEMS.length,
  }));`], { encoding: 'utf8' }));
const AXIS = { power: '力 Power', rate: '氣 Qi rate', luck: '運 Rarer gear', find: '拾 Drop chance', sunder: '破 Beasts weaker',
  refine: '煉 Fusion quality', capacity: '藏 Chest slots', art: '法 Art' };

const BASE = `
  * { box-sizing: border-box; } body { margin: 0; background: #0D0B08; color: #EDE3D2; }
  .cn { font-family: 'Noto Serif SC', serif; }
  .frame { position: absolute; inset: 22px; border: 1px solid rgba(212,175,86,.38); pointer-events: none;
    background:
      linear-gradient(#D4AF56cc, #D4AF56cc) left 9px top 9px / 34px 2px no-repeat, linear-gradient(#D4AF56cc, #D4AF56cc) left 9px top 9px / 2px 34px no-repeat,
      linear-gradient(#D4AF56cc, #D4AF56cc) right 9px top 9px / 34px 2px no-repeat, linear-gradient(#D4AF56cc, #D4AF56cc) right 9px top 9px / 2px 34px no-repeat,
      linear-gradient(#D4AF56cc, #D4AF56cc) left 9px bottom 9px / 34px 2px no-repeat, linear-gradient(#D4AF56cc, #D4AF56cc) left 9px bottom 9px / 2px 34px no-repeat,
      linear-gradient(#D4AF56cc, #D4AF56cc) right 9px bottom 9px / 34px 2px no-repeat, linear-gradient(#D4AF56cc, #D4AF56cc) right 9px bottom 9px / 2px 34px no-repeat; }
  .phone { border-radius: 30px; border: 1px solid rgba(212,175,86,.55); overflow: hidden; background: #14110D;
           box-shadow: 0 30px 60px rgba(0,0,0,.7), 0 0 0 6px rgba(13,11,8,.9), 0 0 0 7px rgba(212,175,86,.3); }
  .phone img { display: block; width: 100%; }
  .caps { font: 600 15px/1 Cinzel, serif; letter-spacing: .32em; text-transform: uppercase; }
`;

/** 宣 The key art: the logo and the promise on the left, three real screens on the right. */
const keyart = () => `
  <div style="width:1600px;height:900px;position:relative;overflow:hidden">
    <div style="position:absolute;inset:-10px;background:url(${data('public/art/realm/9.webp')}) center 55%/cover;filter:saturate(.9) brightness(.62)"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,11,8,.97) 0%,rgba(13,11,8,.9) 38%,rgba(13,11,8,.4) 70%,rgba(13,11,8,.55) 100%)"></div>
    <div style="position:absolute;right:70px;top:120px;display:flex;gap:26px;align-items:flex-start">
      <div class="phone" style="width:250px;transform:translateY(70px) rotate(-3deg)"><img src="${data('public/discord/hunt.webp')}"></div>
      <div class="phone" style="width:280px"><img src="${data('public/discord/cultivate.webp')}"></div>
      <div class="phone" style="width:250px;transform:translateY(70px) rotate(3deg)"><img src="${data('public/discord/gear.webp')}"></div>
    </div>
    <div style="position:absolute;left:96px;top:130px;width:620px">
      <img src="${data('public/brand/mark.webp')}" style="width:150px;filter:drop-shadow(0 0 30px rgba(212,175,86,.3))">
      <img src="${data('public/brand/name.webp')}" style="display:block;width:560px;margin:26px 0 18px">
      <div style="font:italic 600 34px/1.25 'Cormorant Garamond',serif;color:#D8C28E">An idle cultivation game, painted in ink.</div>
      <div style="width:160px;height:1px;background:linear-gradient(90deg,#D4AF56,transparent);margin:30px 0"></div>
      <div style="display:inline-block;padding:16px 26px;border:2px solid #D4AF56;border-radius:6px;background:rgba(212,175,86,.08);
                  box-shadow:inset 0 0 0 5px rgba(13,11,8,.9),inset 0 0 0 6px rgba(212,175,86,.4)">
        <span class="caps" style="font-size:22px;color:#F3E8CF;letter-spacing:.26em">Closed test · now open</span></div>
      <div class="caps" style="margin-top:28px;color:#8FB49B;font-size:14px">Android · iPhone · Browser · Free</div>
    </div>
    <div class="frame"></div>
  </div>`;

/** 職 The chart of the classes: the six schools, then the fifteen they make in pairs. */
const chart = () => {
  const S = classes.schools;
  const card = (s) => `
    <div style="padding:18px 18px 16px;border:1px solid ${s.colour}66;border-radius:12px;
                background:linear-gradient(180deg,${s.colour}1f,rgba(13,11,8,.2) 55%),#17130E;display:grid;grid-template-columns:62px 1fr;gap:4px 14px">
      <div class="cn" style="grid-row:span 3;width:62px;height:62px;border-radius:50%;display:grid;place-items:center;font-size:34px;
                  color:${s.colour};border:2px solid ${s.colour};background:${s.colour}14">${s.seal}</div>
      <div style="font:700 20px/1.1 Cinzel,serif;color:#F3E8CF">${s.name}</div>
      <div style="font:600 13px/1.2 Cinzel,serif;letter-spacing:.14em;color:${s.colour}"><span class="cn">${s.han}</span> · LEADS WITH ${s.axes.map((a) => AXIS[a].toUpperCase()).join(' · ')}</div>
      <div style="font:15px/1.4 Archivo,system-ui,sans-serif;color:#CFC4B0">${s.says}</div>
    </div>`;
  const cell = (a, b) => {
    const p = classes.pairs.find((x) => (x.a === a.key && x.b === b.key) || (x.a === b.key && x.b === a.key));
    return `<div style="border-radius:10px;padding:10px 10px 9px;border:1px solid rgba(212,175,86,.28);
                 background:linear-gradient(135deg,${a.colour}33,${b.colour}33),#17130E;display:flex;flex-direction:column;gap:4px">
      <div class="cn" style="font-size:24px;color:#F1E0B0;line-height:1">${p.han}</div>
      <div style="font:700 13.5px/1.15 Cinzel,serif;color:#F3E8CF">${p.name}</div>
      <div style="font:12px/1.35 Archivo,system-ui,sans-serif;color:#C9BDA6">${p.says}</div></div>`;
  };
  const head = (s) => `<div style="display:grid;place-items:center"><div class="cn" style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;
      font-size:24px;color:${s.colour};border:2px solid ${s.colour}">${s.seal}</div></div>`;
  let grid = `<div></div>${S.slice(1).map(head).join('')}`;
  for (let r = 0; r < S.length - 1; r++) {
    grid += head(S[r]);
    for (let c = 1; c < S.length; c++) grid += c > r ? cell(S[r], S[c]) : '<div></div>';
  }
  return `
  <div style="width:1200px;height:1600px;position:relative;overflow:hidden;background:#100D0A">
    <div style="position:absolute;inset:0 0 auto 0;height:420px;background:url(${data('public/art/realm/4.webp')}) center 40%/cover;filter:saturate(.8) brightness(.5)"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,13,10,.35) 0,rgba(16,13,10,.92) 300px,#100D0A 420px)"></div>
    <div style="position:relative;padding:70px 64px 0">
      <div style="display:flex;gap:28px;align-items:center">
        <div class="cn" style="width:120px;height:120px;display:grid;place-items:center;font-size:74px;color:#E2C26A;border:2px solid #D4AF56;border-radius:6px;
             box-shadow:inset 0 0 0 6px rgba(13,11,8,.9),inset 0 0 0 7px rgba(212,175,86,.45);background:rgba(212,175,86,.08)">職</div>
        <div><div class="caps" style="color:#8FB49B">九境 Ninefold · the classes</div>
          <div style="font:700 54px/1.05 Cinzel,serif;color:#F3E8CF;margin:12px 0 8px">What You Wear<br>Is Who You Become</div>
          <div style="font:italic 600 24px 'Cormorant Garamond',serif;color:#CDB67F">Six schools, and fifteen classes they make in pairs</div></div>
      </div>
      <div style="display:flex;gap:12px;margin:34px 0 26px">
        ${['3 pieces of one school wake it', '5 bring it to its full', '3 + 3 of two schools make a class'].map((t) =>
          `<div style="flex:1;text-align:center;padding:14px 10px;border:1px solid rgba(212,175,86,.35);border-radius:10px;background:rgba(212,175,86,.06);
            font:600 15px/1.2 Cinzel,serif;letter-spacing:.06em;color:#EAD9AE">${t}</div>`).join('')}
      </div>
      <div class="caps" style="color:#C9B27A;margin-bottom:14px">The six schools</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${S.map(card).join('')}</div>
      <div class="caps" style="color:#C9B27A;margin:34px 0 14px">The fifteen classes</div>
      <div style="display:grid;grid-template-columns:60px repeat(5,1fr);gap:8px">${grid}</div>
      <div style="margin-top:24px;text-align:center;font:italic 600 20px 'Cormorant Garamond',serif;color:#A99A7E">
        Changing class is changing clothes. It costs nothing, and you can always go back.</div>
    </div>
    <div class="frame"></div>
  </div>`;
};

/** 筆 A dev log's three headlines, each a panel with something to look at, not a list. */
const devlog = () => {
  const bars = Array.from({ length: 46 }, (_, i) => {
    const h = 18 + Math.round(70 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) + 18 * Math.abs(Math.sin(i * 1.7)));
    return `<i style="display:block;width:5px;height:${h}px;border-radius:3px;background:linear-gradient(180deg,#E2C26A,#7FB495)"></i>`;
  }).join('');
  const panel = (seal, title, line, inner) => `
    <div style="position:relative;width:440px;height:505px;border:1px solid rgba(212,175,86,.5);border-radius:14px;overflow:hidden;
                background:linear-gradient(180deg,rgba(255,236,200,.06),transparent 40%),#15110C;box-shadow:0 30px 60px rgba(0,0,0,.6)">
      <div style="height:360px;display:grid;place-items:center;position:relative;overflow:hidden">${inner}</div>
      <div style="padding:22px 26px">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="cn" style="width:44px;height:44px;display:grid;place-items:center;font-size:26px;color:#E2C26A;border:2px solid #D4AF56;border-radius:5px">${seal}</span>
          <span style="font:700 28px/1 Cinzel,serif;color:#F3E8CF">${title}</span></div>
        <div style="margin-top:14px;font:italic 600 22px/1.3 'Cormorant Garamond',serif;color:#CDB67F">${line}</div>
      </div></div>`;
  return `
  <div style="width:1600px;height:900px;position:relative;overflow:hidden">
    <div style="position:absolute;inset:-10px;background:url(${data('public/art/realm/5.webp')}) center/cover;filter:saturate(.8) brightness(.42)"></div>
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 35%,rgba(13,11,8,.3),rgba(13,11,8,.93) 78%)"></div>
    <div style="position:absolute;left:0;right:0;top:54px;text-align:center">
      <div class="caps" style="color:#8FB49B"><span class="cn" style="color:#D4AF56">筆</span> Dev log · 01</div>
      <div style="font:700 48px/1.1 Cinzel,serif;color:#F3E8CF;margin-top:10px">Ninefold Gets Its Face</div></div>
    <div style="position:absolute;left:0;right:0;top:240px;display:flex;justify-content:center;gap:40px">
      ${panel('標', 'A Logo', 'A gold ensō, and the cultivator sitting inside it',
        `<div style="position:absolute;inset:0;background:url(${data('public/art/realm/1.webp')}) center/cover;filter:brightness(.35)"></div>
         <img src="${data('public/brand/mark.webp')}" style="position:relative;width:230px;filter:drop-shadow(0 0 40px rgba(212,175,86,.35))">`)}
      ${panel('樂', 'Its Own Music', 'Chinese strings and flutes, made for the game',
        `<div style="position:absolute;inset:0;background:url(${data('public/art/realm/2.webp')}) center/cover;filter:brightness(.3)"></div>
         <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:22px">
           <div style="display:flex;align-items:center;gap:4px;height:110px">${bars}</div>
           <div class="caps" style="font-size:13px;color:#EAD9AE;letter-spacing:.24em">Cultivate · Cultivate II · Hunt</div></div>`)}
      ${panel('貴', 'A Premium Finish', 'Every card mounted like a painting',
        `<div style="position:absolute;inset:0;background:url(${data('public/art/realm/3.webp')}) center/cover;filter:brightness(.3)"></div>
         <div class="phone" style="position:absolute;left:50%;top:36px;transform:translateX(-50%);width:250px"><img src="${data('public/discord/hunt.webp')}"></div>`)}
    </div>
    <div class="frame"></div>
  </div>`;
};

/** 業 The workshop's key art: what it is on the left, three real screens on the right. */
const workshop = () => `
  <div style="width:1600px;height:900px;position:relative;overflow:hidden">
    <div style="position:absolute;inset:-10px;background:url(${data('public/art/realm/5.webp')}) center 60%/cover;filter:saturate(.85) brightness(.55)"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,11,8,.97) 0%,rgba(13,11,8,.9) 40%,rgba(13,11,8,.35) 72%,rgba(13,11,8,.5) 100%)"></div>
    <div style="position:absolute;right:64px;top:92px;display:flex;gap:24px;align-items:flex-start">
      <div class="phone" style="width:250px;transform:translateY(80px) rotate(-3deg)"><img src="${data('public/discord/workshop-forge.webp')}"></div>
      <div class="phone" style="width:285px"><img src="${data('public/discord/workshop.webp')}"></div>
      <div class="phone" style="width:250px;transform:translateY(80px) rotate(3deg)"><img src="${data('public/discord/workshop-carry.webp')}"></div>
    </div>
    <div style="position:absolute;left:90px;top:150px;width:600px">
      <div style="display:flex;gap:22px;align-items:center">
        <div class="cn" style="width:112px;height:112px;display:grid;place-items:center;font-size:70px;color:#E2C26A;border:2px solid #D4AF56;border-radius:6px;
             box-shadow:inset 0 0 0 6px rgba(13,11,8,.9),inset 0 0 0 7px rgba(212,175,86,.45);background:rgba(212,175,86,.08)">業</div>
        <div><div class="caps" style="color:#8FB49B">九境 Ninefold · a preview</div>
          <div style="font:700 52px/1.02 Cinzel,serif;color:#F3E8CF;margin-top:10px">The Workshop</div></div>
      </div>
      <div style="font:italic 600 32px/1.25 'Cormorant Garamond',serif;color:#D8C28E;margin:26px 0 22px">Seven crafts, levelled from 1 to 99.<br>Gather, render, forge, brew, write, cut.</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;width:600px">
        ${craft.skills.map((k) => `<div style="text-align:center">
          <div class="cn" style="width:64px;height:64px;margin:0 auto;display:grid;place-items:center;font-size:34px;color:#E2C26A;
               border:1.5px solid rgba(212,175,86,.7);border-radius:8px;background:rgba(212,175,86,.07)">${k.seal}</div>
          <div style="font:600 11px/1.2 Cinzel,serif;letter-spacing:.06em;color:#EAD9AE;margin-top:8px">${k.name.toUpperCase()}</div></div>`).join('')}
      </div>
      <div style="width:160px;height:1px;background:linear-gradient(90deg,#D4AF56,transparent);margin:34px 0 22px"></div>
      <div style="font:19px/1.55 Archivo,system-ui,sans-serif;color:#CFC4B0">
        It keeps working ${craft.away} hours after you leave. Nothing it makes<br>raises your qi, and a lost fight never spends your kit.</div>
      <div class="caps" style="margin-top:26px;color:#E2C26A;font-size:15px">Tell us what you think · 議 ideas</div>
    </div>
    <div class="frame"></div>
  </div>`;

/** 業 The chart: every craft, what it does and when it opens, how they feed each other, the ranks. */
const workshopChart = () => {
  const card = (k) => `
    <div style="padding:16px 18px 14px;border:1px solid rgba(212,175,86,.4);border-radius:12px;
                background:linear-gradient(180deg,rgba(212,175,86,.10),rgba(13,11,8,.2) 55%),#17130E;display:grid;grid-template-columns:62px 1fr;gap:4px 14px;align-content:start">
      <div class="cn" style="grid-row:span 4;width:62px;height:62px;border-radius:8px;display:grid;place-items:center;font-size:34px;
                  color:#E2C26A;border:2px solid #D4AF56;background:rgba(212,175,86,.08)">${k.seal}</div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">
        <span style="font:700 20px/1.1 Cinzel,serif;color:#F3E8CF">${k.name}</span>
        <span style="font:600 12px/1 Cinzel,serif;letter-spacing:.12em;color:${k.realm === 2 ? '#8FB49B' : '#C9B27A'};white-space:nowrap">REALM ${k.realm}</span></div>
      <div style="font:15px/1.4 Archivo,system-ui,sans-serif;color:#CFC4B0">${k.does}</div>
      <div style="display:flex;gap:16px;align-items:center;font:13px/1.2 Archivo,system-ui,sans-serif;color:#A99A7E;margin-top:4px">
        <span style="display:inline-flex;gap:6px;align-items:center;color:#D8C28E">${k.toolSvg}<span class="cn">${k.tool.han}</span> ${k.tool.name}</span>
        <span>${k.n} recipes</span>
        <span>At 99: <span class="cn" style="color:#E2C26A">${k.cap.han}</span> ${k.cap.name}</span></div>
    </div>`;
  const step = (seals, title, line) => `
    <div style="flex:1;padding:14px 12px;border:1px solid rgba(212,175,86,.35);border-radius:10px;background:rgba(212,175,86,.06);text-align:center">
      <div class="cn" style="font-size:26px;color:#E2C26A;letter-spacing:.1em">${seals}</div>
      <div style="font:700 15px/1.2 Cinzel,serif;color:#F3E8CF;margin-top:6px">${title}</div>
      <div style="font:13px/1.35 Archivo,system-ui,sans-serif;color:#C9BDA6;margin-top:4px">${line}</div></div>`;
  const arrow = '<div style="align-self:center;font:700 26px Cinzel,serif;color:#D4AF56">›</div>';
  // 開 When each opens, and on what day a real pace of play reaches it (tools/habits.ts).
  const opens = () => {
    const at = [...new Set(craft.skills.map((k) => k.realm))];
    const row = (r) => `<div style="display:grid;grid-template-columns:86px 1fr 64px 64px;gap:8px;align-items:center;padding:7px 0;border-top:1px solid rgba(212,175,86,.16)">
      <span style="font:600 13px Cinzel,serif;letter-spacing:.1em;color:#C9B27A">REALM ${r}</span>
      <span class="cn" style="font-size:20px;color:#E2C26A;letter-spacing:.12em">${craft.skills.filter((k) => k.realm === r).map((k) => k.seal).join(' ')}</span>
      <span style="font:14px Archivo,system-ui,sans-serif;color:#EAD9AE;text-align:right">day ${craft.days.active[r - 1]}</span>
      <span style="font:14px Archivo,system-ui,sans-serif;color:#A99A7E;text-align:right">day ${craft.days.casual[r - 1]}</span></div>`;
    return `<div style="padding:16px 18px 10px;border:1px solid rgba(143,180,155,.45);border-radius:12px;background:linear-gradient(180deg,rgba(143,180,155,.10),rgba(13,11,8,.2) 60%),#17130E">
      <div style="display:grid;grid-template-columns:86px 1fr 64px 64px;gap:8px;align-items:baseline;margin-bottom:6px">
        <span style="grid-column:span 2;font:700 20px/1.1 Cinzel,serif;color:#F3E8CF">When each opens</span>
        <span style="font:600 11px Cinzel,serif;letter-spacing:.1em;color:#EAD9AE;text-align:right">ACTIVE</span>
        <span style="font:600 11px Cinzel,serif;letter-spacing:.1em;color:#A99A7E;text-align:right">CASUAL</span></div>
      ${at.map(row).join('')}
      <div style="font:13px/1.35 Archivo,system-ui,sans-serif;color:#A99A7E;margin-top:6px">All seven show on the tab from the first day, so you can see what is coming.</div></div>`;
  };
  return `
  <div style="width:1200px;height:1620px;position:relative;overflow:hidden;background:#100D0A">
    <div style="position:absolute;inset:0 0 auto 0;height:420px;background:url(${data('public/art/realm/2.webp')}) center 40%/cover;filter:saturate(.8) brightness(.5)"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,13,10,.35) 0,rgba(16,13,10,.92) 300px,#100D0A 420px)"></div>
    <div style="position:relative;padding:66px 64px 0">
      <div style="display:flex;gap:28px;align-items:center">
        <div class="cn" style="width:120px;height:120px;display:grid;place-items:center;font-size:74px;color:#E2C26A;border:2px solid #D4AF56;border-radius:6px;
             box-shadow:inset 0 0 0 6px rgba(13,11,8,.9),inset 0 0 0 7px rgba(212,175,86,.45);background:rgba(212,175,86,.08)">業</div>
        <div><div class="caps" style="color:#8FB49B">九境 Ninefold · the workshop</div>
          <div style="font:700 54px/1.05 Cinzel,serif;color:#F3E8CF;margin:12px 0 8px">Seven Crafts,<br>One to Ninety-Nine</div>
          <div style="font:italic 600 24px 'Cormorant Garamond',serif;color:#CDB67F">${craft.recipes} recipes, ${craft.items} things to make, one task at a time</div></div>
      </div>
      <div style="display:flex;gap:12px;margin:30px 0 24px">
        ${[`Works ${craft.away} hours while you are away`, 'Nothing it makes raises your qi', 'A lost fight never spends your kit'].map((t) =>
          `<div style="flex:1;text-align:center;padding:14px 10px;border:1px solid rgba(212,175,86,.35);border-radius:10px;background:rgba(212,175,86,.06);
            font:600 15px/1.2 Cinzel,serif;letter-spacing:.04em;color:#EAD9AE">${t}</div>`).join('')}
      </div>
      <div class="caps" style="color:#C9B27A;margin-bottom:14px">How the seven feed each other</div>
      <div style="display:flex;gap:10px;align-items:stretch">
        ${step('藥 礦 解', 'Gather', 'Herbs, ore, and the parts of every beast the hunt has taught you')}${arrow}
        ${step('鑄 丹 符', 'Make', 'Metal and tools, gear you choose, elixirs and sigils')}${arrow}
        ${step('攜', 'Carry', 'One elixir and one sigil into a warden, a heart demon or a vault gate')}${arrow}
        ${step('陣', 'Keep', 'Arrays cut into the floor: faster crafts, a sooner vault door')}
      </div>
      <div class="caps" style="color:#C9B27A;margin:30px 0 14px">The seven crafts</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${craft.skills.map(card).join('')}${opens()}</div>
      <div class="caps" style="color:#C9B27A;margin:30px 0 14px">A rank every ten levels</div>
      <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:6px">
        ${craft.ranks.map((r) => `<div style="text-align:center;padding:10px 4px;border:1px solid rgba(212,175,86,.28);border-radius:8px;background:#17130E">
          <div class="cn" style="font-size:20px;color:#E2C26A">${r.han}</div>
          <div style="font:600 11px/1.2 Cinzel,serif;color:#EAD9AE;margin-top:4px">${r.name}</div>
          <div style="font:12px Archivo,system-ui,sans-serif;color:#8FB49B;margin-top:3px">${r.at}</div></div>`).join('')}
      </div>
      <div style="margin-top:26px;text-align:center;font:italic 600 21px 'Cormorant Garamond',serif;color:#A99A7E">
        About ${craft.hours.toLocaleString('en')} hours of work to take one craft to 99. Ten minutes a day, and the workshop does the rest.</div>
    </div>
    <div class="frame"></div>
  </div>`;
};

const PIECES = [
  { name: 'keyart', w: 1600, h: 900, html: keyart },
  { name: 'classes', w: 1200, h: 1600, html: chart },
  { name: 'devlog-1', w: 1600, h: 900, html: devlog },
  { name: 'workshop', w: 1600, h: 900, html: workshop },
  { name: 'workshop-chart', w: 1200, h: 1620, html: workshopChart },
];
// 只 node tools/promo.mjs workshop workshop-chart: only these, leaving the rest as they are.
const only = process.argv.slice(2);

const han = JSON.stringify(classes) + JSON.stringify(craft) + '職合九境筆修狩標樂貴業議攜藥礦解鑄丹符陣';
const css = fonts(han);
const browser = await chromium.launch({ executablePath: CHROME });
for (const p of PIECES.filter((x) => !only.length || only.includes(x.name))) {
  const tab = await browser.newPage({ viewport: { width: p.w, height: p.h } });
  await tab.setContent(`<!doctype html><meta charset="utf-8"><style>${css}${BASE}</style>${p.html()}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(200);
  const png = await tab.screenshot({ clip: { x: 0, y: 0, width: p.w, height: p.h } });
  await sharp(png).webp({ quality: 86 }).toFile(`${OUT}/${p.name}.webp`);
  writeFileSync(`${OUT}/${p.name}.png`, png);
  console.log(`  ${p.name}`);
  await tab.close();
}
await browser.close();
console.log(`宣 done, in ${OUT}.`);
