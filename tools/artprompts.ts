/**
 * 詞 The prompt kit: 54 prompts, one style, so the pictures come back as one set.
 *
 * 繪 Proposal C is the only direction that raises the ceiling and the only one with a
 * real bill. The bill is not money first, it is **consistency**: forty-five creatures
 * generated one at a time, each from a fresh idea of what the game looks like, come back
 * as forty-five different games. So this file writes every prompt the set needs from the
 * game's own tables, and every one of them carries the same style block, the same
 * palette, the same framing and the same words for the things that must not vary.
 *
 * 用 What a prompt is, for anyone who has not used one: it is the sentence you paste
 * into an image model. The model reads it and hands back a picture. It has no memory of
 * this game, so everything that matters has to be in the sentence: what the creature is,
 * how it is lit, what colour, what it must not have. That is the whole trick, and it is
 * why these are long.
 *
 * Run with `npm run artprompts`. It writes art-prompts.html.
 */
import { writeFileSync } from 'node:fs';
import { BEASTS } from '../src/data/bestiary.ts';
import { REALMS } from '../src/data/realms.ts';
import { STYLE, inkOf } from './ink.ts';
import { HEAVENS } from '../src/data/heavens.ts';

/**
 * 色 The one line that ties a picture to the realm it belongs to.
 *
 * It names a **pigment**, not a hex value, because that is what an image model
 * understands and it is what the direction is: somebody ground this colour. The hex is
 * there for whoever is matching the file to the game afterwards.
 */
const lit = (n: number) => {
  const r = inkOf(n);
  return `Painted in ink with ${r.stuff} as the only colour in the picture (${r.colour}),`
    + ' used sparingly, on a warm dark ground.';
};

/**
 * 姿 What a creature is doing, which is the only thing that varies between the beasts.
 *
 * It is written from the name rather than typed per beast, because a hand-written line
 * for thirty-six animals is thirty-six chances to drift. What a reader needs is the
 * animal and a posture, and the posture is the same question every time: what does this
 * thing look like the moment before it moves.
 */
const posture = (b: typeof BEASTS[number]) => b.warden
  ? `${b.name}, the guardian of its mountain: ancient, enormous, unbothered, seen from `
    + 'below through mist so that its full size is never shown at once.'
  : `${b.name}, a wild spirit-beast, caught mid-turn as it notices a traveller.`;

const beastPrompt = (b: typeof BEASTS[number]) => `${posture(b)}
${lit(b.realm)}
${STYLE}`;

const realmPrompt = (n: number) => {
  const r = inkOf(n);
  return `A wide landscape in the Song dynasty manner, seen from a great height: mountains
losing themselves in mist, one pine on a cliff in the foreground, a valley that goes
nowhere. No people, no buildings, no path. It is the realm called ${r.name}.
${lit(n)}
${STYLE}
Wide 16:9 composition instead of square, with the bottom third almost empty
so that writing can sit on it.`;
};

const heavenPrompt = (h: typeof HEAVENS[number]) => `A sky above the world, painted in ink:
layered cloud, one break of pale light, and the suggestion of something vast moving
through it that is never fully shown. Nothing solid anywhere in the picture. It is the
heaven called ${h.name}.
Painted in ink with worn gold leaf as the only colour (${h.colour}), used
sparingly, on a warm dark ground.
${STYLE}
Wide 16:9 composition instead of square.`;

const opener = `I am making art for a Chinese cultivation game, a xianxia story. Everything you draw for
me from now on must follow one house style, exactly, every time, with no
drift between images:

${STYLE}

The palette changes per realm and I will give you the colour each time. Do
not change the style between images. Do not add anything I did not ask for.
When I give you a creature, answer with the image only.

Say "ready" and wait.`;

const block = (id: string, title: string, sub: string, file: string, text: string) => `
  <div class="p" id="${id}">
    <div class="h"><b>${title}</b><i>${sub}</i>
      <code>${file}</code></div>
    <pre>${text}</pre>
  </div>`;

// 墨 The page wears the direction it is asking for: the bands are dyed with 墨 the ink
// palette rather than with the neon one the game still ships.
const beasts = REALMS.map((r) => `
  <div class="band" style="--hue:${inkOf(r.n).colour}">
    <h4><span class="cjk">${r.han}</span> ${r.name}</h4>
    ${BEASTS.filter((b) => b.realm === r.n).map((b) => block(
      `b-${b.key}`, `${b.han} ${b.name}`,
      b.warden ? 'warden' : 'common', `public/art/beast/${b.key}.webp`, beastPrompt(b),
    )).join('')}
  </div>`).join('');

const realms = REALMS.map((r) => `
  <div class="band" style="--hue:${inkOf(r.n).colour}">
    ${block(`r-${r.n}`, `${r.han} ${r.name}`, `realm ${r.n}`,
      `public/art/realm/${r.n}.webp`, realmPrompt(r.n))}
  </div>`).join('');

