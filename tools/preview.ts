/**
 * Renders the art system to one self-contained page, composited on the lacquer ground —
 * which is ART rule 1: nothing is ever judged on a blank white page, because the game
 * has no white in it.
 */
import { writeFileSync } from 'node:fs';
import { BANDS, STAT_HAN, STAT_NAME } from '../src/data/mountain.ts';
import { mountain, type Camp } from '../src/art/mountain.ts';
import { GOLD, JADE, LACQUER, LACQUER_HI, PHASE_LIGHT, BONE } from '../src/art/palette.ts';
import { seeded } from '../src/art/rng.ts';

const FRONTIER = 6;

/** A plausible populated mountain: more cultivators low, a scattering high. */
function crowd(): Camp[] {
  const rnd = seeded('crowd');
  const camps: Camp[] = [];
  for (let band = 1; band <= FRONTIER; band++) {
    const n = Math.max(1, Math.round(16 * Math.pow(0.62, band - 1)));
    for (let i = 0; i < n; i++) camps.push({ band, at: 0.08 + rnd() * 0.84 });
  }
  camps.push({ band: 4, at: 0.52, you: true });
  return camps;
}

const bandRows = BANDS.map((b) => {
  const sealed = b.n > FRONTIER;
  const c = sealed ? '#5A6B63' : PHASE_LIGHT[b.phase];
  return `<tr style="opacity:${sealed ? 0.45 : 1}">
    <td class="han" style="color:${c}">${b.han}</td>
    <td><b>${b.name}</b><span>${b.phase}</span></td>
    <td class="d">${b.demands ? `<i style="color:${c}">${STAT_HAN[b.demands]}</i> ${STAT_NAME[b.demands]}` : '—'}</td>
    <td class="n">&times;${b.yield}</td>
    <td class="n">${b.pressure || '—'}</td>
    <td class="s">${sealed ? '封' : ''}</td>
  </tr>`;
}).reverse().join('');

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>九重山 — the visual system</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;500;700&display=swap">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: ${LACQUER}; color: ${BONE};
    font: 14px/1.6 ui-sans-serif, system-ui, -apple-system, sans-serif;
    padding: 0 0 env(safe-area-inset-bottom, 0px); }
  .wrap { max-width: 460px; margin: 0 auto; padding: 28px 16px 64px; }
  h1 { font-family: 'Noto Serif SC', serif; font-weight: 500; font-size: 30px;
    letter-spacing: .06em; margin: 0 0 2px; color: ${JADE}; }
  .sub { color: #6E827A; font-size: 12.5px; letter-spacing: .14em;
    text-transform: uppercase; margin-bottom: 26px; }
  .scroll { border-radius: 12px; overflow: hidden; border: 1px solid #16261F;
    box-shadow: 0 18px 50px rgba(0,0,0,.55); }
  .scroll svg { display: block; width: 100%; height: auto; }
  h2 { font-size: 11.5px; letter-spacing: .2em; text-transform: uppercase;
    color: #6E827A; font-weight: 500; margin: 38px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 9px 6px; border-bottom: 1px solid #14231D; vertical-align: middle; }
  .han { font-family: 'Noto Serif SC', serif; font-size: 19px; width: 54px;
    letter-spacing: .04em; }
  td b { display: block; font-weight: 500; color: ${BONE}; }
  td span { display: block; font-size: 10.5px; letter-spacing: .12em;
    text-transform: uppercase; color: #566B62; }
  .d i { font-family: 'Noto Serif SC', serif; font-style: normal; font-size: 15px; }
  .d { color: #90A79C; font-size: 12px; }
  .n { text-align: right; color: ${GOLD}; font-variant-numeric: tabular-nums;
    font-size: 12.5px; }
  .s { font-family: 'Noto Serif SC', serif; color: #C8442C; text-align: right;
    width: 22px; }
  .note { background: ${LACQUER_HI}; border-left: 2px solid ${JADE};
    padding: 13px 15px; border-radius: 0 8px 8px 0; margin-top: 26px;
    font-size: 13px; color: #9BB0A6; }
  .note b { color: ${BONE}; font-weight: 500; }
  .legend { display: flex; gap: 18px; margin-top: 14px; font-size: 11.5px;
    color: #6E827A; }
  .legend i { display: inline-block; width: 8px; height: 8px; border-radius: 50%;
    margin-right: 6px; vertical-align: middle; }
</style></head><body><div class="wrap">
  <h1>九重山</h1>
  <div class="sub">one mountain &middot; everybody climbs it</div>
  <div class="scroll">${mountain({ frontier: FRONTIER, camps: crowd(), offering: 0.58, width: 420, bandHeight: 150 })}</div>
  <div class="legend">
    <span><i style="background:${GOLD}"></i>you</span>
    <span><i style="background:${JADE}"></i>other cultivators</span>
    <span><i style="background:#C8442C"></i>sealed by the server</span>
  </div>

  <h2>The nine tiers</h2>
  <table>${bandRows}</table>

  <div class="note">
    <b>How to read it.</b> Altitude is progress. Camping high yields more qi while you
    are away, and taxes the stat that altitude demands — so the one decision a session
    is made of is how high you camp before you close the app. Above 霜鋒 the mountain is
    sealed for everyone; the gold bar under the seal is the server's collective offering
    against it. When it breaks, it breaks for everybody.
  </div>
</div></body></html>`;

writeFileSync('preview.html', page);
console.log(`preview.html — ${(page.length / 1024).toFixed(1)} KB, frontier at band ${FRONTIER}`);
