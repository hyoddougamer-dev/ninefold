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
/** The same, for the two boundaries at the ends, where a rule has much less room to move. */
const EDGE = 0.22;
/** 牌 How much of the plate the picture's circle keeps: `clip-path: circle(42%)`, so 0.84. */
const CIRCLE = 0.84;
/** 剪 The longest side a cut-out creature is written at. It stands in a scene, not in a
    46px disc, so it is given more room than 牌 the plate would ever need. */
const CUT_MAX = 720;
/** 滲 How far the paper is kept around the last stroke of 修 the cultivator, in pixels. */
const SPREAD = 9;
/** 暗 How much light the fringe keeps where it is fully transparent. */
const DIM = 0.42;
/** 緣 The same, for a creature's keyed rim, which is a narrower band. */
const RIM = 0.55;
/** 獸 A creature is square and small on screen. 境 a realm is a wide card background. */
const OUT = {
  beast: { w: 512, h: 512 }, realm: { w: 768, h: 432 },
  // 緣 An encounter keeps the shape it was painted in. Four across and three down on a
  // square page makes a panel taller than it is wide, and squeezing that into a wide band
  // at cut time would throw four fifths of the painting away in the file, where nothing
  // can get it back. The file keeps the scene; the card decides the window.
  self: { w: 512, h: 512 }, meet: { w: 640, h: 856 }, heaven: { w: 768, h: 432 },
  // 符 An emblem is shown at twenty to thirty pixels in a row, so 320 is already twice
  // what the densest screen can use, and it keeps its paper like 緣 the encounters do.
  emblem: { w: 320, h: 320 },
} as const;

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

/**
 * 界 Every boundary of one axis, outer edges included, measured off the picture.
 *
 * Returns n + 1 cuts, so cell i runs from cuts[i] to cuts[i + 1].
 *
 * 誤 Twice wrong before this. First the outer frame was walked in from the edge and 獸丙
 * gave up the demon ogre's shoulder as its left rule. Then every boundary was simply
 * the darkest line near where it was expected, and 獸王 gave up the dragon's body: that
 * sheet is inked edge to edge, so a column through a warden is darker than the hairline
 * ruled between two of them.
 *
 * 細 A rule is not the darkest thing on the page. It is the **thinnest**. So each line is
 * scored on how much darker it is than the paper a little way to either side of it: a
 * ruled hairline stands out against its own neighbourhood by a wide margin, and the
 * middle of a creature does not, because the creature is dark there too. Absolute
 * darkness is what a creature wins; local contrast is what only a rule wins.
 *
 * With no rule at all the best contrast is nothing and every cut falls back to the even
 * division, which is what a page with no rules deserves.
 */
