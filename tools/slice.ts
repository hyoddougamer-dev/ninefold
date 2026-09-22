/**
 * 刀 The cutter: one generated sheet in, twelve paintings out.
 *
 * 張 tools/sheets.ts asks an image model for a ruled album leaf instead of a single
 * creature, because a free account gives out credits and not pictures. This reads the
 * leaf back: it finds the rules, cuts the panels, trims the bare paper off each one,
 * squares it, and writes it where 畫 the picture list already looks.
 *
 *     npm run slice -- beasts-a ink-sheets/beasts-a.png
 *
 * 界 Finding the rules rather than dividing by four. A model does not put its grid on
 * the pixel we asked for, and a panel that is cut two per cent late loses a foot and
 * gains a stripe of its neighbour. So the cut is measured: a gutter is the one column in
 * its neighbourhood that is **the same all the way down**, whether that is because a
 * rule was drawn there or because it is bare paper. A column through a creature is dark
 * in the middle and pale at the ends, so its deviation is large. The minimum of the
 * deviation inside a window around each nominal boundary is the gutter, every time, and
 * it degrades to the nominal boundary rather than to nonsense when a sheet has no rules
 * at all.
 *
 * 證 It writes a proof beside the files: the sheet with the cuts drawn on it and every
 * panel named, so a bad cut is seen rather than discovered in the game three days later.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { SHEETS, sheetOf, type Sheet } from './sheets.ts';

/** How much of a cell to throw away on each side, to lose the rule line itself. */
const INSET = 0.02;
/** How far either side of a nominal boundary to hunt for the real one, as a fraction of a cell. */
const HUNT = 0.3;
/** 牌 How much of the plate the picture's circle keeps: `clip-path: circle(42%)`, so 0.84. */
const CIRCLE = 0.84;
/** 獸 A creature is square and small on screen. 境 a realm is a wide card background. */
const OUT = { beast: { w: 512, h: 512 }, realm: { w: 768, h: 432 } } as const;

/** Greyscale rows, so a column can be asked how much it varies from top to bottom. */
async function grey(file: string) {
  const img = sharp(file).removeAlpha().greyscale();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

/**
 * The boundaries of one axis, measured. Returns cuts.length === n + 1, outer edges
 * included, so a cell i runs from cuts[i] to cuts[i + 1].
 */
function boundaries(dev: Float64Array, n: number, span: number, from: number): number[] {
  const cell = span / n;
  const cuts = [from];
  for (let i = 1; i < n; i++) {
    const nominal = from + i * cell;
    const lo = Math.max(from + 1, Math.round(nominal - cell * HUNT));
    const hi = Math.min(from + span - 1, Math.round(nominal + cell * HUNT));
    let best = Math.round(nominal);
    let bestDev = Infinity;
    for (let x = lo; x <= hi; x++) {
      // 心 A tie goes to the middle: a sheet of flat paper should cut where it was asked to.
      const score = dev[x] + Math.abs(x - nominal) * 0.01;
      if (score < bestDev) { bestDev = score; best = x; }
    }
    cuts.push(best);
  }
  cuts.push(from + span);
  return cuts;
}

/** Deviation along the other axis, for every column (axis 'x') or every row (axis 'y'). */
function deviation(g: { data: Buffer; w: number; h: number }, axis: 'x' | 'y'): Float64Array {
  const n = axis === 'x' ? g.w : g.h;
  const m = axis === 'x' ? g.h : g.w;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let sq = 0;
    for (let j = 0; j < m; j++) {
      const v = g.data[axis === 'x' ? j * g.w + i : i * g.w + j];
      sum += v;
      sq += v * v;
    }
    const mean = sum / m;
    out[i] = Math.sqrt(Math.max(0, sq / m - mean * mean));
  }
  return out;
}

/**
 * 邊 The outer margin. The prompt asks for bare paper around the grid, and a model often
 * adds more of it, so the grid is found before it is divided: walk in from each edge
 * while the line is flat, and stop at the first line that has anything on it.
 */
