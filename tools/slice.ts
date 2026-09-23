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
import { BEASTS } from '../src/data/bestiary.ts';
import { SHEETS, cutStrip, sheetOf, type Sheet } from './sheets.ts';

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
 * 線 How dark and how flat every line across one axis is.
 *
 * 誤 This is the measurement the first cut got wrong, and it cost a whole sheet. It
 * scored a gutter by how *uniform* a column was from top to bottom, reasoning that a
 * ruled line is the same all the way down. It is, but so is any column of bare paper,
 * and on a real sheet the paper is everywhere and the rule is one pixel wide. The
 * detector picked flat paper eight pixels to the right of the rule, every time.
 *
 * What a rule actually is, is **dark, edge to edge**. Measured down the whole sheet that
 * is unmistakable: on 獸甲 the rule column averaged 80 against 160 for its neighbours,
 * while its deviation was no lower than theirs. So darkness leads and flatness only
 * breaks ties, which keeps the fabricated leaf working too.
 */
function profile(g: { data: Buffer; w: number; h: number }, axis: 'x' | 'y'): Float64Array {
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
    out[i] = mean + Math.sqrt(Math.max(0, sq / m - mean * mean)) * 0.5;
  }
  return out;
}

/** The value a line has where there is nothing but paper, so a rule can be told from it. */
function paperLevel(p: Float64Array): number {
  const sorted = Array.from(p).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.6)];
}

/**
 * 邊 The outer frame. The prompt asks for a margin of bare paper around the grid and a
 * model often gives more of it, or none at all and rules the page edge to edge. Both are
 * the same question: where is the first ruled line, coming in from this edge? Look for it
 * in the outer eighth, and take the edge itself when nothing there is dark enough to be
 * a rule.
 */
function frame(p: Float64Array, span: number): { from: number; span: number } {
  const paper = paperLevel(p);
  const dark = paper - 22;
  const reach = Math.round(span * 0.12);
  const pick = (lo: number, hi: number, fallback: number) => {
    let best = fallback;
    let low = Infinity;
    for (let i = lo; i <= hi; i++) if (p[i] < low) { low = p[i]; best = i; }
    return low < dark ? best : fallback;
  };
  const a = pick(0, reach, 0);
  const b = pick(span - 1 - reach, span - 1, span - 1);
  return { from: a, span: b - a + 1 };
}

/**
 * The boundaries of one axis, measured. Returns cuts.length === n + 1, outer edges
 * included, so a cell i runs from cuts[i] to cuts[i + 1].
 */
function boundaries(p: Float64Array, n: number, span: number, from: number): number[] {
  const cell = span / n;
  const cuts = [from];
  for (let i = 1; i < n; i++) {
    const nominal = from + i * cell;
    const lo = Math.max(from + 1, Math.round(nominal - cell * HUNT));
    const hi = Math.min(from + span - 1, Math.round(nominal + cell * HUNT));
    let best = Math.round(nominal);
    let low = Infinity;
    for (let x = lo; x <= hi; x++) {
      // 心 A tie goes to the middle: a sheet with no rule at all should cut where it was
      // asked to rather than wherever the paper happened to be a shade darker.
      const score = p[x] + Math.abs(x - nominal) * 0.02;
      if (score < low) { low = score; best = x; }
    }
    cuts.push(best);
  }
  cuts.push(from + span);
  return cuts;
}

/**
 * 墨 Where the painting actually is inside its panel.
 *
 * 誤 The first version took the box around every pixel darker than the palest one, which
 * worked on 樣 the fabricated leaf, where a flat paper holds one clean silhouette, and
 * failed completely on a real painting, where the aged paper is textured edge to edge.
 * Every panel reported that its subject filled it, so every square was taken from the
 * middle of a tall panel and the frog lost its feet and the crane lost its head.
 *
 * 量 So measure weight rather than extent. A pixel counts for how much darker than the
 * bare paper it is, with a floor under it so the paper's own grain counts for nothing,
 * and the box is the middle 94 per cent of that weight on each axis. Texture is spread
 * thin and an animal is not, so the tails of the distribution are the paper and the body
 * of it is the creature.
 */
