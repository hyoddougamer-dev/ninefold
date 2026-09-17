"""Compose the complete art proposal: cultivators, creatures, items, in one page."""
import sys
sys.path.insert(0, '.')
import techniques as T, creatures as C, items as I, build_beasts as BB

REALM = [None, ("練氣","Qi Refining"), ("築基","Foundation"), ("金丹","Golden Core"),
         ("元嬰","Nascent Soul"), ("化神","Spirit Severing"), ("煉虛","Void Refining"),
         ("合體","Unity"), ("大乘","Great Vehicle"), ("渡劫","Tribulation")]
PH = {1:("#3E7A4C","#8FD9A0"),2:("#3E7A4C","#8FD9A0"),3:("#A43A26","#F0906A"),
      4:("#A43A26","#F0906A"),5:("#A07420","#F2CE72"),6:("#A07420","#F2CE72"),
      7:("#7E8994","#DCE6EE"),8:("#7E8994","#DCE6EE"),9:("#32509A","#8FB4F0")}


def cultivators():
    T.PHASE = PH
    T.NAMES = {r: REALM[r] for r in range(1, 10)}
    return "".join('<figure>%s<b>%s</b><span>%s</span></figure>'
                   % (T.contour(r, 200, 300), REALM[r][0], REALM[r][1])
                   for r in range(1, 10))


def creatures(keys, style):
    return "".join('<figure>%s<b>%s</b><span>%s</span></figure>'
                   % (BB.framed(k, style), C.NAMES[k][0], C.NAMES[k][1]) for k in keys)


def itemgrid():
    return "".join('<figure>%s<b>%s</b><span>%s</span></figure>'
                   % (I.tile(k, 200), ch, en) for k, ch, en, _, _ in I.ITEMS)


def ladder():
    return "".join(
        '<div class="tier"><i style="background:%s"></i><b>%s</b><span>%s</span></div>'
        % (light, ch, en) for ch, en, deep, light in I.TIERS)


HEAD = '''<title>Ninefold Art System</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;500;700&family=Noto+Sans+SC:wght@300;400;500&display=swap">
<style>
/* One visual world on purpose: a lacquer ground. This is a document about a game read at
   night; a light variant would describe a different game. Every colour is stated, so the
   page holds whichever ground the viewer paints behind it. */
:root{
  --ground:#05100D; --panel:#0A1A16; --panel2:#0C211B;
  --jade:#4ECFA3; --gold:#D4A843; --verm:#C8442C;
  --text:#E6EEE8; --dim:#7C9389; --faint:#4A5D56;
  --hair:rgba(212,168,67,.20); --hair-soft:rgba(212,168,67,.11);
  --serif:"Noto Serif SC",Songti SC,Georgia,serif;
  --sans:"Noto Sans SC",-apple-system,Segoe UI,Roboto,sans-serif;
  color-scheme:dark;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--text);font-family:var(--sans);
  -webkit-font-smoothing:antialiased}
body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(1200px 520px at 50% -8%,rgba(78,207,163,.09),transparent 70%)}
.page{position:relative;z-index:1;max-width:1000px;margin:0 auto;
  padding-inline:20px;padding-block:0 70px}

h1{font-family:var(--serif);font-weight:700;font-size:clamp(28px,6.4vw,46px);
  letter-spacing:.05em;margin:0;text-wrap:balance;
  background:linear-gradient(180deg,#F4E6C0,#D4A843 60%,#A87C26);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.lede{max-width:64ch;margin-block:16px 0;font-size:15px;line-height:1.75;color:var(--dim)}
header.top{padding-block:58px 0}
h2{font-family:var(--serif);font-weight:500;font-size:19px;letter-spacing:.16em;
  margin-block:0 6px}
h2 em{font-style:normal;color:var(--gold)}
.sub{max-width:62ch;font-size:13.5px;line-height:1.7;color:var(--dim);margin-block:0 22px}
section{margin-block:0 48px}
section+section{padding-block:36px 0;border-top:1px solid var(--hair-soft)}

.grid{display:grid;gap:9px}
.g9{grid-template-columns:repeat(3,1fr)}
.g6{grid-template-columns:repeat(6,1fr)}
.g5{grid-template-columns:repeat(5,1fr)}
.g4{grid-template-columns:repeat(4,1fr)}
@media (max-width:820px){.g6{grid-template-columns:repeat(4,1fr)}
  .g5{grid-template-columns:repeat(3,1fr)}}
@media (max-width:520px){.g9,.g4{grid-template-columns:repeat(2,1fr)}
  .g6,.g5{grid-template-columns:repeat(3,1fr)}}

figure{margin:0;text-align:center;background:linear-gradient(180deg,#08150F,#050D0B);
  border:1px solid var(--hair-soft);border-radius:2px;padding:7px 4px 10px;overflow:hidden}
figure svg{width:100%;height:auto;display:block}
figure b{display:block;font-family:var(--serif);font-size:13px;font-weight:500;
  margin-block:5px 0;letter-spacing:.05em}
figure span{display:block;font-size:8px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--faint);margin-block:3px 0}

.tiers{display:flex;flex-wrap:wrap;gap:9px;margin-block:0 18px}
.tier{display:flex;align-items:center;gap:8px;background:var(--panel);
  border:1px solid var(--hair-soft);border-radius:2px;padding:7px 12px 7px 9px}
.tier i{width:14px;height:14px;border-radius:2px;flex:none;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
.tier b{font-family:var(--serif);font-size:14px;font-weight:500}
.tier span{font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--faint)}

.rec{background:var(--panel2);border:1px solid rgba(78,207,163,.28);border-radius:3px;
  padding:20px}
.rec h3{font-family:var(--serif);font-size:15px;font-weight:500;letter-spacing:.14em;
  margin:0 0 12px;color:var(--jade)}
.rec p{font-size:13.5px;line-height:1.75;color:var(--dim);margin:0 0 12px;max-width:64ch}
.rec p:last-child{margin-bottom:0}
.rec b{color:var(--text);font-weight:500}
.note{font-size:12.5px;line-height:1.7;color:var(--faint);margin-block:14px 0;
  max-width:64ch}
</style>
'''

