"""Compose the complete art proposal: cultivators, creatures, items, in one page."""
import sys
sys.path.insert(0, '.')
import techniques as T, creatures as C, items as I, build_beasts as BB, forge as F

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


def itemgrid(rows, size=200):
    return "".join('<figure>%s<b>%s</b><span>%s</span></figure>'
                   % (I.tile(k, size), ch, en) for k, ch, en, _, _ in rows)


def groups():
    """The five kinds, each labelled. A bag that mixes a fang with a crown teaches nothing;
    a bag with five headings teaches the economy in one screen."""
    out = ""
    for ch, en, note, rows in I.GROUPS:
        if en == "Gear":          # 法器 gets its own section, below
            continue
        out += ('<div class="grp"><h3><em>%s</em>%s<i>%s</i></h3><div class="grid g5">%s</div></div>'
                % (ch, en, note, itemgrid(rows, 160)))
    return out


def slots():
    """The six gear slots. Shown at mixed tiers on purpose: six Heaven tiles side by side
    read as one red smear, and this row's job is to tell the six SLOTS apart."""
    tiers = {"crown": 3, "robe": 2, "pendant": 4, "boots": 1, "ring": 3, "vessel": 0}
    return "".join(
        '<figure>%s<b>%s</b><span>%s</span></figure>' % (I.tile(k, 160, tiers[k]), ch, en)
        for k, ch, en, _, _, _, _ in F.SLOTS)


def slottable():
    return "".join(
        '<tr><td class="cjk">%s</td><td>%s</td><td class="cjk sm">%s</td>'
        '<td class="num">%s</td><td class="why">%s</td></tr>'
        % (ch, en, gch, val, why) for k, ch, en, gch, gen, val, why in F.SLOTS)


def tierline(key):
    """The same piece across the 五階 ladder — the tile carrying the rank, nothing else."""
    return "".join('<figure>%s<b>%s</b></figure>' % (I.tile(key, 150, t), I.TIERS[t][0])
                   for t in range(5))


def costtable():
    rows = ""
    for t in range(5):
        steps = [F.refine_cost(t, L) for L in range(1, 10)]
        rows += ('<tr><td class="cjk">%s</td><td>%s</td><td class="num">%d</td>'
                 '<td class="num">%d</td><td class="num">%d</td><td class="num">%d</td>'
                 '<td class="num">%.0f</td></tr>'
                 % (I.TIERS[t][0], I.TIERS[t][1], F.FORGE[t], steps[0], steps[-1],
                    F.piece_total(t), F.piece_total(t) / 3))
    return rows


def haultable():
    base = [F.haul_sum(n, 5) for n in (4, 8, 20, 50)]
    rows = ""
    for K, lbl, sub in ((5, "no vessel", "K = 5.0"), (6.2, "靈 Spirit vessel", "K = 6.2"),
                        (8, "地 Earth vessel", "K = 8.0"), (11, "天 Heaven vessel 鍊9", "K = 11.0")):
        cells = "".join('<td class="num">&times;%.2f</td>' % (F.haul_sum(n, K) / base[0])
                        for n in (4, 8, 20, 50))
        rows += '<tr><td>%s</td><td class="sm">%s</td>%s</tr>' % (lbl, sub, cells)
    return rows


def marks():
    return "".join('<tr><td class="cjk">%s</td><td>%s</td><td class="why">%s</td></tr>' % m
                   for m in F.MARKS)


def origins():
    rows = ""
    for k, ch, en, gch, gen, val, why in F.SLOTS:
        srcs = " &middot; ".join("%s <i>%s</i>" % (C.NAMES[b][1], g) for b, g in F.ORIGIN[k])
        rows += '<tr><td class="cjk">%s</td><td>%s</td><td class="why">%s</td></tr>' % (ch, en, srcs)
    return rows


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

/* ── the item groups and the forge ─────────────────────────────────────── */
.grp{margin-block:0 34px}
.grp h3{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin:0 0 16px;
  padding-bottom:9px;border-bottom:1px solid var(--hair-soft);
  font-family:var(--sans);font-size:13px;font-weight:500;letter-spacing:.1em;
  color:var(--text);text-transform:uppercase}
