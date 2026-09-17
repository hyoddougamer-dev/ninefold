"""狩 Three ways a hunt can resolve, as three phone screens.

The question the bible never answered: what happens when the player taps HUNT? Everything
else is specified — what a hunt costs, what it returns, how the haul decays — but not the
moment itself. These are three answers, and they differ on one axis that the simulator
says decides the whole game: how much 悟 insight a kill pays, and whether that payment
decays with the day's hunt count.
"""
import sys
sys.path.insert(0, '.')
import build_beasts as BB, creatures as C, gearart as G, items as I

JADE, GOLD, VERM = "#4ECFA3", "#D4A843", "#C8442C"


def chip(beast, slot=None, n=None):
    if slot:
        return ('<div class="chip">%s<b>%s</b></div>'
                % (G.gear(slot, beast, 2, 0, 44), C.NAMES[beast][1]))
    return ('<div class="chip">%s<b>&times;%s</b></div>' % (G.material(beast, 1, 44), n))


HEAD = '''<title>Ninefold — how a hunt resolves</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;500;700&family=Noto+Sans+SC:wght@300;400;500&display=swap">
<style>
:root{
  --ground:#05100D; --panel:#0A1A16; --panel2:#0C211B; --jade:#4ECFA3; --gold:#D4A843;
  --verm:#C8442C; --text:#E6EEE8; --dim:#7C9389; --faint:#4A5D56;
  --hair:rgba(212,168,67,.20); --hair-soft:rgba(212,168,67,.11);
  --serif:"Noto Serif SC",Songti SC,Georgia,serif;
  --sans:"Noto Sans SC",-apple-system,Segoe UI,Roboto,sans-serif;
}
body{background:var(--ground);color:var(--text);font-family:var(--sans);margin:0;
  -webkit-font-smoothing:antialiased}
.page{max-width:1060px;margin:0 auto;padding:40px 20px 72px}
h1{font-family:var(--serif);font-size:30px;font-weight:300;letter-spacing:.1em;margin:0}
.lede{font-size:14.5px;line-height:1.8;color:var(--dim);max-width:62ch;margin:14px 0 0}
h2{font-family:var(--serif);font-size:19px;font-weight:500;letter-spacing:.1em;
  margin:52px 0 6px;color:var(--text)}
h2 em{font-style:normal;color:var(--gold);margin-right:10px}
.sub{font-size:13.5px;line-height:1.75;color:var(--dim);max-width:64ch;margin:8px 0 0}
.note{font-size:12.5px;line-height:1.7;color:var(--faint);max-width:64ch;margin:14px 0 0}
b{font-weight:500;color:var(--text)}

/* ── the three phones ─────────────────────────────────────────────────── */
.phones{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:30px}
@media (max-width:900px){.phones{grid-template-columns:1fr;max-width:340px;margin-inline:auto}}
.opt{display:flex;flex-direction:column}
.opthead{margin-bottom:12px}
.opthead .tag{font-family:var(--sans);font-size:10px;letter-spacing:.2em;
  text-transform:uppercase;color:var(--faint)}
.opthead h3{font-family:var(--serif);font-size:20px;font-weight:500;letter-spacing:.08em;
  margin:4px 0 0}
.opthead h3 em{font-style:normal;color:var(--gold);margin-right:8px}
.opthead p{font-size:12.5px;line-height:1.6;color:var(--dim);margin:7px 0 0}

.phone{background:#040C09;border:1px solid var(--hair-soft);border-radius:18px;
  padding:14px 13px 16px;display:flex;flex-direction:column;gap:11px;min-height:560px}
.bar{display:flex;justify-content:space-between;align-items:baseline;
  font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--faint);
  padding-bottom:9px;border-bottom:1px solid var(--hair-soft)}
.bar b{font-family:var(--serif);font-size:14px;letter-spacing:.06em;color:var(--gold);
  text-transform:none}
.beast{display:flex;flex-direction:column;align-items:center;gap:7px}
.beast svg{width:132px;height:auto}
.bname{font-family:var(--serif);font-size:16px;color:var(--text);letter-spacing:.05em}
.bsub{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--faint)}

.tele{background:rgba(200,68,44,.10);border:1px solid rgba(200,68,44,.30);border-radius:4px;
  padding:9px 11px;font-size:11.5px;line-height:1.55;color:var(--dim)}
.tele b{color:var(--verm);font-family:var(--serif);font-size:14px}

.btn{background:linear-gradient(180deg,#123529,#0C2419);border:1px solid rgba(78,207,163,.36);
  border-radius:4px;padding:14px;text-align:center;font-family:var(--serif);font-size:18px;
  letter-spacing:.14em;color:var(--jade)}
.btn small{display:block;font-family:var(--sans);font-size:10px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--faint);margin-top:4px}
.btn.ghost{background:var(--panel);border-color:var(--hair-soft);color:var(--dim)}
.stances{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.st{background:var(--panel);border:1px solid var(--hair-soft);border-radius:4px;
  padding:11px 5px;text-align:center}
.st.on{border-color:rgba(78,207,163,.5);background:#0E2820}
.st b{display:block;font-family:var(--serif);font-size:19px;color:var(--text)}
.st.on b{color:var(--jade)}
.st span{display:block;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--faint);margin-top:3px}

.ex{display:flex;flex-direction:column;gap:6px}
.exr{display:flex;align-items:center;gap:9px;background:var(--panel);
  border-left:2px solid var(--hair-soft);border-radius:0 3px 3px 0;padding:8px 10px;
  font-size:11.5px;color:var(--dim)}
.exr i{font-style:normal;font-family:var(--serif);font-size:14px;color:var(--gold);
  width:14px;flex:none}
.exr span{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--jade);font-size:12px}
.exr.bad{border-left-color:rgba(200,68,44,.5)} .exr.bad span{color:var(--verm)}
.exr.kill{border-left-color:var(--jade);background:#0E2820;color:var(--text)}

.res{background:var(--panel2);border:1px solid var(--hair-soft);border-radius:4px;
  padding:12px;margin-top:auto}
.res h4{font-family:var(--serif);font-size:13px;font-weight:500;letter-spacing:.1em;
  margin:0 0 10px;color:var(--jade)}
.chips{display:flex;gap:7px;flex-wrap:wrap}
.chip{display:flex;flex-direction:column;align-items:center;gap:3px;
  background:#08150F;border:1px solid var(--hair-soft);border-radius:3px;padding:5px 6px}
.chip svg{width:34px;height:auto;display:block}
.chip b{font-size:9px;letter-spacing:.06em;color:var(--dim);font-weight:400;
  max-width:46px;text-align:center;line-height:1.2}
.gain{display:flex;justify-content:space-between;font-size:11.5px;margin-top:10px;
  padding-top:9px;border-top:1px solid var(--hair-soft);color:var(--faint)}
.gain b{color:var(--gold);font-variant-numeric:tabular-nums}

.verdict{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:16px}
.vd{background:var(--panel);border:1px solid var(--hair-soft);border-radius:3px;padding:14px}
.vd.pick{border-color:rgba(78,207,163,.34);background:var(--panel2)}
.vd h4{font-family:var(--sans);font-size:10px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--faint);margin:0 0 9px}
.vd.pick h4{color:var(--jade)}
.vd dl{margin:0;font-size:12px;line-height:1.6}
.vd dt{color:var(--faint);margin-top:8px}
.vd dt:first-child{margin-top:0}
.vd dd{margin:1px 0 0;color:var(--text)}
.vd dd.big{font-family:var(--serif);font-size:20px;color:var(--jade)}
@media (max-width:900px){.verdict{grid-template-columns:1fr;max-width:340px;margin-inline:auto}}

table.t{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}
table.t th{text-align:left;font-family:var(--sans);font-size:10.5px;font-weight:500;
  letter-spacing:.14em;text-transform:uppercase;color:var(--faint);
  padding:0 12px 9px 0;border-bottom:1px solid var(--hair)}
table.t td{padding:10px 12px 10px 0;border-bottom:1px solid var(--hair-soft);color:var(--dim)}
table.t tr:last-child td{border-bottom:none}
table.t td.n{font-variant-numeric:tabular-nums;color:var(--jade);text-align:right;
  white-space:nowrap}
table.t td.b{color:var(--text)}
th.n{text-align:right}
.warn{background:rgba(200,68,44,.07);border-left:2px solid var(--verm);padding:16px 20px;
  border-radius:0 3px 3px 0;margin-top:26px}
.warn b{display:block;font-family:var(--sans);font-size:10.5px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--verm);margin-bottom:8px}
.warn p{font-size:13px;line-height:1.75;color:var(--dim);margin:0 0 10px;max-width:64ch}
.warn p:last-child{margin-bottom:0}
</style>
'''


