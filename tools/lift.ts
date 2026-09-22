import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

/**
 * 圖外 Every drawing on the page, lifted out into files beside it.
 *
 * The page is republished over itself as the game changes, and publishing over an
 * artifact means reading the published copy back in full first. 九境's nine realm
 * drawings are dense SVG: three hundred lines of this file tokenise to seventy-eight
 * thousand tokens, so the page grew past the point where it could be written over at
 * all, and a link had to be thrown away. The prose is a tenth of the weight. The
 * drawings are the rest.
 *
 * So they live in a folder beside the page and the page points at them. Two kinds, and
 * the difference matters:
 *
 *   色 A drawing with its own colours (a realm, a piece of gear, the arena) becomes an
 *     <img>. An image keeps every colour in it.
 *   單 An icon drawn in currentColor is a silhouette that takes its colour from the CSS
 *     around it, and an <img> would lose that. It becomes a CSS mask instead: the file
 *     is the shape, and the element paints currentColor through it. Same colour, same
 *     rule, none of the bytes.
 *
 * The name of each file is a hash of the drawing, so the same icon drawn in ten places
 * is one file fetched once, and a drawing that has not changed keeps its name.
 *
 * 共 Two pages use it: 頁 the bible and 藝 the art sheet, which is almost nothing but
 * drawings and would be three quarters of a megabyte without it.
 */
export function liftArt(html: string, dir: string): { page: string; plates: Map<string, string> } {
  const plates = new Map<string, string>();
  const out = html.replace(/<svg\b[\s\S]*?<\/svg>/g, (svg) => {
    const head = svg.slice(0, svg.indexOf('>') + 1);
    const w = /\swidth="([^"]+)"/.exec(head)?.[1] ?? '';
    const h = /\sheight="([^"]+)"/.exec(head)?.[1] ?? '';
    const label = /\saria-label="([^"]*)"/.exec(head)?.[1] ?? '';
    // 名 The hash is of the drawing itself, so nothing is renamed by being moved.
    let a = 5381;
    for (let i = 0; i < svg.length; i++) a = ((a * 33) ^ svg.charCodeAt(i)) >>> 0;
    const name = `a${a.toString(36)}.svg`;
    // 命 A standalone .svg file must carry the namespace. Inline SVG in an HTML page
    // does not need it and none of these had it, so the first lift wrote 123 files that
    // every browser refused to parse: nine broken-image boxes where the realms are.
    plates.set(name, svg.includes('xmlns=')
      ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
    const size = (v: string) => (v.endsWith('%') ? v : `${v}px`);
    const box = `width:${size(w || '100%')};height:${size(h || '100%')}`;
    if (svg.includes('currentColor')) {
      return `<i class="pl" style="${box};--pl:url(${dir}/${name})"`
        + `${label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"'}></i>`;
    }
    return `<img class="pl" style="${box}" src="${dir}/${name}"`
      + ` alt="${label}"${label ? '' : ' aria-hidden="true"'}>`;
  });
  return { page: out, plates };
}


/**
 * 寫 The drawings to disk, and the folder rebuilt rather than added to, so a drawing
 * that has left the page stops being published with it.
 */
export function writePlates(dir: string, plates: Map<string, string>): number {
  mkdirSync(dir, { recursive: true });
  for (const gone of readdirSync(dir)) if (gone.endsWith('.svg')) rmSync(`${dir}/${gone}`);
  for (const [name, svg] of plates) writeFileSync(`${dir}/${name}`, svg);
  return [...plates.values()].reduce((n, s) => n + s.length, 0);
}

/** 樣 The one rule the page has to carry for the lifted drawings to work. */
export const PLATE_CSS = `
  /* 圖外 A drawing that lives in a file beside this page.
     An <img class="pl"> keeps its own colours. An <i class="pl"> is a silhouette:
     the file is the shape, and the element paints currentColor through it, which is
     what keeps every icon taking its colour from the CSS around it as before. */
  i.pl { display:inline-block; vertical-align:middle; background:currentColor;
         -webkit-mask:var(--pl) center/contain no-repeat;
         mask:var(--pl) center/contain no-repeat; }
  img.pl { display:block; object-fit:contain; }
`;
