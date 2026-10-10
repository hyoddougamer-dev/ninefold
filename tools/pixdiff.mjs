/**
 * Say where two pictures differ: how many pixels, and the box they sit in. Used by
 * tools/regress.mjs to show what moved, not only that something did.
 *
 *     node tools/pixdiff.mjs before.png after.png
 */
import sharp from 'sharp';

export async function pixdiff(a, b) {
  const load = (p) => sharp(p).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const A = await load(a);
  const B = await load(b);
  if (A.info.width !== B.info.width || A.info.height !== B.info.height) {
    return { same: false, sized: [A.info, B.info], changed: -1, box: null };
  }
  const { width: w, height: h } = A.info;
  let changed = 0;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) {
        changed++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { same: changed === 0, changed, box: changed ? [x0, y0, x1, y1] : null, size: [w, h] };
}

if (process.argv[1] && process.argv[1].endsWith('pixdiff.mjs')) {
  const [a, b] = process.argv.slice(2);
  console.log(JSON.stringify(await pixdiff(a, b)));
}
