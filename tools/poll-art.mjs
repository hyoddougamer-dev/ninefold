/**
 * 票 The ten picture cards for the rebirth polls in #news. One card per question, in English
 * like the rest of the server: the question, a drawing of what each answer would change, and
 * a footnote with the measured number behind it.
 *
 *     node tools/poll-art.mjs            → public/discord/poll/poll-<n>.webp
 *
 * Every figure on a card is one the measurements printed (echotail, rkeval, the endgame and
 * carry runs). A preview is a drawing to read, not a screenshot of a state that never existed.
 * Pages serves the result; commit it before the posts that point at it, as with the banners.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { fonts } from './banners.mjs';

const CHROME = process.env.CHROME ?? '/opt/pw-browsers/chromium';
const OUT = 'public/discord/poll';
mkdirSync(OUT, { recursive: true });

const bar = (label, pct, value, tone = '') =>
  `<div class="row"><span class="lab">${label}</span><span class="tr"><i class="${tone}" style="width:${pct}%"></i></span><b>${value}</b></div>`;

const CARDS = [
  { n: 1, q: 'What happens to your Heaven record when you rebirth?', note: 'Heaven keeps each player\'s best climb, as it does now. Samsara only shows the life you are living.',
    art: `<div class="boards">
      <div class="mini"><div class="t">A · kept</div><div class="r"><span>Ven. Nuvem Fina</span><span>summit · 雷4</span></div><div class="r me"><span>You</span><span>summit · 雷2</span></div><div class="t">Samsara</div><div class="r me"><span>You · this life</span><span>realm 5</span></div></div>
      <div class="mini"><div class="t">B · first life only</div><div class="r"><span>Ven. Nuvem Fina</span><span>summit · 雷4</span></div><div class="r me"><span>You · first life</span><span>summit · 雷1</span></div><div class="t">Samsara</div><div class="r me"><span>You · this life</span><span>realm 5</span></div></div>
      <div class="mini"><div class="t">C · leave Heaven</div><div class="r"><span>Ven. Nuvem Fina</span><span>summit · 雷4</span></div><div class="r"><span>You</span><span>not listed</span></div><div class="t">Samsara</div><div class="r me"><span>You · this life</span><span>realm 5</span></div></div>
    </div>` },
  { n: 2, q: 'Should the Echo grow with how many lives you have lived, or with how deep each life went?', note: 'The Echo of one life of 15 marks is 12.5% today. Every life adds to it, up to a cap of 35%.',
    art: `<div class="bars">${[['1 mark', 5, 10], ['3 marks', 7.5, 30], ['7 marks', 10, 35], ['15 marks', 12.5, 35]].map(([l, t, p]) =>
      `<div class="row"><span class="lab">${l}</span><span class="tr"><i style="width:${(t / 35 * 100).toFixed(1)}%"></i></span><b>${t}%</b></div>
       <div class="row"><span class="lab"></span><span class="tr"><i class="jade" style="width:${(p / 35 * 100).toFixed(1)}%"></i></span><b>${p}%</b></div>`).join('')}</div>
      <p class="key"><i></i> today, one life &nbsp; <i class="jade"></i> per mark, capped at 35%</p>` },
  { n: 3, q: 'If the Echo counts depth, what should each mark be worth?', note: 'The 2.3% row is not yet run through the endgame clock, so it is a guess until measured.',
    art: `<table class="tbl"><thead><tr><th>Marks</th><th>1</th><th>3</th><th>7</th><th>15</th></tr></thead><tbody>
      <tr><td>Today, one life</td><td>5%</td><td>7.5%</td><td>10%</td><td>12.5%</td></tr>
      <tr><td>10% per mark</td><td>10%</td><td>30%</td><td>35%</td><td>35%</td></tr>
      <tr><td>About 2.3% per mark</td><td>2.3%</td><td>6.9%</td><td>16.1%</td><td>34.5%</td></tr></tbody></table>
      <p class="key">The cap is 35%. At 10% per mark it is reached on the fourth mark.</p>` },
  { n: 4, q: 'How much forging experience should come with you into a new life?', note: 'Measured on the fifth life. The summit does not move with the share. What changes is the level the slowest craft reaches, sooner.',
    art: `<div class="bars">${[['0%', 45.8], ['22.5%', 45.8], ['25% (today)', 45.9], ['27.5%', 45.7]].map(([l, d]) => bar(l, (d / 60 * 100).toFixed(1), d + ' days')).join('')}</div>
      <div class="axis"><span>0</span><span>30</span><span>60 days</span></div>
      <p class="key">Days to the summit, fifth life. At 25%, the slowest craft reaches level 60 about 18 days sooner.</p>` },
  { n: 5, q: 'How should a rebirth be confirmed?', note: 'A rebirth starts again on the first realm. Your Echo, your title and your codex stay.',
    art: `<div class="dialogs">
      <div class="dlg"><div class="h">Rebirth?</div><div class="box">You start again on realm 1. Your Echo stays.</div><span class="btn">Cancel</span> <span class="btn solid">Rebirth</span><div class="sub">Two taps, as today</div></div>
      <div class="dlg"><div class="h">Rebirth?</div><div class="box">Type Reincarnate to confirm.</div><div class="box in">Reincarnate</div><span class="btn solid">Confirm</span><div class="sub">One word, typed</div></div>
    </div>` },
  { n: 6, q: 'Should the first place on Samsara get the 天下第一 title?', note: 'Today 天下第一 belongs to the first place on Heaven. The question is whether the first place in a single life earns it too.',
    art: `<div class="boards single">
      <div class="mini"><div class="t">Heaven · 1st</div><div class="r me"><span>You</span><span>天下第一</span></div></div>
      <div class="mini"><div class="t">Samsara · 1st, this life</div><div class="r me"><span>You</span><span>title?</span></div></div>
    </div>` },
  { n: 7, q: 'Should the tower count on Samsara, life by life?', note: 'Today a tower floor is checked against the body that won it. When a life ends that body is gone, so a new life needs a rule of its own.',
    art: `<div class="boards single">
      <div class="mini"><div class="t">Samsara · this life</div><div class="r me"><span>You · tower floor</span><span>counts?</span></div></div>
      <p class="key">Not yet decided. Until it is, the tower stays on Heaven only.</p>
    </div>` },
  { n: 8, q: 'For a daily player, how long should the climb to the summit take?', note: 'Each band runs from the first life, with no Echo, to forty lives of 15 marks. Measured with three gear seeds.',
    art: `<div class="ranges"><div class="rg"><span class="lab">Active</span><span class="tr"><i style="left:31.8%;width:9.1%"></i><em style="left:28.6%"></em><em style="left:64.3%"></em></span><b>44.5 to 57.3</b></div>
      <div class="rg"><span class="lab">Every hour</span><span class="tr"><i style="left:20.7%;width:5.4%"></i><em style="left:28.6%"></em><em style="left:64.3%"></em></span><b>29.0 to 36.6</b></div>
      <div class="rg"><span class="lab">Casual</span><span class="tr"><i style="left:43.8%;width:11.4%"></i><em style="left:28.6%"></em><em style="left:64.3%"></em></span><b>61.3 to 77.3</b></div>
      <div class="rg"><span class="lab">Once a day</span><span class="tr"><i style="left:51.6%;width:11.2%"></i><em style="left:28.6%"></em><em style="left:64.3%"></em></span><b>72.3 to 88.0</b></div>
      <div class="rg"><span class="lab">Never fights</span><span class="tr"><i style="left:74.5%;width:19.8%"></i><em style="left:28.6%"></em><em style="left:64.3%"></em></span><b>104.3 to 132.0</b></div>
      <div class="rg"><span></span><span class="ax"><span style="left:0">0</span><span style="left:28.6%">40 days</span><span style="left:64.3%">90 days</span><span style="left:100%">140</span></span><span></span></div>
    </div>` },
  { n: 9, q: 'Should the boards show values the server would refuse, while we test?', note: 'The test build accepts every save for now, so a tower floor the server would refuse is on the board today.',
    art: `<div class="boards single">
      <div class="mini"><div class="t">Test build, today</div><div class="r me"><span>You · tower 352</span><span>on the board</span></div></div>
      <div class="mini"><div class="t">Once the check is on</div><div class="r"><span>You · tower 352</span><span>refused, not shown</span></div></div>
    </div>` },
  { n: 10, q: 'Should we show the Samsara board design before we build it?', note: 'Samsara shows only players who have reborn at least once, and each life starts that board again.',
    art: `<div class="boards single">
      <div class="mini"><div class="t">輪 Samsara · this life</div><div class="r"><span>1 · Ven. Nuvem Fina · 世3</span><span>realm 9</span></div><div class="r"><span>2 · Mestre Sino · 世2</span><span>realm 8</span></div><div class="r me"><span>3 · You · 世3</span><span>realm 5</span></div><div class="r"><span>4 · Pedra Sem Nome · 世4</span><span>realm 5</span></div></div>
    </div>` },
];

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #0D0B08; color: #F3E8CF; width: 760px; }
  .card { width: 760px; padding: 34px 40px 30px; background: linear-gradient(180deg, #17130E, #0D0B08); border: 1px solid rgba(212,175,86,.38); position: relative; }
  .card::before, .card::after { content: ""; position: absolute; left: 10px; right: 10px; height: 1px; background: rgba(212,175,86,.5); }
  .card::before { top: 10px; } .card::after { bottom: 10px; }
  .no { font: 600 14px/1 Cinzel, serif; letter-spacing: .3em; color: #8FB49B; text-transform: uppercase; }
  h2 { font: 600 30px/1.18 'Cormorant Garamond', serif; margin: 14px 0 18px; color: #F3E8CF; text-wrap: balance; }
  .prev { border: 1px solid rgba(212,175,86,.22); background: rgba(212,175,86,.04); padding: 18px; }
  .boards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .boards.single { grid-template-columns: 1fr; }
  .mini { border: 1px solid #3a3228; background: #13100C; padding: 10px 11px; font: 13px/1.5 'IBM Plex Mono', monospace; color: #d8cfb9; min-width: 0; }
  .mini .t { font: 600 11px/1.3 'IBM Plex Mono', monospace; letter-spacing: .06em; text-transform: uppercase; color: #CDB67F; margin: 2px 0 4px; }
  .mini .r { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid #2a251d; padding: 3px 0; }
  .mini .r span:first-child { min-width: 0; overflow-wrap: anywhere; }
  .mini .r.me { color: #D4AF56; }
  .bars .row { display: grid; grid-template-columns: 9rem 1fr 5.4rem; gap: 10px; align-items: center; margin: 7px 0; font: 14px/1 'IBM Plex Mono', monospace; }
  .bars .row .lab, .ranges .lab { color: #d8cfb9; }
  .bars .row b, .ranges b { text-align: right; font-weight: 500; color: #F3E8CF; font-variant-numeric: tabular-nums; }
  .tr { position: relative; display: block; height: 14px; background: #241E16; border: 1px solid #3a3228; }
  .tr i { position: absolute; left: 0; top: 0; bottom: 0; background: #D4AF56; }
  .tr i.jade { background: #8FB49B; }
  .tr em { position: absolute; top: -5px; bottom: -5px; width: 2px; background: #F3E8CF; }
  .axis { display: flex; justify-content: space-between; font: 12px/1 'IBM Plex Mono', monospace; color: #8a8170; margin-top: 8px; }
  .key { font: 13px/1.5 'IBM Plex Mono', monospace; color: #CDB67F; margin: 10px 0 0; }
  .key i { display: inline-block; width: 12px; height: 8px; background: #D4AF56; vertical-align: middle; }
  .key i.jade { background: #8FB49B; }
  .tbl { width: 100%; border-collapse: collapse; font: 14px/1.4 'IBM Plex Mono', monospace; }
  .tbl th, .tbl td { text-align: right; padding: 7px 6px; border-bottom: 1px solid #3a3228; color: #d8cfb9; }
  .tbl th:first-child, .tbl td:first-child { text-align: left; }
  .tbl th { color: #CDB67F; font-weight: 500; font-size: 12px; text-transform: uppercase; }
  .dialogs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .dlg { border: 1px solid #3a3228; background: #13100C; padding: 12px; font: 14px/1.4 'Source Serif 4', Georgia, serif; color: #d8cfb9; min-width: 0; }
  .dlg .h { font: 600 18px/1.2 'Cormorant Garamond', serif; color: #F3E8CF; margin-bottom: 8px; }
  .dlg .box { border: 1px solid #3a3228; padding: 8px; margin: 6px 0; color: #a59b87; }
  .dlg .box.in { color: #F3E8CF; font-family: 'IBM Plex Mono', monospace; }
  .btn { display: inline-block; border: 1px solid #D4AF56; color: #D4AF56; padding: 7px 10px; font: 600 12px/1 Cinzel, serif; letter-spacing: .08em; margin: 8px 6px 4px 0; }
  .btn.solid { background: #D4AF56; color: #0D0B08; }
  .dlg .sub { font: 12px/1.4 'IBM Plex Mono', monospace; color: #8FB49B; margin-top: 8px; text-transform: uppercase; letter-spacing: .05em; }
  .ranges .rg { display: grid; grid-template-columns: 8.5rem 1fr 8.4rem; gap: 10px; align-items: center; margin: 7px 0; font: 14px/1 'IBM Plex Mono', monospace; }
  .ranges .rg b { white-space: nowrap; text-align: right; font-weight: 500; color: #F3E8CF; font-variant-numeric: tabular-nums; }
  .ranges .rg .tr { height: 12px; }
  .ax { position: relative; display: block; height: 14px; font: 12px/1 'IBM Plex Mono', monospace; color: #8a8170; }
  .ax span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
  .foot { font: 13px/1.5 'Source Serif 4', Georgia, serif; color: #CDB67F; margin: 16px 0 0; }
  .sig { font: 600 14px/1 Cinzel, serif; letter-spacing: .2em; color: #8FB49B; margin-top: 14px; text-transform: uppercase; }
`;

function page(c) {
  return `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
  <div class="card" id="card">
    <div class="no">Question ${c.n} of 10</div>
    <h2>${c.q}</h2>
    <div class="prev">${c.art}</div>
    <p class="foot">${c.note}</p>
    <div class="sig">Vote in the poll below · 師 Shibaki</div>
  </div>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const css = fonts();
  const browser = await chromium.launch({ executablePath: CHROME });
  const tab = await browser.newPage({ viewport: { width: 760, height: 900 } });
  for (const c of CARDS) {
    await tab.setContent(page(c).replace('<style>', `<style>${css}`));
    await tab.evaluate(() => document.fonts.ready);
    await tab.waitForTimeout(120);
    const png = await tab.locator('#card').screenshot();
    await sharp(png).webp({ quality: 86 }).toFile(`${OUT}/poll-${c.n}.webp`);
    console.log(`  poll-${c.n}`);
  }
  await browser.close();
  console.log(`票 poll cards in ${OUT}.`);
}
