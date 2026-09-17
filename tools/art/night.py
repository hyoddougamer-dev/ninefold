"""The night's record. Built to be read in two minutes, not studied."""
import sys
sys.path.insert(0, '.')
sys.path.insert(0, '/home/user/WuxiaMud')
import build_beasts as BB, creatures as C, gearart as G
from sim import tells as T

STANCE_COL = {"進": ("#F0906A", "Press", "step into it"),
              "守": ("#8FD9A0", "Guard", "take it on the plates"),
              "遁": ("#8FB4F0", "Withdraw", "give ground")}

# one beast that signatures each tell, so the grid shows a face not just a word
SIG_OF = {}
for b, (sig, pool) in T.BEAST_TELLS.items():
    SIG_OF.setdefault(sig, b)


def tellcards():
    out = ""
    for ch, (en, st, why) in T.TELLS.items():
        col = STANCE_COL[st][0]
        beast = SIG_OF.get(ch)
        art = BB.framed(beast, "seal", 104) if beast else ""
        out += ('<div class="tc" style="--c:%s">%s'
                '<div class="tcb"><b>%s</b><span>%s</span></div>'
                '<p>%s</p><div class="ans">%s &nbsp;%s</div></div>'
                % (col, art, ch, en, why, st, STANCE_COL[st][1]))
    return out


def stancekey():
    return "".join('<div class="sk" style="--c:%s"><b>%s</b><span>%s</span><i>%s</i></div>'
                   % (c, ch, en, why) for ch, (c, en, why) in STANCE_COL.items())


TIMELINE = [
    ("0:00", "The app opens", "Five layers are already yours — a gift. They play back one at a time, so minute one is five things happening.", "gift"),
    ("1:00", "First hunt, free", "A hare on the Ash Slopes. It shows 竭 Spent. The game answers this one FOR you.", "hunt"),
    ("1:40", "First loot", "Two materials fall into a bag that was empty.", "loot"),
    ("2:30", "Second hunt, free", "The tell is shown. Nobody answers it. You choose.", "hunt"),
    ("3:30", "Third hunt, free", "Nothing is explained at all.", "hunt"),
    ("4:00", "First forge", "You have enough for a 凡 vessel. It is yours for months.", "forge"),
    ("5:00", "Done", "Realm 1, layer 5, one piece of gear. Nine first-times.", "done"),
]


def timeline():
    return "".join('<div class="tl"><i>%s</i><div><b>%s</b><p>%s</p></div></div>'
                   % (t, h, p) for t, h, p, k in TIMELINE)


CLOCK = [("→", "Moves forward normally", "Credited in full, with no cap.",
          "A cap would punish the once-a-day player — the exact person the game is built for. Come back after a month, get a month.", "ok"),
         ("←", "Moves backward", "Nothing is credited. Nothing is taken away.",
          "A phone that crossed a timezone is not a cheat. Never pay for it, never punish it.", "warn"),
         ("⇉", "Jumps 90+ days", "Credited, and flagged.",
          "Refusing it locally breaks honest players and stops nobody. A server checks the flag later.", "flag")]


def clockrows():
    return "".join('<div class="cr %s"><i>%s</i><div><b>%s</b><em>%s</em><p>%s</p></div></div>'
                   % (k, sym, h, w, why) for sym, h, w, why, k in CLOCK)


STATE = [("The rulebook", "docs/GDD.md — 871 lines", 100, "done"),
         ("The art", "9 cultivators, 18 beasts, 18 gear, 18 materials, the aura", 100, "done"),
         ("The calculator", "sim/ — 1 706 lines, 38 numbers pinned by tests", 100, "done"),
         ("How a hunt works", "勢 Stance, 兆 nine tells, 秘境 the dive", 100, "done"),
         ("The save file", "存 — format, clock rules, offline proven exact", 100, "done"),
         ("The first 5 minutes", "初 — the gift, the free hunts", 100, "done"),
         ("The game itself", "Godot. Nothing exists yet.", 0, "todo")]


def staterows():
    return "".join('<div class="sr %s"><b>%s</b><span>%s</span>'
                   '<div class="pb"><i style="width:%d%%"></i></div></div>'
                   % (k, h, d, p) for h, d, p, k in STATE)