.grp h3 em{font-family:var(--serif);font-style:normal;font-size:19px;letter-spacing:.05em;
  color:var(--gold)}
.grp h3 i{font-style:normal;font-size:12px;letter-spacing:0;text-transform:none;
  color:var(--faint);font-weight:300}

table.t{width:100%;border-collapse:collapse;margin-block:20px 0;font-size:13px}
table.t caption{caption-side:top;text-align:left;font-family:var(--sans);font-size:11.5px;
  letter-spacing:.14em;text-transform:uppercase;color:var(--faint);padding-bottom:10px}
table.t th{text-align:left;font-family:var(--sans);font-size:11px;font-weight:500;
  letter-spacing:.12em;text-transform:uppercase;color:var(--faint);
  padding:0 14px 9px 0;border-bottom:1px solid var(--hair)}
table.t td{padding:11px 14px 11px 0;border-bottom:1px solid var(--hair-soft);
  color:var(--dim);vertical-align:baseline}
table.t tr:last-child td{border-bottom:none}
table.t td:nth-child(2){color:var(--text)}
td.cjk{font-family:var(--serif);font-size:19px;color:var(--gold) !important;
  white-space:nowrap;width:1%}
td.sm,.sm{font-size:11.5px;color:var(--faint)}
td.num{font-variant-numeric:tabular-nums;color:var(--jade) !important;white-space:nowrap}
th.num{text-align:right}
table.t td.num{text-align:right}
td.why{font-size:12.5px;line-height:1.6;color:var(--faint)}

.fork{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));
  margin-block:22px 0}
.opt{background:var(--panel);border:1px solid var(--hair-soft);border-radius:3px;
  padding:16px 16px 15px}
.opt.pick{border-color:rgba(78,207,163,.34);background:var(--panel2)}
.opt h4{font-family:var(--sans);font-size:11px;font-weight:500;letter-spacing:.14em;
  text-transform:uppercase;margin:0 0 4px;color:var(--faint)}
.opt.pick h4{color:var(--jade)}
.opt b{display:block;font-family:var(--serif);font-size:15px;font-weight:500;
  color:var(--text);margin-bottom:9px}
.opt p{font-size:12.5px;line-height:1.65;color:var(--dim);margin:0 0 8px}
.opt p:last-child{margin-bottom:0}
.opt .con{color:var(--faint)}
.opt .con::before{content:"\2014\00a0"}

.ladder{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-start;margin-block:18px 0}
.ladder figure{margin:0;text-align:center}
.ladder figure b{display:block;font-family:var(--serif);font-size:15px;font-weight:500;
  color:var(--gold);margin-top:7px}
.ask{background:rgba(200,68,44,.07);border-left:2px solid var(--verm);
  padding:14px 18px;margin-block:22px 0;border-radius:0 3px 3px 0}
.ask b{display:block;font-family:var(--sans);font-size:11px;font-weight:500;
  letter-spacing:.14em;text-transform:uppercase;color:var(--verm);margin-bottom:7px}
.ask p{font-size:13px;line-height:1.7;color:var(--dim);margin:0;max-width:64ch}
.ask dl{margin:0;max-width:66ch}
.ask dt{font-family:var(--serif);font-size:14.5px;font-weight:500;color:var(--text);
  margin-top:14px}
.ask dt:first-child{margin-top:0}
.ask dd{margin:5px 0 0;font-size:12.5px;line-height:1.7;color:var(--dim)}
.ask dd em{font-style:normal;color:var(--gold)}
</style>
'''

if __name__ == "__main__":
    body = r'''<header class="top">
<h1>Ninefold &mdash; the art system</h1>
<p class="lede">Nine cultivators, eighteen beasts, two humanoids and twenty-eight items,
all generated from three rules &mdash; and the equipment system those items feed. Nothing
here is illustrated: every mark is geometry and type, which is the one thing in this
project that has never failed.</p>
</header>

<section>
<h2><em>一</em> &nbsp; 修士 &nbsp; The cultivator</h2>
<p class="sub">線 contour. The body is described by horizontal bars and has no outline at
all &mdash; which matters, because every rejected figure in this project was rejected for
its outline. What cannot exist cannot be wrong. The realm shows in the colour, the halo,
the lotus seat and the motes; the body itself barely changes, because a cultivator is
still a person at the ninth realm.</p>
<div class="grid g9">{{CULT}}</div>
</section>