const heavens = HEAVENS.map((h) => `
  <div class="band" style="--hue:#C8A951">
    ${block(`h-${h.n}`, `${h.han} ${h.name}`, `heaven ${h.n}`,
      `public/art/heaven/${h.n}.webp`, heavenPrompt(h))}
  </div>`).join('');

const page = `<meta charset="utf-8">
<title>九境 Ninefold · 詞 the prompt kit</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600&family=Noto+Serif+SC:wght@400;600&family=Rajdhani:wght@600;700&display=swap">
<style>
  :root { --ground:#0E0D12; --panel:#17151C; --panel2:#131117; --line:#2E2A33;
          --cyan:#5E8C76; --magenta:#B4332C; --text:#DCD2C2; --faint:#8C8478;
          --gold:#C8A951; color-scheme:dark; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--text);
         font:17px/1.65 Archivo, ui-sans-serif, system-ui, sans-serif; }
  .sheet { max-width:880px; margin:0 auto; padding:34px 18px 90px; }
  .cjk { font-family:'Noto Serif SC',serif; }
  h1 { font-family:'Noto Serif SC',serif; font-size:clamp(38px,11vw,56px); font-weight:400;
       color:var(--gold); line-height:1; margin:0; }
  h2 { font-family:Rajdhani,sans-serif; font-size:25px; margin:0; display:flex; gap:11px;
       align-items:baseline; }
  h2 .h { font-family:'Noto Serif SC',serif; font-weight:400; font-size:29px; color:var(--gold); }
  h4 { font-family:Rajdhani,sans-serif; font-size:15px; margin:0 0 10px; color:var(--hue);
       font-weight:700; }
  h4 .cjk { font-weight:400; font-size:19px; margin-right:7px; }
  p { margin:0; }
  .lead { font-size:19px; margin-top:13px; color:var(--faint); }
  .sec { margin-top:38px; border-top:1px solid var(--line); padding-top:20px;
         display:flex; flex-direction:column; gap:14px; }
  .t { color:var(--faint); max-width:64ch; }
  .t b { color:var(--text); font-weight:600; }
  .rule { border-left:3px solid var(--cyan); background:var(--panel2);
          border-radius:0 10px 10px 0; padding:13px 16px; color:var(--faint); }
  .rule b { color:var(--cyan); }
  .band { background:var(--panel2); border:1px solid var(--line); border-radius:13px;
          padding:14px 15px; }
  .p { margin-bottom:12px; }
  .p:last-child { margin-bottom:0; }
  .p .h { display:flex; gap:10px; align-items:baseline; flex-wrap:wrap; margin-bottom:6px; }
  .p .h b { font-family:'Noto Serif SC',serif; font-weight:400; font-size:17px; color:var(--hue,var(--cyan)); }
  .p .h i { font-style:normal; font-size:11px; letter-spacing:.12em; text-transform:uppercase;
            color:var(--faint); }
  .p .h code { margin-left:auto; }
  code { font-family:'Roboto Mono',monospace; font-size:12px; color:var(--gold);
         background:var(--panel); padding:2px 7px; border-radius:6px; }
  pre { background:var(--panel); border:1px solid var(--line); border-radius:11px;
        padding:13px; overflow-x:auto; font-family:'Roboto Mono',monospace; font-size:12px;
        line-height:1.65; color:var(--text); white-space:pre-wrap; margin:0; }
  table { border-collapse:collapse; width:100%; font-size:14px; }
  th { text-align:left; font-family:Rajdhani,sans-serif; font-size:12px; color:var(--faint);
       letter-spacing:.1em; text-transform:uppercase; padding:0 8px 6px; font-weight:700; }
  td { border-top:1px solid var(--line); padding:8px; color:var(--faint); vertical-align:top; }
  td b { color:var(--text); font-weight:600; }
  .toc { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:7px;
         margin-top:18px; }
  .toc a { background:var(--panel2); border:1px solid var(--line); border-radius:10px;
           padding:9px 12px; color:var(--text); text-decoration:none; font-size:14px; }
  a { color:var(--cyan); }
</style>

<div class="sheet">
  <header>
    <h1>詞</h1>
    <p class="lead"><b style="color:var(--text)">Every prompt the painted game needs,
      written from the game's own tables.</b> ${BEASTS.length} creatures, ${REALMS.length}
      realms and ${HEAVENS.length} heavens, and all of them carry the same style block
      word for word, because the hard part of ${BEASTS.length + 18} pictures is not making
      them. It is making them look like one game.</p>
    <div class="toc">
      <a href="#how">用 How to use this</a>
      <a href="#opener">開 The opener</a>
      <a href="#beasts">獸 The creatures</a>
      <a href="#realms">境 The realms</a>
      <a href="#heavens">境外 The heavens</a>
      <a href="#files">檔 The files</a>
    </div>
  </header>

  <section class="sec" id="how">
    <h2><span class="h">用</span> How this works, start to finish</h2>
    <table>
      <tr><th>Step</th><th>What to do</th></tr>
      <tr><td><b>1</b></td><td>Open an image model. ChatGPT with DALL·E, or Midjourney, or
        anything that takes a sentence and hands back a picture.</td></tr>
      <tr><td><b>2</b></td><td>Paste <a href="#opener">開 the opener</a> once, at the start
        of the conversation. It locks the house style so the rest of the session does not
        drift.</td></tr>
      <tr><td><b>3</b></td><td>Paste one creature's prompt. Look at what comes back. If it
        is wrong, the single most useful thing to say is <i>same composition, simpler,
        stronger silhouette, less detail</i>.</td></tr>
      <tr><td><b>4</b></td><td>Save the picture under the exact file name in the grey box
        next to the prompt. The name is how the game finds it and nothing else looks at
        it.</td></tr>
      <tr><td><b>5</b></td><td>Convert to WebP at about quality 80 if it came back as PNG.
        <a href="https://squoosh.app/">squoosh.app</a> does it in a browser with nothing
        installed.</td></tr>
      <tr><td><b>6</b></td><td>Put the file in the repository at that path, run
        <code>npm run pictures</code>, and it is in the game. Or hand the files over and
        I will do it.</td></tr>
    </table>
    <div class="rule"><b>You do not have to do all 54.</b> A missing picture is not a
      hole: 牌 the plate keeps the silhouette inside the same frame until a file lands, so
      the game is never half-drawn. Doing the nine wardens first is a real change on its
      own, because a warden is the fight a realm is remembered for.</div>
    <div class="rule"><b>And do not ask for the Chinese.</b> An image model produces
      characters that are nearly right, which is worse than wrong and which neither of us
      can see. Every prompt here ends with <i>no text, no characters</i>. The game draws
      the names itself, in its own typeface, over the top.</div>
  </section>

  <section class="sec" id="opener">
    <h2><span class="h">開</span> The opener, pasted once</h2>
    <p class="t">This is the message that makes the other 54 short. It teaches the model
      the house style, and after it you can paste a creature prompt and get back something
      that belongs in the same game as the last one.</p>
    <pre>${opener}</pre>
  </section>

  <section class="sec" id="beasts">
    <h2><span class="h">獸</span> The ${BEASTS.length} creatures</h2>
    <p class="t">Nine wardens and twenty-seven commons. The wardens are worth doing first:
      each one is the fight a whole realm is remembered for, and there are only nine.</p>
    ${beasts}
  </section>

  <section class="sec" id="realms">
    <h2><span class="h">境</span> The nine realms</h2>
    <p class="t">These are wide, and they sit behind a card rather than inside a circle,
      so they are asked for at 16:9 with an empty bottom third for the text to sit on.</p>
    ${realms}
  </section>

  <section class="sec" id="heavens">
    <h2><span class="h">境外</span> The nine heavens</h2>
    <p class="t">Above the ninth realm. Nothing solid in them: cloud, light, and the
      suggestion of something passing through without ever being shown.</p>
    ${heavens}
  </section>

  <section class="sec" id="files">
    <h2><span class="h">檔</span> What the files have to be</h2>
    <table>
      <tr><th>Kind</th><th>Size</th><th>Format</th><th>Where</th></tr>
      <tr><td><b>A creature</b></td><td>512 by 512</td><td>WebP, quality 80, 30 to 60 KB</td>
        <td><code>public/art/beast/&lt;key&gt;.webp</code></td></tr>
      <tr><td><b>A realm</b></td><td>768 by 432</td><td>WebP, quality 80</td>
        <td><code>public/art/realm/&lt;n&gt;.webp</code></td></tr>
      <tr><td><b>A heaven</b></td><td>768 by 432</td><td>WebP, quality 80</td>
        <td><code>public/art/heaven/&lt;n&gt;.webp</code></td></tr>
    </table>
    <div class="rule"><b>Why WebP, and why those sizes.</b> A creature is drawn inside a
      circle at 94 to 140 pixels on a phone, so 512 is twice what the densest screen needs
      and it still holds up on a tablet. WebP at quality 80 puts one at 30 to 60 KB
      against 200 KB or more for a PNG, and ${BEASTS.length} of them is then under three
      megabytes for the whole game, fetched one realm at a time rather than all at
      once.</div>
    <div class="rule"><b>The circle is not a suggestion.</b> 牌 The plate clips a creature
      to a circle at 42% of the frame. Anything in the corners is gone. That is why every
      prompt says centred and filling the frame, and it is worth checking before saving:
      if the tail is in the corner, the tail will not be in the game.</div>
  </section>

  <footer class="sec" style="color:var(--faint);font-size:13.5px">
    <p>Written by <code>npm run artprompts</code> from the game's own tables, so a beast
      added to the game arrives here with a prompt already written for it.</p>
  </footer>
</div>
`;

writeFileSync('art-prompts.html', page);
console.log(`art-prompts.html · ${Math.round(page.length / 1024)} KB · `
  + `${BEASTS.length} creatures, ${REALMS.length} realms, ${HEAVENS.length} heavens`);