function inkBox(g: { data: Buffer; w: number; h: number }, box: { left: number; top: number; width: number; height: number }) {
  const sample: number[] = [];
  for (let y = box.top; y < box.top + box.height; y += 2) {
    for (let x = box.left; x < box.left + box.width; x += 2) sample.push(g.data[y * g.w + x]);
  }
  sample.sort((a, b) => a - b);
  // 紙 The bare paper, read off the pale end but not from the single palest pixel, which
  // on a scanned-looking sheet is a speck rather than the ground.
  const paper = sample[Math.floor(sample.length * 0.88)];
  const floor = 14;
  const cols = new Float64Array(box.width);
  const rows = new Float64Array(box.height);
  for (let y = 0; y < box.height; y++) {
    for (let x = 0; x < box.width; x++) {
      const w = Math.max(0, paper - g.data[(box.top + y) * g.w + box.left + x] - floor);
      cols[x] += w;
      rows[y] += w;
    }
  }
  const span = (a: Float64Array, lose: number, loseEnd = lose) => {
    let total = 0;
    for (const v of a) total += v;
    if (total <= 0) return { lo: 0, hi: a.length - 1 };
    let acc = 0;
    let lo = 0;
    while (lo < a.length - 1 && acc + a[lo] < total * lose) acc += a[lo++];
    acc = 0;
    let hi = a.length - 1;
    while (hi > lo && acc + a[hi] < total * loseEnd) acc += a[hi--];
    return { lo, hi };
  };
  // 頸 The top of the vertical span is barely trimmed at all. A head is a small share of
  // a creature's ink and a crane's neck is almost none of it, so a three per cent trim
  // took the raven's head and the crane's whole neck. The bottom keeps its trim, because
  // what is down there is the ground the animal is standing on.
  const sx = span(cols, 0.03);
  const sy = span(rows, 0.004, 0.05);
  return {
    left: box.left + sx.lo,
    top: box.top + sy.lo,
    width: sx.hi - sx.lo + 1,
    height: sy.hi - sy.lo + 1,
  };
}

async function cut(sheet: Sheet, file: string) {
  const g = await grey(file);
  const px = profile(g, 'x');
  const py = profile(g, 'y');
  const mx = frame(px, g.w);
  const my = frame(py, g.h);
  const xs = boundaries(px, sheet.cols, mx.span, mx.from);
  const ys = boundaries(py, sheet.rows, my.span, my.from);

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
    // 圓 The frame is a circle, so the square wants the subject's **diagonal**, not its
    // longer side. The first cut used the longer side and every wide creature came back
    // with its wings clipped off by 圓相 the ensō, which a look at the files would never
    // have shown: they were perfect squares of a clipped animal.
    //
    // 紙 But it never reaches outside the panel for that room. The version that did,
    // padded the shortfall with a flat sample of the paper, and a real painting came back
    // with a pale bar down each side where the invented paper met the painted paper. So
    // the square is bounded by the panel's short side: at worst a whole painting is shown
    // and the circle crops it, which is what a plate is for.
    const short = Math.min(box.width, box.height);
    const side = Math.round(Math.min(short, Math.max(short * 0.8, Math.hypot(ink.width, ink.height) / CIRCLE)));
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    // 首 Centred across, but hung from the top of the ink. A panel taller than it is wide
    // has to lose a band, and a bestiary plate that loses the animal's head is worthless
    // while one that loses the ground it stands on is not. Centring lost the owl's head,
    // the raven's head and the crane's whole neck in one pass.
    const head = ink.top - side * 0.04;
    const square = {
      left: Math.round(clamp(ink.left + ink.width / 2 - side / 2, box.left, box.left + box.width - side)),
      top: Math.round(clamp(head, box.top, box.top + box.height - side)),
      width: side,
      height: side,
    };
    await sharp(file)
      .extract(square)
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

/**
 * 改 The grid and the panel order can both be overridden from the command line:
 *
 *     npm run slice -- beasts-a sheet.png --grid 4x3 --keys rat,hound,frog,fox,…
 *
 * 用 Which is what a sheet that came back wrong is for. A model that ruled the page four
 * across instead of three, or drew the panels out of order, has not wasted a credit: the
 * cutter is told the shape it is actually looking at, and the keys say which panel is
 * which. It is also how a sheet generated against an older layout stays cuttable.
 */
const argv = process.argv.slice(2);
const opt = (name: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};
const [key, file] = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
let sheet = key ? sheetOf(key) : undefined;
if (sheet) {
  const grid = opt('grid');
  const keys = opt('keys')?.split(',').map((k) => k.trim()).filter(Boolean);
  if (grid || keys) {
    const [cols, rows] = (grid ?? `${sheet.cols}x${sheet.rows}`).split('x').map(Number);
    const named = keys ?? sheet.cells.map((c) => c.key);
    const known = new Map(BEASTS.map((b) => [b.key, b]));
    sheet = {
      ...sheet,
      cols,
      rows,
      cells: named.map((k) => {
        const b = known.get(k);
        return { key: k, han: b?.han ?? k, name: b?.name ?? k, subject: '' };
      }),
    };
    if (sheet.cells.length !== cols * rows) {
      console.log(`${cols} by ${rows} is ${cols * rows} panels but ${sheet.cells.length} keys were named`);
      process.exit(1);
    }
  }
}
if (!sheet || !file) {
  console.log('npm run slice -- <sheet> <image> [--grid 4x3] [--keys a,b,c]\n\nsheets: ' + SHEETS.map((s) => `${s.key} (${s.cols}x${s.rows})`).join(', '));
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
// 證 The panels in the ring they will be seen through, which is the only place a bad cut
// shows. The proof belongs to the cut and not to the prompt page, so it is written here.
writeFileSync('sheet-cut.html', cutStrip(sheet));
console.log('  panels  sheet-cut.html');