<section>
<h2><em>二</em> &nbsp; 十八獸 &nbsp; The beasts</h2>
<p class="sub">饕餮 masks in 印 seal frames. Frontal, rigidly symmetric, assembled from one
vocabulary: horns, ears, brow, eyes, snout, mouth, fangs, tongue, tusks, whiskers,
antennae, ruff, hood, markings, body. Each beast is a row in a table &mdash; which is why
eighteen of them are distinct from each other and obviously one family.</p>
<div class="grid g6">{{BEASTS}}</div>
</section>

<section>
<h2><em>三</em> &nbsp; 妖王 · 魔修 &nbsp; Wardens and humanoids</h2>
<p class="sub">章 medallion frames. The same masks, given a metal rim &mdash; a warden is
the beast elevated, and the frame says so without the creature having to be redrawn
bigger. Humanoids use the same grammar with shoulders instead of a body.</p>
<div class="grid g4">{{HUMAN}}</div>
</section>

<section>
<h2><em>四</em> &nbsp; 物 &nbsp; What is in the bag</h2>
<p class="sub">No weapons here. A path &mdash; 劍 sword, 刀 blade, 弓 bow &mdash; is who you
are, not something you carry in a satchel beside a fang, so weapons live on the cultivator
and never in the inventory. What the bag holds is four kinds of stuff and one kind of
equipment, and each kind has exactly one reason to exist.</p>
<div class="tiers">{{LADDER}}</div>
<p class="note">The 五階 ladder is carried by the <b>tile</b>, not by the object: the same
pill at Common and at Heaven is one drawing in two frames, so a player reads rarity across
a grid without reading a word.</p>
{{GROUPS}}
</section>

<section>
<h2><em>五</em> &nbsp; 鍛 &nbsp; The forge &mdash; equipment progression</h2>
<p class="sub">This is the proposal. A piece of gear is <b>three numbers and a name</b>:
源 where it came from, 階 how good it can get, 鍊 how far up that ceiling it is. No affix
soup, no rolled stat lines, no item level. A player reads a piece exactly the way they
read a beast &mdash; a shape plus a rank.</p>

<h3 class="sub" style="color:var(--text);font-family:var(--serif);font-size:16px;
letter-spacing:.06em;margin-block:34px 0">六位 &nbsp; The six slots</h3>
<p class="sub">Six copies of &ldquo;+x% power&rdquo; would be one stat wearing six hats.
Each slot instead owns a different <b>verb</b>, so choosing between two pieces is a real
question and the six together read as a kit rather than a score.</p>
<div class="grid g6">{{SLOTS}}</div>
<table class="t"><caption>what each slot does, at 天 Heaven 鍊9</caption>
<tr><th></th><th>slot</th><th></th><th class="num">at the top</th><th>why it exists</th></tr>
{{SLOTTABLE}}</table>
<p class="note"><b>Read the 袍 Robe row twice.</b> It is the only slot in the game that
touches gathering, and it is deliberately the smallest number on this page. Full Heaven
gear multiplies the 靜 Stillness road by <b>&times;1.14</b> &mdash; about seven 九層
layers &mdash; and the 動 Motion road by roughly <b>&times;3.2</b>. That asymmetry is the
whole design: gear is the sink the active road needed, and it cannot quietly become
mandatory for the player who opens the app once a day.</p>

<h3 class="sub" style="color:var(--text);font-family:var(--serif);font-size:16px;
letter-spacing:.06em;margin-block:38px 0">源 &nbsp; Where a piece comes from</h3>
<p class="sub">Three beasts furnish each slot, one per ground, and no ground furnishes the
same slot twice. This is the third finding made mechanical: in the old build three wardens
and four beasts were never reached by anyone. Here you cannot finish a kit without
visiting every ground, and <b>the 地 Earth and 天 Heaven patterns drop only from that
ground&rsquo;s warden</b>. The content that was unreachable is now the content the
end-game is made of.</p>
<table class="t">{{ORIGINS}}</table>

