"""Compose the creature marks into their frames, for the sheet and for the page."""
import sys, math
sys.path.insert(0, '.')
import creatures as C

PAL = {
  "hare":    ("#D8DCCE", "#4E6B58", "#8FD9A0", "#54706A"),
  "shrike":  ("#DCD6C2", "#6B7A4A", "#C6D98F", "#5E6B3C"),
  "moth":    ("#E8CFAE", "#B8412A", "#F0906A", "#8A4A2A"),
  "boar":    ("#CFC3AE", "#7A5A2E", "#F2CE72", "#6B4A24"),
  "lynx":    ("#DEE6EC", "#5A7A94", "#8FB4F0", "#5A7486"),
  "roc":     ("#D6DCE2", "#6B6F7A", "#DCE6EE", "#5E6470"),
  "turtle":  ("#C6CFCA", "#3E5A56", "#8FD9A0", "#34504C"),
  "drake":   ("#C2D2DC", "#32509A", "#8FB4F0", "#2E4680"),
  "wraith":  ("#B8A6C0", "#5A2E6B", "#C88FE0", "#4A2456"),
  "hydra":   ("#CBD8C0", "#3E6B3C", "#A8D98F", "#345C34"),
  "tiger":   ("#EADFC6", "#C8442C", "#F2CE72", "#A43A26"),
  "serpent": ("#D9EBD8", "#2E6B4A", "#8FD9A0", "#2A5E42"),
  "crane":   ("#EDEFEA", "#C8442C", "#F0906A", "#6B7A82"),
  "beetle":  ("#CBD8C8", "#2E6B4A", "#8FD9A0", "#31503C"),
  "ape":     ("#D8D2C2", "#8A5A2B", "#F2CE72", "#5A4632"),
  "fox":     ("#F2CDAE", "#C8442C", "#F0906A", "#9E3A22"),
  "qilin":   ("#F4E6C4", "#C8442C", "#F2CE72", "#B4692A"),
  "toad":    ("#D6E2DC", "#3E6B84", "#8FB4F0", "#3A5A6B"),
  "demon":   ("#CBB6C8", "#7A2E52", "#E06A8A", "#5A2340"),
  "warden":  ("#F0E2BC", "#8A6A1E", "#F2CE72", "#8A6A1E"),
}
# 十八獸 the eighteen, by ground, then the two humanoids
ORDER = ["hare", "beetle", "shrike", "serpent", "crane", "toad",
         "fox", "ape", "moth", "tiger", "boar", "lynx",
         "roc", "turtle", "drake", "qilin", "wraith", "hydra"]
HUMANOID = ["demon", "warden"]


# 位 the rank of a creature: how much gathers around it inside its own frame
RANK = {"hare": 1, "beetle": 1, "shrike": 1, "serpent": 2, "crane": 2, "toad": 2,
        "fox": 3, "ape": 3, "moth": 2, "tiger": 4, "boar": 3, "lynx": 3,
        "roc": 4, "turtle": 4, "drake": 5, "qilin": 5, "wraith": 4, "hydra": 5,
        "demon": 4, "warden": 6}


def aura(kind, rim, light):
    """A beast of rank one sits in a plain frame. A 妖王 brings weather with it, and
    that has to happen INSIDE the seal or the grid stops being a grid."""
    import math
    r = RANK.get(kind, 1)
    o = ('<defs><radialGradient id="ba%s"><stop offset="0" stop-color="%s" '
         'stop-opacity=".00"/><stop offset=".62" stop-color="%s" stop-opacity="%.2f"/>'
         '<stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient></defs>'
         % (kind, light, light, min(.30, .05 * r), light))
    if r >= 2:
        o += '<circle cx="100" cy="100" r="84" fill="url(#ba%s)"/>' % kind
    if r >= 3:                       # 芒 spokes behind the creature
        for i in range(12):
            a = i * math.tau / 12
            o += ('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" '
                  'stroke-width="%.1f" stroke-opacity="%.2f"/>'
                  % (100 + math.cos(a)*44, 100 + math.sin(a)*44,
                     100 + math.cos(a)*(64 + r*3), 100 + math.sin(a)*(64 + r*3),
                     light, 2.0 if i % 3 == 0 else 1.1, .10 + .04 * r))
    if r >= 4:                       # 環 an orbit of sigils
        for i in range(8):
            a = i * math.tau / 8 + .2
            o += ('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" fill-opacity="%.2f"/>'
                  % (100 + math.cos(a)*72, 100 + math.sin(a)*72, 2.2 + r*.25,
                     light, .35 + .07 * r))
    if r >= 5:                       # 輪 a turning ring
        o += ('<circle cx="100" cy="100" r="78" fill="none" stroke="%s" '
              'stroke-width="1" stroke-opacity=".45" stroke-dasharray="7 9"/>' % light)
    if r >= 6:                       # 王 a warden's corona
        for i in range(24):
            a = i * math.tau / 24
            o += ('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" '
                  'stroke-width="1.4" stroke-opacity=".30"/>'
                  % (100 + math.cos(a)*82, 100 + math.sin(a)*82,
                     100 + math.cos(a)*94, 100 + math.sin(a)*94, light))
    return o


