import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 440, height: 1000 }, deviceScaleFactor: 2 });
await p.goto('file:///home/user/ninefold/bible.html');
await p.waitForTimeout(2500);
for (const [nm, sel] of [['head','header'],['apk','.now'],['build','#build'],['falta','#falta'],['where','.sec:last-of-type']]) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
  await el.screenshot({ path: `${process.argv[2]}/b-${nm}.png` });
}
await b.close(); console.log('ok');