<h3 class="sub" style="color:var(--text);font-family:var(--serif);font-size:16px;
letter-spacing:.06em;margin-block:38px 0">階 &nbsp; The ladder, on one piece</h3>
<p class="sub">The same vessel at all five tiers. Nothing about the object changes; the
tile carries the whole statement. Tier is not luck &mdash; it is decided by the material
you put in, so a dry streak can cost you <em>time</em> and never costs you a tier.</p>
<div class="ladder">{{TIERLINE}}</div>

<h3 class="sub" style="color:var(--text);font-family:var(--serif);font-size:16px;
letter-spacing:.06em;margin-block:38px 0">鍊 &nbsp; Refinement, and what it costs</h3>
<p class="sub">Nine steps per piece, <b>+2% compounding each</b> &mdash; the same step as
九層 nine layers, so it is one number the player learns once and then recognises
everywhere. 鍊9 is &times;1.195. Refinement never fails and never takes a piece back down:
<em>new power is paid for in the cost table, never by taking the power back out.</em></p>
<table class="t"><caption>units of that beast&rsquo;s material, at that tier</caption>
<tr><th></th><th>tier</th><th class="num">forge</th><th class="num">鍊1</th>
<th class="num">鍊9</th><th class="num">piece total</th><th class="num">hunts</th></tr>
{{COSTTABLE}}</table>
<p class="note">At roughly three units of a given beast&rsquo;s material per hunt: a full
玄 Mystic kit is <b>368 hunts &mdash; about six weeks</b> at eight hunts a day. A full 天
Heaven kit is <b>1&#8202;000 hunts, about four months</b>. That is the shape an end-game
wants: reachable, and not this month.</p>

