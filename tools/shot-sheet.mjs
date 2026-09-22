/**
 * 攝 Shoot the two pictures the sheet page needs.
 *
 * 樣 the fabricated leaf at exactly the size a model returns, so 刀 the cutter is tested
 * against a real PNG it has never seen, and 證 the panels it produced, in the ring they
 * will be seen through. Wants `python3 -m http.server 8899` in the repository root.
 */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1100, height: 1200 } });
const shot = async (page, sel, file) => {
  await p.goto(`http://localhost:8899/${page}`, { waitUntil: 'networkidle' });
  await p.locator(sel).screenshot({ path: file });
  console.log(file);
};
await shot('sheet-demo.html', '#leaf', 'ink-sheets/demo.png');
await shot('sheet-cut.html', '#cuts', 'sheet-cut-strip.png');
await b.close();