if __name__ == "__main__":
    body = '''<header class="top">
<h1>Ninefold &mdash; the art system</h1>
<p class="lede">Nine cultivators, eighteen beasts, two humanoids and twenty items, all
generated from three rules. Nothing here is illustrated: every mark is geometry and
type, which is the one thing in this project that has never failed.</p>
</header>

<section>
<h2><em>一</em> &nbsp; 修士 &nbsp; The cultivator</h2>
<p class="sub">線 contour. The body is described by horizontal bars and has no outline at
all &mdash; which matters, because every rejected figure in this project was rejected for
its outline. What cannot exist cannot be wrong. The realm shows in the colour, the halo,
the lotus seat and the motes; the body itself barely changes, because a cultivator is
still a person at the ninth realm.</p>
<div class="grid g9">%s</div>
</section>

<section>
<h2><em>二</em> &nbsp; 十八獸 &nbsp; The beasts</h2>
<p class="sub">饕餮 masks in 印 seal frames. Frontal, rigidly symmetric, assembled from one
vocabulary: horns, ears, brow, eyes, snout, mouth, fangs, tongue, tusks, whiskers,
antennae, ruff, hood, markings, body. Each beast is a row in a table &mdash; which is why
eighteen of them are distinct from each other and obviously one family.</p>
<div class="grid g6">%s</div>
</section>

<section>
<h2><em>三</em> &nbsp; 妖王 · 魔修 &nbsp; Wardens and humanoids</h2>
<p class="sub">章 medallion frames. The same masks, given a metal rim &mdash; a warden is
the beast elevated, and the frame says so without the creature having to be redrawn
bigger. Humanoids use the same grammar with shoulders instead of a body.</p>
<div class="grid g4">%s</div>
</section>

<section>
<h2><em>四</em> &nbsp; 物 &nbsp; Items and materials</h2>
<p class="sub">Flat marks on a rarity tile. The 五階 ladder is carried by the <b>frame</b>,
not by the object: the same pill at Common and at Heaven is one drawing in two tiles,
so a player reads rarity across a grid without reading a word.</p>
<div class="tiers">%s</div>
<div class="grid g5">%s</div>
</section>

<section>
<h2><em>五</em> &nbsp; What I recommend</h2>
<div class="rec">
<h3>All three, as one system</h3>
<p>They already are one system: the same palette, the same lacquer ground, the same rule
that a thing is <b>a shape plus a rank</b>. A realm is a contour figure plus a halo count.
A beast is a mask plus a frame. An item is an object plus a tile. Nothing needs a
separate pipeline and nothing can drift apart, because none of it is drawn.</p>
<p>The cost is stated plainly: this is a <b>graphic</b> system, not a painted one. It will
look designed rather than illustrated, and it will never produce a key visual. What it
buys is that the whole library &mdash; every realm, every beast, every drop &mdash;
exists today, is consistent by construction, and costs nothing per asset.</p>
<p>If painted art arrives later, from a pack or a commission, it replaces the marks one
for one. The tiles, the frames and the palette stay; only what sits inside them changes.</p>
</div>
<p class="note">Honest about the weak points: the beetle and the crane are the two
softest masks in the set, the moth reads as a face more than an insect, and the hydra's
three heads are a compromise for nine. All three are parameter problems, not technique
problems.</p>
</section>''' % (cultivators(), creatures(BB.ORDER, "seal"),
                 creatures(BB.HUMANOID + ["tiger", "qilin"], "medal"),
                 ladder(), itemgrid())
    open("system.html", "w").write(HEAD + '<div class="page">' + body + '</div>')
    import os
    print("%.0f KB" % (os.path.getsize("system.html") / 1024))