HEAD = '''<title>Ninefold — the night's work</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;500;700&family=Noto+Sans+SC:wght@300;400;500&display=swap">
<style>
:root{
  --ground:#05100D; --panel:#0A1A16; --panel2:#0C211B; --jade:#4ECFA3; --gold:#D4A843;
  --verm:#C8442C; --text:#E6EEE8; --dim:#8DA49A; --faint:#556A62;
  --hair:rgba(212,168,67,.20); --hair-soft:rgba(212,168,67,.11);
  --serif:"Noto Serif SC",Songti SC,Georgia,serif;
  --sans:"Noto Sans SC",-apple-system,Segoe UI,Roboto,sans-serif;
}
body{background:var(--ground);color:var(--text);font-family:var(--sans);margin:0;
  -webkit-font-smoothing:antialiased}
.page{max-width:900px;margin:0 auto;padding:44px 20px 80px}
.top{border-bottom:1px solid var(--hair-soft);padding-bottom:26px}
h1{font-family:var(--serif);font-size:34px;font-weight:300;letter-spacing:.12em;margin:0}
.date{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:var(--faint);
  margin-bottom:14px}
.lede{font-size:16px;line-height:1.75;color:var(--dim);max-width:54ch;margin:16px 0 0}
.lede b{color:var(--text);font-weight:500}

h2{font-family:var(--serif);font-size:23px;font-weight:500;letter-spacing:.1em;
  margin:58px 0 8px}
h2 em{font-style:normal;color:var(--gold);margin-right:12px}
.sub{font-size:15px;line-height:1.7;color:var(--dim);max-width:56ch;margin:10px 0 0}
.sub b{color:var(--text);font-weight:500}

/* 兆 tells */
.key{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:22px}
.sk{background:var(--panel);border:1px solid var(--hair-soft);border-left:3px solid var(--c);
  border-radius:3px;padding:13px 15px}
.sk b{display:block;font-family:var(--serif);font-size:26px;color:var(--c)}
.sk span{display:block;font-size:13px;color:var(--text);margin-top:3px}
.sk i{display:block;font-style:normal;font-size:12px;color:var(--faint);margin-top:4px}
.tells{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}
.tc{background:var(--panel);border:1px solid var(--hair-soft);border-radius:4px;
  padding:12px;display:flex;flex-direction:column;align-items:center;text-align:center}
.tc svg{width:88px;height:auto;opacity:.9}
.tcb{margin-top:8px}
.tcb b{font-family:var(--serif);font-size:24px;color:var(--c)}
.tcb span{display:block;font-size:10px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--faint);margin-top:2px}
.tc p{font-size:12px;line-height:1.55;color:var(--dim);margin:9px 0 10px;flex:1}
.ans{font-family:var(--serif);font-size:14px;color:var(--c);border-top:1px solid var(--hair-soft);
  padding-top:9px;width:100%;letter-spacing:.06em}
@media (max-width:700px){.key,.tells{grid-template-columns:1fr 1fr}}
@media (max-width:460px){.key,.tells{grid-template-columns:1fr}}

/* 初 timeline */
.tls{margin-top:22px;border-left:1px solid var(--hair-soft);padding-left:0}
.tl{display:flex;gap:16px;padding:0 0 22px 22px;position:relative}
.tl::before{content:"";position:absolute;left:-4.5px;top:6px;width:8px;height:8px;
  border-radius:50%;background:var(--gold)}
.tl i{font-style:normal;font-family:var(--serif);font-size:15px;color:var(--gold);
  min-width:44px;font-variant-numeric:tabular-nums}
.tl b{display:block;font-size:15px;color:var(--text);font-weight:500}
.tl p{margin:4px 0 0;font-size:13.5px;line-height:1.6;color:var(--dim);max-width:52ch}

/* 存 clock */
.clk{display:flex;flex-direction:column;gap:10px;margin-top:22px}
.cr{display:flex;gap:16px;background:var(--panel);border:1px solid var(--hair-soft);
  border-left:3px solid var(--faint);border-radius:3px;padding:15px 17px}
.cr.ok{border-left-color:var(--jade)} .cr.warn{border-left-color:var(--gold)}
.cr.flag{border-left-color:var(--verm)}
.cr i{font-style:normal;font-size:26px;color:var(--faint);min-width:34px;line-height:1}
.cr.ok i{color:var(--jade)} .cr.warn i{color:var(--gold)} .cr.flag i{color:var(--verm)}
.cr b{display:block;font-size:15px;color:var(--text);font-weight:500}
.cr em{display:block;font-style:normal;font-size:14px;color:var(--jade);margin-top:3px}
.cr.warn em{color:var(--gold)} .cr.flag em{color:var(--verm)}
.cr p{margin:7px 0 0;font-size:13px;line-height:1.6;color:var(--dim);max-width:52ch}

/* state */
.state{display:flex;flex-direction:column;gap:9px;margin-top:22px}
.sr{background:var(--panel);border:1px solid var(--hair-soft);border-radius:3px;
  padding:13px 16px}
.sr b{font-size:15px;color:var(--text);font-weight:500}
.sr span{display:block;font-size:12.5px;color:var(--faint);margin-top:2px}
.pb{height:4px;border-radius:2px;background:rgba(255,255,255,.06);margin-top:10px;
  overflow:hidden}
.pb i{display:block;height:100%;border-radius:2px;background:var(--jade)}
.sr.todo{border-color:rgba(200,68,44,.3)}
.sr.todo .pb i{background:var(--verm)}
.sr.todo b::after{content:" — not started";color:var(--verm);font-size:12px;
  letter-spacing:.06em}

.next{background:var(--panel2);border:1px solid rgba(78,207,163,.3);border-radius:4px;
  padding:24px;margin-top:34px}
.next b{display:block;font-family:var(--sans);font-size:11px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--jade);margin-bottom:12px}
.next p{font-size:15px;line-height:1.75;color:var(--dim);margin:0 0 12px;max-width:56ch}
.next p:last-child{margin-bottom:0}
.next strong{color:var(--text);font-weight:500}
.fix{border-left:2px solid var(--gold);padding:4px 0 4px 18px;margin-top:20px}
.fix p{font-size:13.5px;line-height:1.7;color:var(--faint);margin:0 0 10px;max-width:56ch}
.fix p:last-child{margin-bottom:0}
.fix b{color:var(--gold);font-weight:500}
</style>
'''