function margins(dev: Float64Array, span: number): { from: number; span: number } {
  let peak = 0;
  for (let i = 0; i < span; i++) peak = Math.max(peak, dev[i]);
  const live = peak * 0.12;
  let a = 0;
  let b = span - 1;
  while (a < span / 4 && dev[a] < live) a++;
  while (b > (span * 3) / 4 && dev[b] < live) b--;
  return { from: a, span: b - a + 1 };
}

/** 墨 The box around everything in a panel that is darker than its paper. */
function inkBox(g: { data: Buffer; w: number; h: number }, box: { left: number; top: number; width: number; height: number }) {
  let pale = 0;
  let n = 0;
  for (let y = box.top; y < box.top + box.height; y += 3) {
    for (let x = box.left; x < box.left + box.width; x += 3) { pale = Math.max(pale, g.data[y * g.w + x]); n++; }
  }
  const dark = pale - 34;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let y = box.top; y < box.top + box.height; y++) {
    for (let x = box.left; x < box.left + box.width; x++) {
      if (g.data[y * g.w + x] < dark) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  // 空 An empty panel keeps its whole cell rather than collapsing to nothing.
  if (!isFinite(x0)) return { ...box };
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** The panel's own paper, sampled from its corners, for the margin to be extended with. */
async function paperOf(file: string, box: { left: number; top: number; width: number; height: number }) {
  const s = await sharp(file)
    .extract({ left: box.left, top: box.top, width: Math.min(8, box.width), height: Math.min(8, box.height) })
    .stats();
  const ch = s.channels;
  return { r: Math.round(ch[0].mean), g: Math.round((ch[1] ?? ch[0]).mean), b: Math.round((ch[2] ?? ch[0]).mean) };
}

async function cut(sheet: Sheet, file: string) {
  const g = await grey(file);
  const devX = deviation(g, 'x');
  const devY = deviation(g, 'y');
  const mx = margins(devX, g.w);
  const my = margins(devY, g.h);
  const xs = boundaries(devX, sheet.cols, mx.span, mx.from);
  const ys = boundaries(devY, sheet.rows, my.span, my.from);

  const dir = `public/art/${sheet.kind}`;
  mkdirSync(dir, { recursive: true });
  const written: string[] = [];

  for (let i = 0; i < sheet.cells.length; i++) {
    const c = sheet.cells[i];
    const col = i % sheet.cols;
    const row = Math.floor(i / sheet.cols);
    const x0 = xs[col];
    const x1 = xs[col + 1];
    const y0 = ys[row];
    const y1 = ys[row + 1];
    const ix = Math.round((x1 - x0) * INSET);
    const iy = Math.round((y1 - y0) * INSET);
    const box = { left: x0 + ix, top: y0 + iy, width: x1 - x0 - ix * 2, height: y1 - y0 - iy * 2 };
    const size = OUT[sheet.kind];
    const out = `${dir}/${c.key}.webp`;

    if (sheet.kind === 'realm') {
      await sharp(file).extract(box).resize(size.w, size.h, { fit: 'cover' }).webp({ quality: 82 }).toFile(out);
      written.push(out);
      continue;
    }

    // 紙 The paper stays. Keying it out of a wet ink edge leaves a halo, and a plate that
    // is a pale disc with a painting on it is what a bestiary page looks like anyway.
    //
    // 框 The subject is found here rather than by sharp's own trim, which throws on a
    // panel it decides is empty and, being a mutating call, poisons the pipeline it was
    // asked about. The greyscale is already in hand: take the box of everything darker
    // than the paper, square it about its own centre, and give it a margin.
    const ink = inkBox(g, box);
    // 圓 The frame is a circle, so the square has to hold the subject's **diagonal**, not
    // its longer side. The first cut used the longer side and every wide creature came
    // back with its wings clipped off by 圓相 the ensō, which a look at the files would
    // never have shown: they were perfect squares of a clipped animal.
    const side = Math.round(Math.hypot(ink.width, ink.height) / CIRCLE);
    const cx = ink.left + ink.width / 2;
    const cy = ink.top + ink.height / 2;
    const square = {
      left: Math.round(cx - side / 2),
      top: Math.round(cy - side / 2),
      width: side,
      height: side,
    };
    const bg = await paperOf(file, box);
    // The square is allowed to want more room than the panel has, which is the usual case
    // for a creature that fills its panel: extend with the panel's own paper.
    const clip = {
      left: Math.max(0, square.left),
      top: Math.max(0, square.top),
      width: Math.min(g.w, square.left + side) - Math.max(0, square.left),
      height: Math.min(g.h, square.top + side) - Math.max(0, square.top),
    };
    await sharp(file)
      .extract(clip)
      .extend({
        left: Math.max(0, clip.left - square.left),
        top: Math.max(0, clip.top - square.top),
        right: Math.max(0, square.left + side - (clip.left + clip.width)),
        bottom: Math.max(0, square.top + side - (clip.top + clip.height)),
        background: bg,
      })
      .resize(size.w, size.h, { fit: 'fill' })
      .webp({ quality: 82 })
      .toFile(out);
    written.push(out);
  }

  return { xs, ys, written, w: g.w, h: g.h };
}

/** 證 The proof: the sheet with every cut drawn on it and every panel named. */
async function proof(sheet: Sheet, file: string, r: Awaited<ReturnType<typeof cut>>) {
  const lines = [
    ...r.xs.map((x) => `<line x1="${x}" y1="${r.ys[0]}" x2="${x}" y2="${r.ys[r.ys.length - 1]}" stroke="#E0322B" stroke-width="3"/>`),
    ...r.ys.map((y) => `<line x1="${r.xs[0]}" y1="${y}" x2="${r.xs[r.xs.length - 1]}" y2="${y}" stroke="#E0322B" stroke-width="3"/>`),
  ];
  const labels = sheet.cells.map((c, i) => {
    const col = i % sheet.cols;
    const row = Math.floor(i / sheet.cols);
    const x = r.xs[col] + 8;
    const y = r.ys[row] + 26;
    return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="19" font-weight="bold"
      fill="#E0322B" stroke="#FFF" stroke-width="3.5" paint-order="stroke">${c.name}</text>`;
  });
  const svg = Buffer.from(
    `<svg width="${r.w}" height="${r.h}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}${labels.join('')}</svg>`,
  );
  const out = `sheet-${sheet.key}-proof.png`;
  await sharp(file).composite([{ input: svg, top: 0, left: 0 }]).png().toFile(out);
  return out;
}

const [key, file] = process.argv.slice(2);
const sheet = key ? sheetOf(key) : undefined;
if (!sheet || !file) {
  console.log('npm run slice -- <sheet> <image>\n\nsheets: ' + SHEETS.map((s) => `${s.key} (${s.cells.length})`).join(', '));
  process.exit(1);
}
if (!existsSync(file)) {
  console.log(`no such file: ${file}`);
  process.exit(1);
}
const r = await cut(sheet, file);
const p = await proof(sheet, file, r);
const gaps = r.xs.slice(1).map((x, i) => x - r.xs[i]);
console.log(`${sheet.han} ${sheet.key}: ${r.written.length} cut from ${r.w} by ${r.h}`);
console.log(`  columns at ${r.xs.join(' ')}  (widths ${gaps.join(' ')})`);
console.log(`  rows    at ${r.ys.join(' ')}`);
console.log(`  wrote   ${r.written[0]} … ${r.written[r.written.length - 1]}`);
console.log(`  proof   ${p}`);
writeFileSync(`sheet-${sheet.key}-cuts.json`, JSON.stringify({ xs: r.xs, ys: r.ys }, null, 1));