function boundaries(p: Float64Array, n: number, span: number): number[] {
  /** How far to either side the neighbourhood reaches, skipping the rule's own width. */
  const NEAR = 22;
  const SKIP = 3;
  const contrast = (i: number) => {
    let sum = 0;
    let count = 0;
    for (let d = SKIP; d <= NEAR; d++) {
      for (const x of [i - d, i + d]) {
        if (x < 0 || x >= span) continue;
        sum += p[x];
        count++;
      }
    }
    return count === 0 ? 0 : sum / count - p[i];
  };

  const cell = span / n;
  const cuts: number[] = [];
  for (let i = 0; i <= n; i++) {
    const nominal = i * cell;
    const reach = i === 0 || i === n ? cell * EDGE : cell * HUNT;
    const lo = Math.max(0, Math.round(nominal - reach));
    const hi = Math.min(span - 1, Math.round(nominal + reach));
    let best = Math.round(Math.min(span - 1, nominal));
    let high = -Infinity;
    for (let x = lo; x <= hi; x++) {
      // 心 A tie goes to the guess, and a page with no rules cuts where it was asked to.
      const score = contrast(x) - Math.abs(x - nominal) * 0.02;
      if (score > high) { high = score; best = x; }
    }
    cuts.push(high > 3 ? best : Math.round(Math.min(span - 1, nominal)));
  }
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


/**
 * 剪 The same panel again, with the paper taken off it.
 *
 * 牌 The plate keeps its paper: at 46 pixels a pale disc with a painting on it reads as a
 * page out of a bestiary, which is what it is. 鬥 The arena does not. Blown up to fill a
 * scene, that same disc reads as a sticker: Bruno, on the first one in the game,
 * *"está um badge ampliado e mal cortado circular."* A creature standing in a place has
 * no disc behind it and no ring around it, so it needs the paper gone.
 *
 * 量 Keying aged paper is not a threshold, because the paper is not one colour and an ink
 * wash does not end, it thins. So each pixel is scored on two things at once: how much
 * darker it is than the paper, and how far its colour leans off the paper's own lean.
 * A soft ramp between the two ends of that score is the alpha, which leaves a wash
 * half-there rather than cutting it off square. A median pass afterwards takes out the
 * grain the paper itself scores on, which is a speck at a time and never a shape.
 */
/**
 * 暈 The cultivator, with the paper kept and its edges dissolved.
 *
 * 面 Keying him is not a tuning problem, it is impossible: in an ink portrait **the skin
 * is the paper**. Face and ground are the same colour by construction, so every key that
 * removed the ground removed the face with it and left a hole with hair floating over it.
 * Three attempts at the threshold all failed the same way and they were always going to.
 *
 * So the paper stays and the edges are let go instead: an ellipse fitted to the panel,
 * opaque over the figure and falling to nothing before the rule. On the dark ground,
 * inside 光 the aura the game draws behind him, that reads as a painting the lamp is
 * finding rather than a card someone put down.
 */
/**
 * 滲 The cultivator's edge, which is not an edge.
 *
 * 誤 Two things were tried first and both are visible in Bruno's photographs. 剪 the key
 * that works on a creature shreds her: the seventh came back with her face as a blot and
 * the ninth, which is half bare paper on purpose, came back as three scraps. So she was
 * cut as a circle of paper faded at the rim, and at full size on a dark ground that is a
 * glowing coin with somebody inside it: *"está um badge ampliado e mal cortado
 * circular."* A circle is the one shape a brush never puts round a person.
 *
 * 法 What ends a brush painting is the ink running out. So the alpha here is the ink
 * itself, blurred wide: where there is paint anywhere nearby the paper stays, and it
 * fades along the figure's own silhouette rather than along a circle, a dozen pixels out
 * from the last stroke. The fringe loses light as it loses opacity, because paper that
 * merely turns transparent still ends in a pale rim against a dark ground, and a pale rim
 * is the coin again.
 *
 * 淡 The ramp is scaled by the panel's own strongest ink, so the ninth cultivator, who is
 * meant to be barely there, is kept barely there instead of being wiped off.
 */
async function bleed(
  file: string, box: { left: number; top: number; width: number; height: number }, out: string,
  { ghost = false }: { ghost?: boolean } = {},
) {
  const { data, info } = await sharp(file).extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  // 紙 The paper, read off the border where the figure is not.
  const edge: number[][] = [[], [], []];
  const band = Math.max(3, Math.round(Math.min(w, h) * 0.035));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x > band && x < w - band && y > band && y < h - band) continue;
      const i = (y * w + x) * ch;
      edge[0].push(data[i]); edge[1].push(data[i + 1]); edge[2].push(data[i + 2]);
    }
  }
  const mid = (a: number[]) => { a.sort((p, q) => p - q); return a[Math.floor(a.length / 2)]; };
  const pr = mid(edge[0]), pg = mid(edge[1]), pb = mid(edge[2]);
  const pl = 0.299 * pr + 0.587 * pg + 0.114 * pb;
  const prg = pr - pg, pgb = pg - pb;

  const ink = Buffer.alloc(w * h);
  for (let i = 0, j = 0; j < w * h; i += ch, j++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const d = Math.max(0, pl - l) + Math.abs(r - g - prg) * 0.8 + Math.abs(g - b - pgb) * 0.8;
    ink[j] = d > 255 ? 255 : Math.round(d);
  }

  const soft = await sharp(ink, { raw: { width: w, height: h, channels: 1 } })
    .blur(SPREAD).toColourspace('b-w').raw().toBuffer();
  if (soft.length !== w * h) throw new Error(`the spread is ${soft.length} bytes for a ${w} by ${h} panel`);

  const sorted = Array.from(ink).sort((a, b) => a - b);
  const gentle = Math.max(0.3, Math.min(1, sorted[Math.floor(sorted.length * 0.99)] / 110));
  // 底 A floor under the ramp. Scaled all the way down for a faint panel, the low end
  // lands in the paper's own noise and the whole leaf comes back faintly opaque, which is
  // a pale rectangle round the figure rather than a figure. 渡劫 the ninth was exactly
  // that on the stage: a violet smear inside a box.
  const lo = Math.max(3.5, 5 * gentle), hi = Math.max(13, 22 * gentle);
  const alpha = Buffer.alloc(w * h);
  for (let j = 0; j < w * h; j++) {
    const t = (soft[j] - lo) / (hi - lo);
    alpha[j] = t <= 0 ? 0 : t >= 1 ? 255 : Math.round(t * t * (3 - 2 * t) * 255);
  }

  // 洞 The paper inside her, which is her skin.
  //
  // 誤 The ramp is the ink, so anywhere inside the figure that is broad and pale went
  // part-transparent, and the fringe darkening below turned that into a smudge. It was
  // on the eighth realm's face in both figures: a dark mark from the eyes to the chin,
  // which on the phone reads as a wound. Everything well inside the silhouette is the
  // figure, whatever colour it is, so the silhouette is closed, its holes filled, and
  // its core made opaque. Only the edge still dissolves along the ink.
  const binary = async (src: Uint8Array | Buffer, radius: number, over: number) => {
    const b = await sharp(Buffer.from(src), { raw: { width: w, height: h, channels: 1 } })
      .blur(radius).toColourspace('b-w').raw().toBuffer();
    const m = new Uint8Array(w * h);
    for (let j = 0; j < w * h; j++) m[j] = b[j] > over ? 255 : 0;
    return m;
  };

  // 影 And the ninth, who is meant to be barely there.
  //
  // 誤 The painting lets her dissolve into the paper on purpose: half her body is bare
  // paper and a violet wash. Every cut that keeps only the ink kept three scraps of her,
  // and that is what the tribulation realm showed for as long as it has had a painting.
  // So the ninth keeps a ghost of the body as well: a seated figure's shape, found from
  // where her head and her lap are, holding the paper at a little over half. She reads as
  // somebody turning into light, which is the realm, rather than as a torn page.
  // 光 How much of each pixel is the ghost, which is light and so is never dimmed.
  const glow = new Float32Array(w * h);
  if (ghost) {
    // 霧 Not a body drawn for her: two tries at that came back as a slab and then a bell.
    // Her own strokes, spread wide, so the mist is shaped exactly like what the painter
    // left of her and fades out the way the painting does.
    const mist = await sharp(Buffer.from(alpha), { raw: { width: w, height: h, channels: 1 } })
      .blur(Math.max(20, Math.round(Math.min(w, h) * 0.07))).toColourspace('b-w').raw().toBuffer();
    let peak = 1;
    for (let j = 0; j < w * h; j++) if (mist[j] > peak) peak = mist[j];
    for (let j = 0; j < w * h; j++) {
      const m = Math.min(1, (mist[j] / peak) * 1.6);
      const eased = m * m * (3 - 2 * m);
      glow[j] = eased;
      alpha[j] = Math.max(alpha[j], Math.round(eased * 0.55 * 255));
    }
  }

  const solid = await binary(alpha, 5, 60);
  // Flood the outside in from the border; whatever the flood cannot reach is a hole.
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
  while (stack.length) {
    const j = stack.pop()!;
    if (outside[j] || solid[j]) continue;
    outside[j] = 1;
    const x = j % w, y = (j - x) / w;
    if (x > 0) stack.push(j - 1);
    if (x < w - 1) stack.push(j + 1);
    if (y > 0) stack.push(j - w);
    if (y < h - 1) stack.push(j + w);
  }
  const filled = new Uint8Array(w * h);
  for (let j = 0; j < w * h; j++) filled[j] = outside[j] ? 0 : 255;
  // The core is what is at least a spread in from the filled edge, and it is opaque.
  const core = await binary(filled, SPREAD, 250);
  const coreSoft = await sharp(Buffer.from(core), { raw: { width: w, height: h, channels: 1 } })
    .blur(3).toColourspace('b-w').raw().toBuffer();
  const ghostCap = ghost ? 0.55 : 1;
  for (let j = 0; j < w * h; j++) {
    alpha[j] = Math.max(alpha[j], Math.round(coreSoft[j] * ghostCap));
  }

  // 框 The figure's own box and a tenth of it for air, so the file is the person. The
  // disc it replaced was two thirds paper, which is why she read as half the size of the
  // creature opposite her while both files were the same number of pixels.
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (ink[y * w + x] > 30 * gentle) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('nothing is painted in this panel');
  const mx = Math.round((x1 - x0) * 0.1), my = Math.round((y1 - y0) * 0.1);
  const crop = {
    left: Math.max(0, x0 - mx), top: Math.max(0, y0 - my),
    width: Math.min(w, x1 + mx + 1) - Math.max(0, x0 - mx),
    height: Math.min(h, y1 + my + 1) - Math.max(0, y0 - my),
  };

  // 邊 And whatever the ramp decides, the file's own border is empty.
  // Nothing may reach the edge of the crop: an alpha that is still 30 there is a visible
  // rectangle hanging in the air, and it costs one multiply to make that impossible.
  const fade = Math.max(3, Math.round(Math.min(crop.width, crop.height) * 0.05));
  const border = (x: number, y: number) => {
    const d = Math.min(x - crop.left, crop.left + crop.width - 1 - x,
                       y - crop.top, crop.top + crop.height - 1 - y);
    const t = d / fade;
    return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  };

  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; j < w * h; i += ch, j++) {
    alpha[j] = Math.round(alpha[j] * border(j % w, Math.floor(j / w)));
    // 方 Squared, because the fringe has to lose light faster than it loses opacity.
    // Straight alpha left a pale band of bare paper a dozen pixels wide all round her,
    // which against the dark ground is an outer glow: the coin again, with a soft edge.
    const a = alpha[j] / 255;
    const k = Math.max(DIM + (1 - DIM) * a * a, glow[j]);
    rgba[j * 4] = Math.round(data[i] * k);
    rgba[j * 4 + 1] = Math.round(data[i + 1] * k);
    rgba[j * 4 + 2] = Math.round(data[i + 2] * k);
    rgba[j * 4 + 3] = alpha[j];
  }
  const long = Math.max(crop.width, crop.height);
  const scale = long > CUT_MAX ? CUT_MAX / long : 1;
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract(crop)
    .resize(Math.round(crop.width * scale), Math.round(crop.height * scale))
    .webp({ quality: 88, alphaQuality: 92 })
    .toFile(out);
  return crop;
}