BODY = '''<header class="top">
<div class="date">Ninefold &middot; the night&rsquo;s work</div>
<h1>Three things, and one thing found</h1>
<p class="lede">You asked for the save format. That got done, and two more with it. The
useful part of the night was not any of the three &mdash; it was that building them
<b>exposed a problem nobody could see before</b>: a brand new player was going to wait
<b>two hours and six minutes</b> for the first thing that ever happened to them.</p>
</header>

<h2><em>一</em>兆 &nbsp; The nine tells</h2>
<p class="sub">A beast shows you something, then you pick a stance. The lazy version is
eighteen beasts with one right answer each &mdash; and that is <b>eighteen things to
memorise, correct forever after day one</b>. Dead as a decision.</p>
<p class="sub">So the tell belongs to the <b>vocabulary</b>, not the beast. Nine tells.
Learn nine things once and you can read a beast you have never met.</p>
<div class="key">{{KEY}}</div>
<div class="tells">{{TELLS}}</div>
<div class="fix"><p><b>Caught and fixed.</b> On the first pass the beasts you meet most
often signalled &ldquo;Withdraw&rdquo; &mdash; 8 of 18. A player would have learned
&ldquo;Withdraw is usually right&rdquo; and stopped reading, which is the exact habit the
whole idea exists to prevent. Rebalanced to <b>six per stance</b>, and the test suite now
fails if it ever drifts again.</p></div>

<h2><em>二</em>初 &nbsp; The first five minutes</h2>
<p class="sub">This is the problem the night found. Realm 1 costs 0.78 days of gathering,
so <b>one layer is 2.1 hours</b>. A new player opens the app and waits two hours. It was
invisible until the cost curve existed to be divided.</p>
<div class="tls">{{TIMELINE}}</div>
<p class="sub"><b>Nine first-times in five minutes.</b> The opening gift was measured
against the 70-day curve and moves it by nothing at all.</p>

<h2><em>三</em>存 &nbsp; The save file</h2>
<p class="sub">The good news is structural: <b>there is no &ldquo;offline mode&rdquo;.</b>
There is one operation &mdash; <em>advance by N seconds</em> &mdash; so closing the app for
fourteen hours is the same code as leaving it open for fourteen hours. They cannot drift
apart because they are not two paths.</p>
<p class="sub">That was written down as settled a long time ago and had never been run.
It has now been run: <b>sixty days in one step and in two thousand steps agree to within
one millionth of a qi.</b></p>
<div class="clk">{{CLOCK}}</div>
<div class="fix"><p><b>Said plainly, because the alternative is worse.</b> None of this
stops a determined cheat. Without a server there is no clock anyone can trust, and
security that <em>looks</em> like it works is the most dangerous kind. What the format
does is keep enough history for a server to check later, and stay shaped so adding one
needs no rewrite.</p></div>

<h2><em>四</em>Where the project actually is</h2>
<div class="state">{{STATE}}</div>

<div class="next"><b>What happens next</b>
<p><strong>The design is finished enough.</strong> Everything that is left is either a
detail that is cheaper to decide with the game running, or the game itself.</p>
<p>The next piece of work is the <strong>first screen in Godot</strong>: the qi ring
filling in real time, the app closing, and the app reopening with the right number on it.
Small, and it is the first time you will hold this on a phone.</p>
<p>Two things are still open and both want the game in front of them first: what a
<strong>守關 gate floor</strong> actually is inside a dive, and whether failing the
<strong>渡劫 tribulation</strong> should cost anything.</p>
</div>'''

if __name__ == "__main__":
    import os
    html = (HEAD + '<div class="page">' + BODY
            .replace("{{KEY}}", stancekey())
            .replace("{{TELLS}}", tellcards())
            .replace("{{TIMELINE}}", timeline())
            .replace("{{CLOCK}}", clockrows())
            .replace("{{STATE}}", staterows()) + '</div>')
    open("night.html", "w").write(html)
    print("%.0f KB" % (os.path.getsize("night.html") / 1024))