<h3 class="sub" style="color:var(--text);font-family:var(--serif);font-size:16px;
letter-spacing:.06em;margin-block:38px 0">韌 &nbsp; The one number worth arguing about</h3>
<p class="sub">The 器 Vessel does not multiply the haul. It raises <b>K</b>, the constant
in the hunting decay curve <code>h(n) = 1 / (1 + (n&#8722;1)/K)</code>. That makes it worth
almost nothing on hunt one and a great deal on hunt forty &mdash; a marathon slot, which
is exactly the reward the uncapped hunting design was missing.</p>
<table class="t"><caption>haul vs. four bare hunts, the GDD&rsquo;s reference row</caption>
<tr><th>vessel</th><th></th><th class="num">4 hunts</th><th class="num">8</th>
<th class="num">20</th><th class="num">50</th></tr>
{{HAULTABLE}}</table>
<p class="note">Note what does <em>not</em> happen: the four-hunt player still gains
(&times;1.12), so the vessel is never dead weight, and the fifty-hunt player goes from
&times;3.93 to &times;6.07 &mdash; rewarded hard, while still spending more than a day of
qi to get there. The brake stays a curve, not a rule.</p>

<h3 class="sub" style="color:var(--text);font-family:var(--serif);font-size:16px;
letter-spacing:.06em;margin-block:38px 0">紋 &nbsp; Eight marks, at 地 and 天 only</h3>
<p class="sub">One rolled property, at the top two tiers only, from a fixed pool of eight.
This is where variety is allowed in &mdash; late, small, and readable in a single line.
Rerolling costs 幣 sect coin, which gives that currency the second use it currently
lacks.</p>
<table class="t">{{MARKS}}</table>

<h3 class="sub" style="color:var(--text);font-family:var(--serif);font-size:16px;
letter-spacing:.06em;margin-block:38px 0">The fork &mdash; how a piece is acquired</h3>
<p class="sub">This is the decision I am putting to you rather than taking. All three
work; they fail in different places.</p>
<div class="fork">
<div class="opt"><h4>Option A</h4><b>Pure craft</b>
<p>Beasts drop materials only. The forge turns N materials into a piece at the tier you
paid for.</p>
<p class="con">Perfectly predictable, zero bad luck &mdash; and zero surprise. Every
player&rsquo;s bag is identical at the same point. The bag stops being a place you look.</p></div>
<div class="opt"><h4>Option B</h4><b>Pure drop</b>
<p>Beasts drop finished pieces with rolled tier and stats. Kill things, hope.</p>
<p class="con">Highest moment-to-moment excitement, and the exact failure mode that killed
the old build: a dry week is indistinguishable from no content.</p></div>
<div class="opt pick"><h4>Option C &mdash; recommended</h4><b>圖 Drop the pattern, forge the piece</b>
<p>A beast drops its <b>pattern</b> the first time, guaranteed by kill count rather than
by chance &mdash; a permanent unlock, one per beast. Materials drop forever. The piece is
then forged deterministically.</p>
<p>Luck decides <em>when</em> you unlock, never <em>whether</em>. Eighteen guaranteed
first-time moments, and the forge still answers to the cost table.</p></div>
</div>
<p class="note">Why C, in one line: the second finding was that novelty collapses from
57.6 first-time events in the opening hour to about one a week. This system generates
<b>116 distinct first-time events</b> &mdash; 18 patterns, 30 first forges, 54 refinement
steps, 6 completed ground sets, 8 marks &mdash; spread across the months the 8&rarr;9 gap
actually lasts.</p>

<div class="ask"><b>Three smaller calls, which are yours to make</b>
<dl>
<dt>Can 鍊 refinement fail?</dt>
<dd><em>I say no.</em> The xianxia standard is that refining can shatter your sword, and
our own stated rule forbids taking power back out. The middle option, if you want the
tension: a failure wastes the materials and never touches the piece.</dd>
<dt>Does 鍊 carry across tiers?</dt>
<dd><em>I say yes.</em> 移 transfer half your refinement level when you forge the same slot
one tier up, so an upgrade never arrives feeling like a demotion.</dd>
<dt>Can gear be sold or traded?</dt>
<dd><em>I say neither, in v1.</em> The moment gear has a price, the hunting curve becomes
an income curve and every number on this page has to be re-derived against a market.</dd>
</dl></div>
</section>

<section>
<h2><em>六</em> &nbsp; What I recommend</h2>
<div class="rec">
<h3>All of it, as one system</h3>
<p>It already is one system: the same palette, the same lacquer ground, the same rule that
a thing is <b>a shape plus a rank</b>. A realm is a contour figure plus a halo count. A
beast is a mask plus a frame. An item is an object plus a tile. A piece of gear is that
same tile with three numbers behind it. Nothing needs a separate pipeline and nothing can
drift apart, because none of it is drawn.</p>
<p>The cost is stated plainly: this is a <b>graphic</b> system, not a painted one. It will
look designed rather than illustrated, and it will never produce a key visual. What it
buys is that the whole library &mdash; every realm, every beast, every drop, every slot
&mdash; exists today, is consistent by construction, and costs nothing per asset.</p>
<p>If painted art arrives later, from a pack or a commission, it replaces the marks one
for one. The tiles, the frames and the palette stay; only what sits inside them changes.</p>
</div>
<p class="note">Honest about the weak points: the beetle and the crane are the two softest
masks in the set, the moth reads as a face more than an insect, and the hydra&rsquo;s
three heads are a compromise for nine. On the forge side, <code>K = 5</code> is still
model-derived rather than play-derived, and every number in the cost table above is built
on an assumed three units of material per hunt &mdash; that assumption is the first thing
a real simulator should check.</p>
</section>'''

    for token, value in (("CULT", cultivators()),
                         ("BEASTS", creatures(BB.ORDER, "seal")),
                         ("HUMAN", creatures(BB.HUMANOID + ["tiger", "qilin"], "medal")),
                         ("LADDER", ladder()),
                         ("GROUPS", groups()),
                         ("SLOTS", slots()),
                         ("SLOTTABLE", slottable()),
                         ("ORIGINS", origins()),
                         ("TIERLINE", tierline("vessel")),
                         ("COSTTABLE", costtable()),
                         ("HAULTABLE", haultable()),
                         ("MARKS", marks())):
        body = body.replace("{{%s}}" % token, value)
    assert "{{" not in body, "unfilled token"

    open("system.html", "w").write(HEAD + '<div class="page">' + body + '</div>')
    import os
    print("%.0f KB" % (os.path.getsize("system.html") / 1024))