async function cutout(file: string, box: { left: number; top: number; width: number; height: number }, out: string) {
  const { data, info } = await sharp(file).extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;

  // 紙 The paper, read off the panel's own border, where a subject is not supposed to be.
  const edge: number[][] = [[], [], []];
  const band = Math.max(3, Math.round(Math.min(w, h) * 0.035));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x > band && x < w - band && y > band && y < h - band) continue;
      const i = (y * w + x) * ch;
      edge[0].push(data[i]); edge[1].push(data[i + 1]); edge[2].push(data[i + 2]);
    }
  }
  const mid = (a: number[]) => { a.sort((p, q) => p - q); return a[Math.floor(a.length / 2)]; };
  const pr = mid(edge[0]), pg = mid(edge[1]), pb = mid(edge[2]);
  const pl = 0.299 * pr + 0.587 * pg + 0.114 * pb;
  const prg = pr - pg, pgb = pg - pb;

  // 差 How far each pixel is from the paper: darker than it, or leaning off its colour.
  const far = Buffer.alloc(w * h);
  for (let i = 0, j = 0; j < w * h; i += ch, j++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const d = Math.max(0, pl - l) + Math.abs(r - g - prg) * 0.8 + Math.abs(g - b - pgb) * 0.8;
    far[j] = d > 255 ? 255 : Math.round(d);
  }

  /**
   * 身 The neighbourhood, so a pale patch inside a figure is not mistaken for paper.
   *
   * 誤 The first key looked at each pixel on its own. That is right for a creature, which
   * is painted dark against bare paper, and wrong for 修 the cultivator, whose robe is a
   * wash a shade or two off the paper it is on. The nine cultivators came back moth
   * eaten: every pale fold of the robe keyed out, the face left as a blot, and the ninth,
   * which is meant to be barely there, keyed out almost entirely.
   *
   * A blurred copy of the same measurement answers "is there a painting *around here*".
   * Inside the robe it is well above nothing even where the pixel itself is nearly paper.
   * On bare paper it is nothing, because nothing is near. Adding it back lets the wash
   * survive while the paper still goes.
   */
  const near = await sharp(far, { raw: { width: w, height: h, channels: 1 } })
    .blur(6).toColourspace('b-w').raw().toBuffer();

  /**
   * 淡 How strongly this panel is painted at all, so the key can be as gentle as the
   * painting is faint.
   *
   * 九 The ninth cultivator is *meant* to be barely there: half of them is left as bare
   * paper on purpose. A key tuned for a dragon shreds that into blotches. Scaling the
   * two ends of the ramp by the panel's own strongest ink keeps a faint painting faint
   * instead of destroying it, and leaves a dark one exactly where it was.
   */
  const sorted = Array.from(far).sort((a, b) => a - b);
  const strongest = sorted[Math.floor(sorted.length * 0.99)];
  const gentle = Math.max(0.34, Math.min(1, strongest / 110));
  const LO = 26 * gentle;
  const HI = 62 * gentle;

  const alpha = Buffer.alloc(w * h);
  for (let j = 0; j < w * h; j++) {
    // 或 The larger of the two, not the sum. A creature painted dark on bare paper passes
    // on its own pixel and owes the neighbourhood nothing; a wash that is barely off the
    // paper passes on the neighbourhood alone. Summing them let the paper *around* a
    // figure creep over the line and every cultivator came back wearing a ragged halo.
    const score = Math.max(far[j], near[j] * 2.2);
    const t = (score - LO) / (HI - LO);
    alpha[j] = t <= 0 ? 0 : t >= 1 ? 255 : Math.round(t * t * (3 - 2 * t) * 255);
  }
  /**
   * 孔 Fill the holes the key punched in the middle of a pale creature.
   *
   * 誤 獸王 the wardens are painted in mist and bone white, and the key ate the middle out
   * of nearly all nine: the fox's chest, the crane's body and the tiger's face all came
   * back as black holes with an outline around them. A pale interior is paper by every
   * measurement there is, and it is not paper, it is the animal.
   *
   * 圍 What tells them apart is not colour but enclosure. Real paper reaches the edge of
   * the panel; a hole does not. So the transparent regions are walked, any that touches
   * the border is left alone, and any that does not is filled back in. A region is only
   * filled if it is small next to the panel, so a genuine gap the animal happens to close
   * round, between a wing and a body, is left as the gap it is.
   */
  {
    const solid = (j: number) => alpha[j] > 40;
    const seen = new Uint8Array(w * h);
    const stack: number[] = [];
    for (let j = 0; j < w * h; j++) {
      if (seen[j] || solid(j)) continue;
      const region: number[] = [];
      let touchesEdge = false;
      stack.push(j);
      seen[j] = 1;
      while (stack.length) {
        const k = stack.pop()!;
        region.push(k);
        const x = k % w;
        const y = (k - x) / w;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touchesEdge = true;
        if (x > 0 && !seen[k - 1] && !solid(k - 1)) { seen[k - 1] = 1; stack.push(k - 1); }
        if (x < w - 1 && !seen[k + 1] && !solid(k + 1)) { seen[k + 1] = 1; stack.push(k + 1); }
        if (y > 0 && !seen[k - w] && !solid(k - w)) { seen[k - w] = 1; stack.push(k - w); }
        if (y < h - 1 && !seen[k + w] && !solid(k + w)) { seen[k + w] = 1; stack.push(k + w); }
      }
      if (!touchesEdge && region.length < w * h * 0.25) {
        for (const k of region) alpha[k] = 255;
      }
    }
  }

  // 生 Raw in, raw out, and one channel out. An encoded buffer read back as raw comes out
  // as scan lines, and sharp promotes a one-channel raw input to three on the way through
  // a blur, so without the colourspace the mask is three times the size it should be.
  const mask = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } })
    .median(3).blur(0.7).toColourspace('b-w').raw().toBuffer();
  if (mask.length !== w * h) throw new Error(`mask is ${mask.length} bytes for a ${w} by ${h} panel`);

  // 框 The box the creature actually occupies, so the file is the creature and not the
  // panel it happened to be drawn in.
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] > 26) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = 2;
  const crop = {
    left: Math.max(0, x0 - pad), top: Math.max(0, y0 - pad),
    width: Math.min(w, x1 + pad + 1) - Math.max(0, x0 - pad),
    height: Math.min(h, y1 + pad + 1) - Math.max(0, y0 - pad),
  };
  const long = Math.max(crop.width, crop.height);
  const scale = long > CUT_MAX ? CUT_MAX / long : 1;

  // 合 The four channels are assembled by hand and handed to sharp once. joinChannel over
  // an encoded base was where the scan lines came from: two buffers, two ideas about
  // where a row ends, and every other line of the creature dropped.
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0, j = 0; j < w * h; i += ch, j++) {
    // 緣 The half-transparent rim loses light as well, the same way 滲 the cultivator's
    // does. Every pixel the key was unsure about is paper, and paper at half opacity on
    // a dark stage is a white line drawn round the animal. 獸王 the wardens are painted
    // in mist and bone and wore it like a sticker's die-cut edge.
    const a = mask[j] / 255;
    const k = RIM + (1 - RIM) * a * a;
    rgba[j * 4] = Math.round(data[i] * k);
    rgba[j * 4 + 1] = Math.round(data[i + 1] * k);
    rgba[j * 4 + 2] = Math.round(data[i + 2] * k);
    rgba[j * 4 + 3] = mask[j];
  }
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract(crop)
    .resize(Math.round(crop.width * scale), Math.round(crop.height * scale))
    .webp({ quality: 86, alphaQuality: 90 })
    .toFile(out);
  return crop;
}