def phone_a():
    return '''<div class="phone">
<div class="bar"><span>獵 &nbsp; 灰坡 Ash Slopes</span><b>氣 4.2k</b></div>
<div class="beast">%s<div class="bname">灰兔 Ash Hare</div>
<div class="bsub">hunt 3 of today &middot; haul &times;0.71</div></div>
<div class="btn">狩 &nbsp; STRIKE<small>costs 30 min of your rate</small></div>
<div class="res"><h4>灰兔 slain</h4>
<div class="chips">%s%s</div>
<div class="gain"><span>悟 insight</span><b>+0.7</b></div>
<div class="gain" style="border:none;padding-top:2px"><span>氣 spent</span><b>&minus;1 260</b></div>
</div></div>''' % (BB.framed("hare", "seal", 132), chip("hare", n="2"), chip("shrike", n="1"))


def phone_b():
    return '''<div class="phone">
<div class="bar"><span>獵 &nbsp; 蘆沼 Reed Marsh</span><b>氣 4.2k</b></div>
<div class="beast">%s<div class="bname">青蛇 Jade Serpent</div>
<div class="bsub">three exchanges &middot; 4 seconds</div></div>
<div class="ex">
<div class="exr"><i>一</i>You strike first<span>+14</span></div>
<div class="exr bad"><i>二</i>It coils and bites<span>&minus;6</span></div>
<div class="exr kill"><i>三</i>術 Cloud Step &mdash; slain<span>+22</span></div>
</div>
<div class="btn ghost">術 &nbsp; USE AN ART<small>once per hunt &middot; 2 banked</small></div>
<div class="res"><h4>青蛇 slain &middot; clean</h4>
<div class="chips">%s%s</div>
<div class="gain"><span>悟 insight</span><b>+1.4</b></div>
<div class="gain" style="border:none;padding-top:2px"><span>clean kill bonus</span><b>&times;1.3</b></div>
</div></div>''' % (BB.framed("serpent", "seal", 132), chip("serpent", n="3"), chip("toad", n="1"))