def framed(kind, style="seal", size=200):
    ink, lit, acc, rim = PAL[kind]
    inner = C.creature(kind, ink, lit, acc, "#150C09", 200, 200).split(">", 1)[1] \
        .rsplit("</svg>", 1)[0]
    if style == "seal":
        f = ('<rect x="8" y="8" width="184" height="184" rx="3" fill="#150C09"/>'
             '<rect x="8" y="8" width="184" height="184" rx="3" fill="none" '
             'stroke="%s" stroke-width="7"/>'
             '<rect x="19" y="19" width="162" height="162" rx="2" fill="none" '
             'stroke="%s" stroke-width="1.6" stroke-opacity=".55"/>' % (rim, rim))
        for cx, cy in ((25, 25), (175, 25), (25, 175), (175, 175)):
            f += '<rect x="%.0f" y="%.0f" width="9" height="9" fill="%s"/>' % (
                cx - 4.5, cy - 4.5, rim)
    else:
        f = ('<circle cx="100" cy="100" r="92" fill="%s"/>'
             '<circle cx="100" cy="100" r="84" fill="#150C09"/>'
             '<circle cx="100" cy="100" r="78" fill="none" stroke="%s" stroke-width="2" '
             'stroke-opacity=".7"/>'
             % (C.mix(rim, "#FFFFFF", .30), C.mix(rim, "#FFFFFF", .5)))
        for i in range(16):
            a = i * 22.5 * math.pi / 180
            f += '<circle cx="%.1f" cy="%.1f" r="2.8" fill="%s"/>' % (
                100 + 88 * math.cos(a), 100 + 88 * math.sin(a),
                C.mix(rim, "#FFFFFF", .45))
    return ('<svg viewBox="0 0 200 200" width="%d" height="%d" '
            'xmlns="http://www.w3.org/2000/svg">%s%s'
            '<g transform="translate(100 104) scale(.80) translate(-100 -104)">%s</g>'
            '</svg>' % (size, size, f, aura(kind, rim, acc), inner))


def grid(style):
    return "".join('<figure>%s<b>%s</b><span>%s</span></figure>'
                   % (framed(k, style), C.NAMES[k][0], C.NAMES[k][1]) for k in ORDER)


if __name__ == "__main__":
    rows = ""
    for style, label, note in (("seal", "印 SEAL FRAME", "square, carved, struck"),
                               ("medal", "章 MEDALLION FRAME", "circular, metal rim")):
        rows += ('<section><h2>%s <small>%s</small></h2><div class="grid">%s</div>'
                 '</section>' % (label, note, grid(style)))
    open("beasts.html", "w").write("""<title>Creature marks</title><style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;500;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:#05100D;color:#E6EEE8;font-family:"Noto Serif SC",serif;padding:26px;width:1160px}
h1{font-size:12px;font-weight:300;letter-spacing:.32em;color:#7C9389;text-transform:uppercase;margin-bottom:6px}
.lede{font-size:12.5px;color:#7C9389;margin-bottom:22px;max-width:70ch;line-height:1.6;font-weight:300}
h2{font-size:12px;font-weight:500;letter-spacing:.22em;margin-bottom:10px;color:#D4A843}
h2 small{font-size:10px;font-weight:300;letter-spacing:.14em;color:#7C9389;margin-left:10px}
section{margin-bottom:26px}
.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px}
figure{text-align:center;background:linear-gradient(180deg,#08150F,#050D0B);
 border:1px solid rgba(212,168,67,.10);border-radius:2px;padding:7px 4px 10px}
figure svg{width:100%;height:auto;display:block}
figure b{display:block;font-size:13px;font-weight:500;margin-top:5px;letter-spacing:.06em}
figure span{display:block;font-size:8px;letter-spacing:.18em;color:#4A5D56;text-transform:uppercase;margin-top:3px}
</style>
<h1>Creature marks &nbsp;·&nbsp; 饕餮 frontal, symmetric, assembled from one vocabulary</h1>
<p class="lede">Horns, ears, brow, eyes, snout, mouth, fangs, tongue, markings, body.
Eight beasts and two humanoids are the same generator with different rows &mdash; so they
are distinct from each other and unmistakably one family.</p>""" + rows)
    print("ok")