/**
 * 圓 A square of paper made into a round stamp, with the edge feathered so it is a wash
 * rather than a cut-out.
 */
function disc(square: Buffer, side: number) {
  const r = side / 2;
  const edge = Math.max(2, Math.round(side * 0.012));
  // 明 The mask has to carry its shape in its *alpha*: `dest-in` reads the overlay's
  // alpha channel, and a one-channel buffer has none, so a greyscale mask is read as
  // fully opaque everywhere and does nothing at all.
  const mask = Buffer.alloc(side * side * 4);
  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
      const t = (r - d) / edge;
      mask[(y * side + x) * 4 + 3] = t <= 0 ? 0 : t >= 1 ? 255 : Math.round(t * t * (3 - 2 * t) * 255);
    }
  }
  return sharp(square).ensureAlpha().composite([
    { input: mask, raw: { width: side, height: side, channels: 4 }, blend: 'dest-in' },
  ]);
}

async function cut(sheet: Sheet, file: string) {
  const g = await grey(file);
  const px = profile(g, 'x');
  const py = profile(g, 'y');
  const xs = boundaries(px, sheet.cols, g.w);
  const ys = boundaries(py, sheet.rows, g.h);

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

    if (sheet.kind === 'beast') {
      mkdirSync('public/art/cut', { recursive: true });
      await cutout(file, box, `public/art/cut/${c.key}.webp`);
    }

    // 修 The cultivator is only ever wanted with the paper off: he stands inside an aura
    // the game draws, never on a disc, so there is no squared version to keep.
    if (sheet.kind === 'self') {
      await bleed(file, box, out, { ghost: /-9$/.test(c.key) });
      written.push(out);
      continue;
    }

    if (sheet.kind === 'realm' || sheet.kind === 'meet' || sheet.kind === 'heaven'
        || sheet.kind === 'emblem') {
      const flat = await sharp(file).extract(box).resize(size.w, size.h, { fit: 'cover' }).toBuffer();
      // 圓 An emblem is a round stamp, not a square of paper.
      //
      // Bruno, looking at ten of them: *"quadrados dentro de círculos parece-me mal."* He
      // was looking at the proof page, but the game does it too: 洞天 the cave bed puts
      // its herb inside a ring that shows how far along the bed is, and a square of paper
      // with four corners inside a circle is exactly as bad as it sounds. Round from the
      // cut, and nothing can ever put a corner inside a circle again. See discOf.
      await (sheet.kind === 'emblem' ? disc(flat, size.w) : sharp(flat))
        .webp({ quality: 82 }).toFile(out);
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
