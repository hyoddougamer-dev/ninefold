"""Compose the complete art proposal: cultivators, creatures, items, in one page."""
import sys
sys.path.insert(0, '.')
import techniques as T, creatures as C, items as I, build_beasts as BB, forge as F
import gearart as G, motifs as MO

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
    """All eighteen. Grouped by slot so the mount reads as the constant and the motif as
    the variable — which is the claim the whole scheme rests on."""
    out = ""
    for k, ch, en, gch, gen, unit, top in F.SLOTS:
        out += ('<div class="grp"><h3><em>%s</em>%s<i>%s &middot; %s</i></h3>'
                '<div class="grid g3">%s</div></div>'
                % (ch, en, gch + " " + gen, WHY[k],
                   "".join('<figure>%s<b>%s</b><span>%s &middot; %s</span></figure>'
                           % (G.gear(k, b, 2, 0, 200), C.NAMES[b][1], g,
                              G.PHASE_COL and p + " " + F.PHASE_NAME[p][0])
                           for b, g, p in F.ORIGIN[k])))
    return out


def ladder():
    return "".join(
        '<div class="tier"><i style="background:%s"></i><b>%s</b><span>%s</span></div>'
        % (light, ch, en) for ch, en, deep, light in I.TIERS)


def auraladder():
    return "".join('<figure>%s<b>+%d</b><span>band %d</span></figure>'
                   % (G.gear("vessel", "beetle", min(4, r // 10), r, 200), r, G.band(r))
                   for r in (0, 5, 10, 15, 20, 25, 30, 35, 40, 45))


def materials18():
    return "".join('<figure>%s<b>%s</b><span>%s</span></figure>'
                   % (G.material(b, t, 160), C.NAMES[b][1], g)
                   for k, ch, en, gch, gen, unit, top in F.SLOTS
                   for t, (b, g, p) in enumerate(F.ORIGIN[k]))


def card(key, beast, tier, r, marks, awaken, note=""):
    slot = next(x for x in F.SLOTS if x[0] == key)
    ch, en, unit, top = slot[1], slot[2], slot[5], slot[6]
    bch, ground, phase = next(o for o in F.ORIGIN[key] if o[0] == beast)
    pen, pcol = F.PHASE_NAME[phase]
    tch, ten = I.TIERS[tier][0], I.TIERS[tier][1]
    nslots = F.MARK_SLOTS[tier] + (1 if awaken >= 3 else 0)

    pct = 100.0 * r / F.MAXR
    ticks = "".join('<i style="left:%.2f%%"></i>' % (100.0 * F.CAP[t] / F.MAXR)
                    for t in range(4))
    val = ("+%.0f%% %s" % (F.slot_value(key, r), unit)) if top else \
          next(v for c, v in reversed(F.BOOTS) if r >= c) if r >= 9 else "no bonus yet"
    if key == "vessel":
        val = "K = %.2f" % (5 + F.slot_value(key, r))

    dots = "".join('<u class="%s"></u>' % ("on" if i < awaken else "") for i in range(3))
    diam = "".join('<s class="%s"></s>' % ("on" if i < marks else "")
                   for i in range(nslots)) or '<em class="none">no 紋 slot until 玄</em>'
    trait = ""
    if awaken:
        t = F.TRAIT[beast]
        trait = '<p class="trait"><b>%s %s</b>%s</p>' % (t[0], t[1], t[2])

    return ('<div class="card">%s'
            '<div class="cbody">'
            '<h4>%s <span>%s</span></h4>'
            '<p class="src">%s %s &middot; %s &middot; <i style="color:%s">%s %s</i></p>'
            '<div class="bar"><span style="width:%.2f%%"></span>%s</div>'
            '<p class="barlab"><b>鍊 %d / %d</b><em>%s %s &middot; &times;%.3f</em></p>'
            '<p class="val">%s</p>'
            '<p class="axes"><span>紋 %s</span><span>覺 %s</span></p>'
            '%s%s</div></div>'
            % (G.gear(key, beast, tier, r, 200), ch, en,
               C.NAMES[beast][0], C.NAMES[beast][1], ground, pcol, phase, pen,
               pct, ticks, r, F.CAP[tier], tch, ten, F.mult(r), val,
               diam, dots, trait,
               ('<p class="cnote">%s</p>' % note) if note else ""))


def lifecycle():
    """The same vessel, four times, across six months. Nothing is replaced."""
    return "".join(card(*a) for a in (
        ("vessel", "beetle", 0, 0, 0, 0,
         "Hour three. Forged from the first iron beetle you kill on the Ash Slopes. "
         "It is already worth K&nbsp;7.5 &mdash; the first piece in a slot is always the "
         "biggest single jump in the game."),
        ("vessel", "beetle", 1, 18, 0, 1,
         "Week two. 38 hunts of beetle carapace in, ascended once, and worn long enough "
         "(100 kills) to wake 堅 Endure. Still the same object."),
        ("vessel", "beetle", 3, 36, 2, 2,
         "Month three. Earth tier, which needed 灰王 the Grey King&rsquo;s pattern. Two "
         "銘 inscriptions slotted, and they can be pulled out and moved to another piece."),
        ("vessel", "beetle", 4, 45, 3, 3,
         "Month seven. 鍊45 is the end of the bar, and the third 紋 slot only exists "
         "because 覺3 opened it at 2&thinsp;000 kills. Same beetle."),
    ))


def slottable():
    def fresh(k, top, unit):
        if k == "vessel": return "K = %.2f" % (5 + F.slot_value(k, 0))
        if k == "boots":  return "&mdash;"
        if k == "pendant": return "+%.1fpp step-up" % F.slot_value(k, 0)
        return "+%.1f%% %s" % (F.slot_value(k, 0), unit)

    def maxed(k, top, unit):
        if k == "vessel": return "K = 11.00"
        if k == "boots":  return F.BOOTS[-1][1]
        if k == "pendant": return "+%.0fpp step-up" % top
        return "+%.0f%% %s" % (top, unit)

    return "".join(
        '<tr><td class="cjk">%s</td><td>%s</td><td class="cjk sm">%s</td>'
        '<td class="num">%s</td><td class="num">%s</td><td class="why">%s</td></tr>'
        % (ch, en, gch, fresh(k, top, unit), maxed(k, top, unit), WHY[k])
        for k, ch, en, gch, gen, unit, top in F.SLOTS)


WHY = {
    "crown": "feeds 經脈 channels and 術 arts — the idle player's slot",
    "robe": "the ONLY slot that touches the 靜 Stillness road",
    "pendant": "turns hunting time into material TIER instead of material count",
    "boots": "discrete: +1 slot at 鍊9, +2 at 鍊27, a free reroll at 鍊45",
    "ring": "the flat multiplier on everything a hunt returns",
    "vessel": "raises K in the decay curve — worth nothing on hunt 1, everything on hunt 40",
}


def axes():
    rows = (("鍊", "refine", "0 → 45", "+2% compounding, one continuous bar",
             "材 raw materials"),
            ("階", "ascend", "凡 → 天", "adds no power — it raises the 鍊 ceiling",
             "精 refined + 圖 warden pattern"),
            ("紋", "inscribe", "0 → 3", "removable 銘 marks, moveable between pieces",
             "銘 inscriptions"),
            ("覺", "awaken", "0 → 3", "the trait of the BEAST that furnished it",
             "wearing it: 100 / 500 / 2 000 kills, or a 魂 soul"))
    return "".join('<tr><td class="cjk">%s</td><td>%s</td><td class="num">%s</td>'
                   '<td class="why">%s</td><td class="sm">%s</td></tr>' % r for r in rows)


def refinetable():
    rows = ""
    for t in range(5):
        c = F.CAP[t]
        rows += ('<tr><td class="cjk">%s</td><td>%s</td><td class="num">%d</td>'
                 '<td class="num">&times;%.3f</td><td class="num">%d</td>'
                 '<td class="num">%d</td><td class="num">%.0f</td>'
                 '<td class="num">%d</td></tr>'
                 % (I.TIERS[t][0], I.TIERS[t][1], c, F.mult(c), F.refine_cost(c),
                    F.refine_total(c), F.refine_total(c)/3,
                    F.ASCEND.get(t, (0,))[0]))
    return rows


def traits():
    out = ""
    for key, ch, en, gch, gen, unit, top in F.SLOTS:
        for b, g, ph in F.ORIGIN[key]:
            tch, ten, txt = F.TRAIT[b]
            out += ('<tr><td class="cjk sm">%s</td><td class="sm">%s</td>'
                    '<td class="cjk">%s</td><td>%s</td>'
                    '<td class="ph" style="color:%s">%s</td><td class="why">%s</td></tr>'
                    % (ch, C.NAMES[b][1], tch, ten, F.PHASE_NAME[ph][1], ph, txt))
    return out


def groundsets():
    return "".join('<tr><td class="cjk">%s</td><td>%s</td><td class="cjk">%s</td>'
                   '<td>%s</td><td class="why">%s</td></tr>' % r for r in F.GROUND_SET)


def phasesets():
    return "".join('<tr><td class="cjk" style="color:%s !important">%s</td><td>%s</td>'
                   '<td class="cjk">%s</td><td>%s</td><td class="why">%s</td>'
                   '<td class="sm">%s</td></tr>'
                   % (F.PHASE_NAME[ch][1], ch, en, gch, gen, eff, note)
                   for ch, en, gch, gen, eff, note in F.PHASE_SET)


def pathsets():
    return "".join('<tr><td class="cjk">%s</td><td>%s</td><td class="cjk">%s</td>'
                   '<td>%s</td><td class="why">%s</td></tr>' % r for r in F.PATH_SET)


def newitems():
    return "".join('<tr><td class="cjk">%s</td><td>%s</td><td class="sm">%s</td>'
                   '<td class="why">%s</td></tr>' % r for r in F.NEW_ITEMS)


def hault2():
    b4 = F.haul_sum(4, 5)
    rows = ""
    for lbl, K in (("bare, no vessel", 5.0),
                   ("凡 vessel, just forged 鍊0", 5 + F.slot_value("vessel", 0)),
                   ("玄 vessel 鍊27", 5 + F.slot_value("vessel", 27)),
                   ("天 vessel 鍊45", 5 + F.slot_value("vessel", 45)),
                   ("天 鍊45 + 劍套 Sword set", (5 + F.slot_value("vessel", 45)) * 1.5)):
        cells = "".join('<td class="num">&times;%.2f</td>' % (F.haul_sum(n, K)/b4)
                        for n in (4, 8, 20, 50))
        rows += ('<tr><td>%s</td><td class="sm">K = %.1f</td>%s</tr>' % (lbl, K, cells))
    return rows


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
.g3{grid-template-columns:repeat(3,1fr)}
.g10{grid-template-columns:repeat(5,1fr)}
@media (max-width:820px){.g6{grid-template-columns:repeat(4,1fr)}
  .g5{grid-template-columns:repeat(3,1fr)}}
@media (max-width:520px){.g9,.g4,.g10{grid-template-columns:repeat(2,1fr)}
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

/* ── 器 the piece card ──────────────────────────────────────────────────── */
.cards{display:grid;gap:12px;grid-template-columns:repeat(4,1fr);margin-block:22px 0}
@media (max-width:900px){.cards{grid-template-columns:repeat(2,1fr)}}
@media (max-width:520px){.cards{grid-template-columns:1fr}}
.card{background:linear-gradient(180deg,#08150F,#050D0B);border:1px solid var(--hair-soft);
  border-radius:3px;overflow:hidden;display:flex;flex-direction:column}
.card>svg{width:100%;height:auto;display:block}
.cbody{padding:13px 13px 15px;display:flex;flex-direction:column;gap:0}
.cbody h4{margin:0;font-family:var(--serif);font-size:17px;font-weight:500;
  color:var(--text);letter-spacing:.05em}
.cbody h4 span{font-family:var(--sans);font-size:9px;font-weight:400;letter-spacing:.2em;
  text-transform:uppercase;color:var(--faint);margin-left:6px}
.src{margin:5px 0 0;font-size:11px;color:var(--faint);line-height:1.5}
.src i{font-style:normal}

.bar{position:relative;height:5px;border-radius:3px;background:rgba(255,255,255,.07);
  margin-top:12px;overflow:hidden}
.bar span{position:absolute;inset:0 auto 0 0;border-radius:3px;
  background:linear-gradient(90deg,var(--jade),var(--gold))}
.bar i{position:absolute;top:0;bottom:0;width:1px;background:var(--ground);opacity:.85}
.barlab{display:flex;justify-content:space-between;align-items:baseline;gap:8px;
  margin:6px 0 0;font-size:10px}
.barlab b{font-family:var(--serif);font-size:12px;font-weight:500;color:var(--gold);
  font-variant-numeric:tabular-nums}
.barlab em{font-style:normal;color:var(--faint);font-variant-numeric:tabular-nums}
.val{margin:10px 0 0;font-size:13px;color:var(--jade);font-variant-numeric:tabular-nums}
.axes{display:flex;gap:16px;margin:9px 0 0;font-size:10px;letter-spacing:.14em;
  color:var(--faint);align-items:center}
.axes span{display:flex;align-items:center;gap:5px;font-family:var(--serif);font-size:12px;
  letter-spacing:.06em}
.axes s{width:7px;height:7px;transform:rotate(45deg);text-decoration:none;
  border:1px solid var(--faint)}
.axes s.on{background:var(--gold);border-color:var(--gold)}
.axes u{width:6px;height:6px;border-radius:50%;border:1px solid var(--faint);
  text-decoration:none}
.axes u.on{background:var(--jade);border-color:var(--jade)}
.axes em.none{font-style:normal;font-size:10px;letter-spacing:0;color:var(--faint);
  font-family:var(--sans)}
.trait{margin:10px 0 0;padding-top:9px;border-top:1px solid var(--hair-soft);
  font-size:11.5px;line-height:1.55;color:var(--dim)}
.trait b{display:block;font-family:var(--serif);font-size:13px;font-weight:500;
  color:var(--verm);letter-spacing:.06em;margin-bottom:3px}
.cnote{margin:11px 0 0;font-size:11px;line-height:1.6;color:var(--faint)}
td.ph{font-family:var(--serif);font-size:15px;width:1%;text-align:center}
h3.step{color:var(--text);font-family:var(--serif);font-size:16px;font-weight:500;
  letter-spacing:.06em;margin-block:38px 12px}
h3.step em{font-style:normal;color:var(--gold);margin-right:10px}
.build{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  margin-block:18px 0}
.bld{background:var(--panel);border:1px solid var(--hair-soft);border-radius:3px;
  padding:14px 15px}
.bld b{display:block;font-family:var(--serif);font-size:14px;font-weight:500;
  color:var(--gold);margin-bottom:6px}
.bld p{margin:0;font-size:12px;line-height:1.6;color:var(--dim)}
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
<h2><em>五</em> &nbsp; 鍛 &nbsp; The forge &mdash; progression, per piece</h2>
<p class="sub">The idea everything else hangs from: <b>a piece is a track, not a
purchase.</b> You never throw one away. The vessel forged in hour three is the vessel worn
in month seven &mdash; raised, refined, inscribed and awakened, still carrying the name of
the beetle that furnished it. Replacing gear is the treadmill every idle game has. Growing
one object for six months is the thing this genre almost never offers.</p>

<h3 class="step"><em>一</em>The same vessel, four times, across seven months</h3>
<p class="sub">Nothing below is replaced. It is one object, four times.</p>
<div class="cards">{{LIFE}}</div>

<h3 class="step"><em>二</em>Four axes, four currencies</h3>
<p class="sub">Each axis is fed by a different thing in the bag, so every group in the
satchel finally has a job and none of them is a dead stack.</p>
<table class="t">
<tr><th></th><th>axis</th><th class="num">range</th><th>what it does</th><th>fed by</th></tr>
{{AXES}}</table>
<p class="note"><b>Read the 階 row twice.</b> Tier adds no power at all &mdash; it raises
the <em>ceiling</em>. That single change is what makes a piece a track: 鍊 is one
continuous bar from 0 to 45, the tier is just how far along it you are allowed to push,
and nothing ever resets. <em>New power is paid for in the cost table, never by taking the
power back out</em> &mdash; and an upgrade that zeroed your refinement would be exactly
that.</p>

<h3 class="step"><em>三</em>六位 &mdash; eighteen icons, not six</h3>
<p class="sub">Every piece is its own drawing. A slot is a <b>mount</b> &mdash; a band, a
collar, a cord, a cuff, a hoop, a lid &mdash; minimal and readable by silhouette alone, and
the <b>beast&rsquo;s motif is the body of the thing</b>. So the crane crown and the qilin
crown are two drawings you can tell apart at a glance, and you still know instantly that
both go on the head.</p>
<p class="note"><b>The first attempt failed and it is worth saying why.</b> I hung the
motif on a fully drawn slot object as a crest. At icon size the object filled the tile and
the motif shrank to a scratch: three pendants came out as three identical pendants. The
hierarchy had to invert. Four things now read off one tile without competing for the same
pixels &mdash; <b>tier</b> from the frame, <b>phase</b> from the colour, <b>slot</b> from
the mount, <b>origin</b> from the motif.</p>
{{SLOTS}}
<table class="t">
<tr><th></th><th>slot</th><th></th><th class="num">fresh, 鍊0</th>
<th class="num">at 鍊45</th><th>why it exists</th></tr>
{{SLOTTABLE}}</table>
<p class="note"><b>Read the 袍 Robe row twice.</b> It is the only slot in the game that
touches gathering. A fully maxed kit multiplies the 靜 Stillness road by <b>&times;1.12</b>
&mdash; under six 九層 layers &mdash; and the 動 Motion road by roughly <b>&times;2.6</b> at
twenty hunts. Gear is the sink the active road needed and it cannot quietly become
mandatory for the player who opens the app once a day. <em>The promise in section 3
survives a fully geared rival.</em></p>

<h3 class="step"><em>三之二</em>材 &mdash; and eighteen materials to match</h3>
<p class="sub">A beast&rsquo;s material carries the same motif with no mount under it, on a
low plinth so a bag of materials never reads as a bag of equipment. A tiger fang and a
serpent fang are no longer the same grey tooth with a different label.</p>
<div class="grid g6">{{MATS}}</div>

<h3 class="step"><em>三之三</em>鍊 &mdash; the enchant aura, in nine bands</h3>
<p class="sub">The bar runs 0&rarr;45 and the aura steps every five, so <b>band =
&lceil;鍊/5&rceil;</b>, nought to nine. That is the same nine as 九重 the realms and 九層
the layers, and it uses the same escalating vocabulary as the cultivator&rsquo;s realm aura
&mdash; glow, halo, motes, rays, turning ring, orbiting nodes, column, spokes, and 九雷 the
nine bolts. One visual grammar, learned once, read everywhere.</p>
<div class="grid g10">{{AURA}}</div>
<p class="note">Each band is cumulative &mdash; band 7 still carries band 3&rsquo;s halo, or
the ladder would not read as a ladder. The <b>+N</b> plate is the number a player says out
loud, so it is legible before it is pretty: heavy, top-left, on its own ground. The frame
still carries 階 tier independently, which is why <b>+20 玄</b> and <b>+20 天</b> are two
different objects at a glance.</p>

<h3 class="step"><em>四</em>鍊 The bar, and what it costs</h3>
<p class="sub">Forty-five steps, <b>+2% compounding each</b> &mdash; the same step as 九層
nine layers, so it is one rate the player learns once and then recognises everywhere. The
whole life of a piece is &times;2.438.</p>
<table class="t"><caption>raw material for 鍊, refined material for 昇 ascension</caption>
<tr><th></th><th>tier</th><th class="num">鍊 cap</th><th class="num">&times;</th>
<th class="num">step cost</th><th class="num">cumulative</th><th class="num">hunts</th>
<th class="num">昇 refined</th></tr>
{{REFINE}}</table>
<p class="note">At three units of that beast&rsquo;s material per hunt: <b>one slot to 鍊9
is nine hunts</b> &mdash; the first piece has to land on day one. All six slots to 玄 is
558 hunts, about ten weeks at eight a day. All six to 鍊45 is <b>1&#8202;786 hunts, roughly
seven months</b>. That is deliberately longer than the old design&rsquo;s four, because
now it is the <em>only</em> track: you are not also re-forging a piece per tier.</p>
<p class="note">地 and 天 ascension additionally need that ground&rsquo;s warden 圖
<b>pattern</b> &mdash; which is where the wardens nobody reached in the old build become
mandatory.</p>

<h3 class="step"><em>五</em>覺 Awakening &mdash; why two identical pieces are not identical</h3>
<p class="sub">This is the real answer to progression per item. 覺 is unlocked by
<b>wearing</b> the piece &mdash; 100 kills, then 500, then 2&#8202;000 &mdash; or bought
early with a 魂 beast soul. What it grants belongs to the <b>beast</b>, not the slot. So
two robes at the same tier and the same 鍊 do not play the same, because one is a hare and
one is a fox. 覺2 repeats the trait at half strength; 覺3 opens a third 紋 slot.</p>
<table class="t"><caption>eighteen traits, one per beast</caption>
<tr><th></th><th>slot</th><th></th><th>trait</th><th>相</th><th>what it does</th></tr>
{{TRAITS}}</table>

<h3 class="step"><em>六</em>套 Three families of set, one kit</h3>
<p class="sub">Six slots, three families of different <b>size</b>, so which sets you can
run at once is a real build decision rather than a checklist. Note the 相 phase of a beast
is <em>independent</em> of its ground &mdash; that is what makes 地套 and 相套 pull the
same six slots in different directions.</p>

<h4 class="sub" style="color:var(--gold);font-family:var(--serif);font-size:14px;
margin-block:26px 0">地套 &nbsp; Ground sets &mdash; three pieces, six of them</h4>
<table class="t">{{GSETS}}</table>

<h4 class="sub" style="color:var(--gold);font-family:var(--serif);font-size:14px;
margin-block:30px 0">相套 &nbsp; Phase sets &mdash; three pieces, five of them</h4>
<table class="t">{{PSETS}}</table>
<p class="note">木 Wood and 金 Metal are <b>exact</b>: only three beasts in the whole
bestiary carry each phase, so there is exactly one legal combination and it spans three
different grounds. 火, 土 and 水 each have four candidates, so you choose which three.
The exact sets get the sharper bonuses &mdash; they are harder to assemble and they should
pay for it.</p>

<h4 class="sub" style="color:var(--gold);font-family:var(--serif);font-size:14px;
margin-block:30px 0">道套 &nbsp; Path sets &mdash; all six, and they change a rule</h4>
<table class="t">{{XSETS}}</table>
<p class="note">A path set needs every piece stamped with the same 印 path seal, forged
from the 印 seal fragments already in the bag. Any piece can take any seal, so the path set
is reachable from any origin &mdash; it is simply expensive, late, and it eats your whole
kit. That is the trade: two small sets, or one rule change.</p>

<div class="build">
<div class="bld"><b>3 + 3</b><p>Two ground sets, or a ground and a phase. The default, and
the one a player finds by accident.</p></div>
<div class="bld"><b>3 + 3, exact</b><p>木 and 金 together &mdash; six specific beasts
across five grounds. The collector&rsquo;s build.</p></div>
<div class="bld"><b>6</b><p>One path set. Biggest single effect in the game, and it costs
you every other set.</p></div>
<div class="bld"><b>3 + free</b><p>One set and three pieces chosen purely for their 覺
traits. Often the strongest before month three.</p></div>
</div>

<h3 class="step"><em>七</em>韌 The one number worth arguing about</h3>
<p class="sub">The 器 Vessel does not multiply the haul. It raises <b>K</b> in the decay
curve <code>h(n) = 1 / (1 + (n&#8722;1)/K)</code>, so it is worth almost nothing on hunt one
and a great deal on hunt forty &mdash; the marathon slot, which is exactly the reward
uncapped hunting was missing. The 劍 Sword path set multiplies K again.</p>
<table class="t"><caption>haul vs. four bare hunts &mdash; the same reference row as section 4</caption>
<tr><th>vessel</th><th></th><th class="num">4 hunts</th><th class="num">8</th>
<th class="num">20</th><th class="num">50</th></tr>
{{HAUL}}</table>
<p class="note">Note what does <em>not</em> happen: the four-hunt player still gains, so the
vessel is never dead weight; and the fifty-hunt player reaches &times;7.4 while still
spending more than a day of qi to get there. The brake stays a curve, not a rule.</p>

<h3 class="step"><em>八</em>The four item kinds this needs</h3>
<p class="sub">Three of the four are new; the fourth, 印, is already in the bag as seal
fragments and finally has a use.</p>
<table class="t">{{NEWITEMS}}</table>

<h3 class="step"><em>九</em>初 What this generates, counted honestly</h3>
<p class="sub">Finding 2 was that novelty collapses from 57.6 first-time events in the
opening hour to roughly one a week.</p>
<table class="t">
<tr><td>圖 patterns, one per beast</td><td class="num">18</td></tr>
<tr><td>昇 ascensions, 6 slots &times; 4</td><td class="num">24</td></tr>
<tr><td>覺 awakenings, one trait per beast</td><td class="num">18</td></tr>
<tr><td>銘 inscriptions, first found</td><td class="num">8</td></tr>
<tr><td>套 sets first completed &mdash; 6 ground, 5 phase, 3 path</td><td class="num">14</td></tr>
<tr><td><b>total</b></td><td class="num"><b>82</b></td></tr>
</table>
<p class="note"><b>A correction to the last version.</b> I claimed 116 there by counting 54
refinement steps as novelty. They are not &mdash; a refinement step is progress the player
already knows is coming. Counting only things the player has never seen before, the honest
figure is <b>82</b>, and the 270 refinement steps sit underneath them as the reason to keep
hunting between the 82.</p>

<div class="ask"><b>Four calls, which are yours to make</b>
<dl>
<dt>Can 鍊 refinement fail?</dt>
<dd><em>I say no.</em> The xianxia standard is that refining can shatter your sword, and
our own stated rule forbids taking power back out &mdash; doubly so now that 鍊 is the
piece&rsquo;s whole life. The middle option, if you want the tension: a failure wastes the
materials and never touches the piece.</dd>
<dt>Are 銘 inscriptions removable?</dt>
<dd><em>I say yes, freely.</em> A mark you can pull out and move is a reason to keep
hunting for a better one; a mark welded in place is a reason to fear equipping anything.</dd>
<dt>Can 覺 be bought outright?</dt>
<dd><em>I say only with 魂 beast souls, which only wardens drop.</em> If awakening is
purely time-gated it punishes new players; if it is purely purchasable, wearing the piece
stops meaning anything.</dd>
<dt>Can gear be sold or traded?</dt>
<dd><em>I say neither, in v1.</em> The moment gear has a price, the hunting curve becomes
an income curve and every number on this page has to be re-derived against a market
&mdash; and a piece you grew for seven months should not have a price.</dd>
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
                         ("LIFE", lifecycle()),
                         ("AXES", axes()),
                         ("SLOTS", slots()),
                         ("MATS", materials18()),
                         ("AURA", auraladder()),
                         ("SLOTTABLE", slottable()),
                         ("REFINE", refinetable()),
                         ("TRAITS", traits()),
                         ("GSETS", groundsets()),
                         ("PSETS", phasesets()),
                         ("XSETS", pathsets()),
                         ("HAUL", hault2()),
                         ("NEWITEMS", newitems())):
        body = body.replace("{{%s}}" % token, value)
    assert "{{" not in body, "unfilled token"

    open("system.html", "w").write(HEAD + '<div class="page">' + body + '</div>')
    import os
    print("%.0f KB" % (os.path.getsize("system.html") / 1024))