def phone_c():
    return '''<div class="phone">
<div class="bar"><span>獵 &nbsp; 灰坡 Ash Slopes</span><b>氣 4.2k</b></div>
<div class="beast">%s<div class="bname">鐵甲蟲 Iron Beetle</div>
<div class="bsub">read it, then strike</div></div>
<div class="tele">It draws its plates in and <b>braces</b>.<br>
Pressing a braced beast is how you lose a hunt.</div>
<div class="stances">
<div class="st"><b>進</b><span>press</span></div>
<div class="st on"><b>守</b><span>guard</span></div>
<div class="st"><b>遁</b><span>withdraw</span></div>
</div>
<div class="btn">狩 &nbsp; STRIKE<small>守 guard &mdash; read correctly</small></div>
<div class="res"><h4>鐵甲蟲 slain &middot; read correctly</h4>
<div class="chips">%s%s</div>
<div class="gain"><span>悟 insight</span><b>+8.0</b></div>
<div class="gain" style="border:none;padding-top:2px"><span>correct read</span><b>&times;1.5</b></div>
</div></div>''' % (BB.framed("beetle", "seal", 132), chip("beetle", n="2"),
                   chip("beetle", slot="vessel"))


BODY = '''<header>
<h1>狩 &mdash; how a hunt resolves</h1>
<p class="lede">The one thing the bible never said. It specifies what a hunt costs, what it
returns and how the haul decays, but not <em>the moment itself</em>. Here are three
answers. They differ on one axis, and the simulator says that axis decides the whole
game: <b>how much 悟 insight a kill pays, and whether that payment decays</b> with the
day&rsquo;s hunt count. Insight opens 經脈 channels, and channels are permanent gathering
rate &mdash; so this is the dial that says whether an active player ends up merely
richer, or genuinely faster.</p>
</header>

<h2><em>甲</em>The three</h2>
<div class="phones">
<div class="opt"><div class="opthead"><span class="tag">Option A</span>
<h3><em>一擊</em>One Strike</h3>
<p>Tap. It resolves in one roll and the result slides up. There is no combat screen,
because there is no combat.</p></div>{{A}}</div>

<div class="opt"><div class="opthead"><span class="tag">Option B</span>
<h3><em>三合</em>Three Exchanges</h3>
<p>Tap, and watch four seconds of it. Three exchanges, one line each. You may spend one
術 art part-way through.</p></div>{{B}}</div>

<div class="opt"><div class="opthead"><span class="tag">Option C &mdash; recommended</span>
<h3><em>勢</em>Stance</h3>
<p>The beast telegraphs. You pick a stance, then strike. Read it right and the kill pays
far more.</p></div>{{C}}</div>
</div>

<h2><em>乙</em>What each one does to the game</h2>
<p class="sub">Not opinion. <code>sim/</code> ran each, 900 days, against the same cost
curve. &ldquo;Realm 9&rdquo; is when an idle-only player gets there: <b>day 70</b>.</p>
<div class="verdict">
<div class="vd"><h4>A &middot; One Strike</h4>
<dl><dt>insight per kill</dt><dd>1, and it decays with the haul</dd>
<dt>active player at 8 hunts/day</dt><dd class="big">day 71</dd>
<dt>advantage over idle</dt><dd>1% <em>slower</em> &mdash; none at all</dd>
<dt>channels opened</dt><dd>4 of 12</dd>
<dt>the cost</dt><dd>The hunt button is a slot machine. Attention buys nothing.</dd></dl></div>

<div class="vd"><h4>B &middot; Three Exchanges</h4>
<dl><dt>insight per kill</dt><dd>4 on a clean kill, partly decaying</dd>
<dt>active player at 8 hunts/day</dt><dd class="big">day 60</dd>
<dt>advantage over idle</dt><dd>14% faster</dd>
<dt>channels opened</dt><dd>6 of 12</dd>
<dt>the cost</dt><dd>Four seconds &times; twenty hunts is eighty seconds of watching. It
needs a skip, and a skip makes it Option A.</dd></dl></div>

<div class="vd pick"><h4>C &middot; Stance &mdash; recommended</h4>
<dl><dt>insight per kill</dt><dd>8 read correctly, 3 read wrong, no decay</dd>
<dt>active player at 8 hunts/day</dt><dd class="big">day 52</dd>
<dt>advantage over idle</dt><dd>26% faster</dd>
<dt>channels opened</dt><dd>9 of 12</dd>
<dt>the cost</dt><dd>The player has eighteen beasts to learn. That is content for some
people and homework for others.</dd></dl></div>
</div>

<h2><em>丙</em>The vertical progression you asked for, measured</h2>
<p class="sub">Option C, insight 8 per kill, no decay. This is the loop: kill &rarr; 悟
insight &rarr; 經脈 channel &rarr; <b>permanent gathering rate</b> &rarr; realms arrive
faster. The active player does not merely hold more things than the idle one. They
<em>gather faster, forever</em>.</p>
<table class="t">
<tr><th>how you play</th><th class="n">realm 9 on day</th><th class="n">vs idle</th>
<th class="n">channels</th><th class="n">gathering</th><th>what it feels like</th></tr>
<tr><td class="b">never hunts</td><td class="n">70</td><td class="n">&mdash;</td>
<td class="n">0</td><td class="n">&times;1.00</td><td>the promise in §3, intact</td></tr>
<tr><td class="b">2 hunts a day</td><td class="n">56</td><td class="n">&minus;20%</td>
<td class="n">6</td><td class="n">&times;1.59</td><td>opens the app at lunch</td></tr>
<tr><td class="b">8 hunts a day</td><td class="n">52</td><td class="n">&minus;26%</td>
<td class="n">9</td><td class="n">&times;2.00</td><td>the committed player</td></tr>
<tr><td class="b">16 hunts a day</td><td class="n">57</td><td class="n">&minus;19%</td>
<td class="n">10</td><td class="n">&times;2.16</td><td>past the sweet spot &mdash; see below</td></tr>
</table>

<div class="warn"><b>Two things I have to say straight</b>
<p><b>1. Hunting has a sweet spot, and it is around eight a day.</b> Look at the last row:
sixteen hunts a day reaches realm 9 <em>later</em> than eight, despite opening one more
channel, because the qi a hunt costs eventually outruns the insight it pays. That is §4
working exactly as written &mdash; <em>&ldquo;you are going backwards, and you chose
to&rdquo;</em> &mdash; but it is not &ldquo;more play always wins&rdquo;. If you want the
curve to reward the fiftieth hunt as much as the eighth, the lever is the hunt&rsquo;s qi
price, not the insight, and I would want to model it before changing it.</p>
<p><b>2. This trades against §3&rsquo;s promise, a little.</b> The idle player still
reaches realm 9 in seventy days and is never blocked. But they now arrive
<em>twenty-six percent behind</em> someone who plays. That is what you asked for and I
think it is right &mdash; only it is a real change to a line the document calls
load-bearing, so it should be a decision, not a side effect.</p>
</div>'''

if __name__ == "__main__":
    import os
    open("hunt.html", "w").write(
        HEAD + '<div class="page">'
        + BODY.replace("{{A}}", phone_a()).replace("{{B}}", phone_b()).replace("{{C}}", phone_c())
        + '</div>')
    print("%.0f KB" % (os.path.getsize("hunt.html") / 1024))
