"""獸 Frontal creature marks, in the 饕餮 manner.

The badge worked; a character inside it did not, because a beast should look like a
beast. But an illustrated beast is exactly what failed nine times.

The resolution is the taotie: the bronze-age ritual mask. It is frontal, rigidly
symmetric, and built from a fixed vocabulary — horns, brow, eyes, snout, fangs, flanking
bodies — assembled differently for each creature. It is a DESIGNED mark, not a drawing,
so there is no anatomy to get wrong; and because both halves are the same shape mirrored,
the one thing that sank every previous figure (an outline nobody was controlling) cannot
happen.

Each creature is a parameter set over one vocabulary. Eighteen beasts, six wardens and
the humanoids are the same generator with different rows.
"""
import math

def mix(a, b, k):
    a, b = a.lstrip("#"), b.lstrip("#")
    return "#%02X%02X%02X" % tuple(
        int(round(int(a[i:i+2], 16) * (1 - k) + int(b[i:i+2], 16) * k)) for i in (0, 2, 4))


def _p(pts):
    return " ".join("%.1f,%.1f" % p for p in pts)


class Mark:
    """Draw once for the right half; every piece is mirrored onto the left."""

    def __init__(self, ink, lit, acc, bg):
        self.o = []
        self.ink, self.lit, self.acc, self.bg = ink, lit, acc, bg

    def sym(self, frag_fn):
        """Emit a fragment for s=+1 and s=-1, so the mark cannot be asymmetric."""
        for s in (1, -1):
            self.o.append(frag_fn(s))

    def poly(self, pts, fill, op=1.0, s=1):
        p = [(100 + s * (x - 100), y) for x, y in pts]
        return '<polygon points="%s" fill="%s" fill-opacity="%.2f"/>' % (_p(p), fill, op)

    def ell(self, cx, cy, rx, ry, fill, op=1.0, rot=0, s=1):
        x = 100 + s * (cx - 100)
        return ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" '
                'fill-opacity="%.2f" transform="rotate(%.1f %.1f %.1f)"/>'
                % (x, cy, rx, ry, fill, op, rot * s, x, cy))

    def path(self, d, fill=None, stroke=None, sw=2.0, op=1.0):
        return ('<path d="%s" fill="%s" stroke="%s" stroke-width="%.1f" '
                'stroke-linecap="round" fill-opacity="%.2f"/>'
                % (d, fill or "none", stroke or "none", sw, op))

    def svg(self, w, h):
        return ('<svg viewBox="0 0 200 200" width="%d" height="%d" '
                'xmlns="http://www.w3.org/2000/svg">%s</svg>'
                % (w, h, "".join(self.o)))


# ── the vocabulary ────────────────────────────────────────────────────────────

def horns(m, kind, y=62, spread=30, size=1.0):
    if kind is None:
        return
    if kind == "curved":        # 牛 ox horns, sweeping out and up
        m.sym(lambda s: m.path(
            "M %.1f %.1f q %.1f -%.1f %.1f -%.1f q -%.1f %.1f -%.1f %.1f Z"
            % (100 + s*spread, y, s*26*size, 22*size, s*40*size, 34*size,
               s*6*size, 12*size, s*26*size, 16*size), fill=m.ink))
    elif kind == "straight":    # 角 a pair of spikes
        m.sym(lambda s: m.poly([(100+spread, y), (100+spread+10*size, y-34*size),
                                (100+spread+17*size, y+4)], m.ink, s=s))
    elif kind == "antler":      # 鹿 branching
        m.sym(lambda s: m.path(
            "M %.1f %.1f L %.1f %.1f M %.1f %.1f L %.1f %.1f M %.1f %.1f L %.1f %.1f"
            % (100+s*spread, y, 100+s*(spread+22*size), y-34*size,
               100+s*(spread+8*size), y-13*size, 100+s*(spread+2*size), y-32*size,
               100+s*(spread+16*size), y-24*size, 100+s*(spread+32*size), y-30*size),
            stroke=m.ink, sw=5.5*size))
    elif kind == "single":      # 麟 one horn on the brow
        m.o.append(m.poly([(94, y-6), (106, y-6), (100, y-42*size)], m.ink))
    elif kind == "crown":       # 冠 a ridge of points
        for i in range(5):
            x = 100 + (i - 2) * 15 * size
            hgt = 30 * size - abs(i - 2) * 6 * size
            m.o.append(m.poly([(x-7, y), (x+7, y), (x, y-hgt)], m.ink))


def ears(m, kind, y=74, spread=44):
    if kind is None:
        return
    if kind == "tuft":
        m.sym(lambda s: m.poly([(100+spread-6, y+10), (100+spread+14, y-20),
                                (100+spread+16, y+8)], m.ink, s=s))
    elif kind == "round":
        m.sym(lambda s: m.ell(100+spread+4, y, 13, 15, m.ink, s=s))
    elif kind == "long":
        m.sym(lambda s: m.ell(100+spread, y-14, 8, 28, m.ink, rot=16, s=s))


def head(m, kind, cy=106, w=46, h=42):
    if kind == "round":
        m.o.append(m.ell(100, cy, w, h, m.ink))
    elif kind == "broad":       # 虎 wide skull, flat top
        m.o.append(m.path("M %.1f %.1f Q 100 %.1f %.1f %.1f L %.1f %.1f "
                          "Q 100 %.1f %.1f %.1f Z"
                          % (100-w, cy-h*0.35, cy-h*1.05, 100+w, cy-h*0.35,
                             100+w*0.78, cy+h*0.9, cy+h*1.25, 100-w*0.78, cy+h*0.9),
                          fill=m.ink))
    elif kind == "long":        # 蟒 a narrow wedge
        m.o.append(m.path("M %.1f %.1f Q 100 %.1f %.1f %.1f L 100 %.1f Z"
                          % (100-w*0.8, cy-h*0.2, cy-h*1.1, 100+w*0.8, cy-h*0.2,
                             cy+h*1.35), fill=m.ink))
    elif kind == "angular":     # 甲 a plated hexagon
        m.o.append(m.poly([(100-w, cy-h*0.45), (100-w*0.55, cy-h), (100+w*0.55, cy-h),
                           (100+w, cy-h*0.45), (100+w*0.62, cy+h*0.95),
                           (100-w*0.62, cy+h*0.95)], m.ink))


def brow(m, y=92, w=40, drop=9):
    m.o.append(m.path("M %.1f %.1f Q 100 %.1f %.1f %.1f L %.1f %.1f Q 100 %.1f %.1f %.1f Z"
                      % (100-w, y, y-drop*1.7, 100+w, y, 100+w*0.9, y+drop,
                         y-drop*0.2, 100-w*0.9, y+drop), fill=m.lit, op=.9))


def eyes(m, kind, y=106, spread=20, size=1.0):
    if kind == "round":
        m.sym(lambda s: m.ell(100+spread, y, 11*size, 11*size, m.bg, s=s))
        m.sym(lambda s: m.ell(100+spread, y, 7*size, 7*size, m.acc, s=s))
    elif kind == "slit":
        m.sym(lambda s: m.ell(100+spread, y, 13*size, 7*size, m.bg, rot=-12, s=s))
        m.sym(lambda s: m.ell(100+spread, y, 4*size, 6*size, m.acc, s=s))
    elif kind == "almond":
        m.sym(lambda s: m.poly([(100+spread-13*size, y), (100+spread, y-8*size),
                                (100+spread+13*size, y), (100+spread, y+8*size)],
                               m.bg, s=s))
        m.sym(lambda s: m.ell(100+spread, y, 5*size, 6*size, m.acc, s=s))
    elif kind == "many":        # 蜘 several small ones
        for k, (dx, dy, r) in enumerate(((16, -4, 6), (30, 2, 4.5), (20, 10, 4))):
            m.sym(lambda s, dx=dx, dy=dy, r=r: m.ell(100+dx, y+dy, r, r, m.acc, s=s))


def snout(m, kind, y=134, w=20):
    if kind == "snout":
        m.o.append(m.ell(100, y, w, w*0.62, m.lit, op=.85))
        m.o.append(m.ell(100, y-3, w*0.34, w*0.26, m.bg))
    elif kind == "beak":
        m.o.append(m.poly([(100-w*0.5, y-10), (100+w*0.5, y-10), (100, y+26)], m.lit))
    elif kind == "mandible":
        m.sym(lambda s: m.path("M %.1f %.1f q 10 16 2 26"
                               % (100 + 10, y - 8), stroke=m.lit, sw=5.5))
    elif kind == "muzzle":      # 猿 a broad jaw
        m.o.append(m.ell(100, y+2, w*1.25, w*0.72, m.lit, op=.85))


def tongue(m, y=142, length=22):
    """舌 forked. One small piece of vocabulary that makes a wedge read as a snake."""
    m.o.append(m.path("M 100 %.1f L 100 %.1f M 100 %.1f l -7 7 M 100 %.1f l 7 7"
                      % (y, y + length, y + length, y + length),
                      stroke=m.acc, sw=3.4))


def mouth(m, y=132, w=40):
    m.o.append(m.path("M %.1f %.1f q 100 %.1f %.1f %.1f" % (100 - w, y, y + 26, 100 + w, y),
                      stroke=m.bg, sw=7))
    m.o.append(m.path("M %.1f %.1f q 100 %.1f %.1f %.1f" % (100 - w, y, y + 26, 100 + w, y),
                      stroke=m.lit, sw=3, op=.8))


def fangs(m, y=146, spread=13, n=2, size=1.0):
    for i in range(n):
        dx = spread + i * 9
        m.sym(lambda s, dx=dx: m.poly([(100+dx-5*size, y), (100+dx+5*size, y),
                                       (100+dx, y+15*size)], m.bg, s=s))


def marks(m, kind, y=78):
    if kind == "wang":          # 王 on a tiger's brow
        for i, (yy, w) in enumerate(((y, 15), (y+9, 15), (y+18, 21))):
            m.o.append('<rect x="%.1f" y="%.1f" width="%.1f" height="3.6" fill="%s"/>'
                       % (100-w/2, yy, w, m.lit))
        m.o.append('<rect x="98.2" y="%.1f" width="3.6" height="22" fill="%s"/>'
                   % (y, m.lit))
    elif kind == "stripes":
        for i in range(3):
            m.sym(lambda s, i=i: m.path("M %.1f %.1f q %.1f 8 %.1f 14"
                                        % (100+s*(26+i*11), y+i*7, s*5, s*2),
                                        stroke=m.lit, sw=3.6, op=.75))
    elif kind == "scale":
        for row in range(3):
            for k in range(3 - row):
                m.sym(lambda s, row=row, k=k: m.path(
                    "M %.1f %.1f a 7 6 0 0 1 12 0" % (100 + s*(6+k*13), y+row*9),
                    stroke=m.lit, sw=2.4, op=.6))


def tusks(m, y=138, spread=16, size=1.0):
    """牙 upward, from the lower jaw. A boar is tusks before it is anything else."""
    m.sym(lambda s: m.path("M %.1f %.1f q -%.1f -%.1f -%.1f -%.1f"
                           % (100 + spread, y, 2*size, 16*size, 8*size, 24*size),
                           stroke=m.bg, sw=7*size))


def whiskers(m, y=128, spread=22):
    """鬚 the long trailing whiskers of a 蛟 water-drake."""
    for i in range(2):
        m.sym(lambda s, i=i: m.path("M %.1f %.1f q %.1f %.1f %.1f %.1f"
                                    % (100 + s*spread, y + i*9, s*26, 6, s*44, 22 + i*8),
                                    stroke=m.lit, sw=3.2, op=.8))


def antennae(m, y=68, spread=16):
    """觸 feathered, for a moth."""
    m.sym(lambda s: m.path("M %.1f %.1f q %.1f -%.1f %.1f -%.1f"
                           % (100 + s*spread, y, s*14, 22, s*34, 30),
                           stroke=m.ink, sw=4))
    for i in range(4):
        m.sym(lambda s, i=i: m.path("M %.1f %.1f l %.1f -%.1f"
                                    % (100 + s*(spread + 6 + i*7), y - 8 - i*7, s*7, 7),
                                    stroke=m.ink, sw=2.2, op=.8))


def ruff(m, y=132, w=52):
    """頸毛 a lynx's ruff: the collar of fur that frames the face."""
    for i in range(7):
        x = 100 + (i - 3) * (w / 3.5)
        m.o.append(m.poly([(x - 8, y), (x + 8, y), (x, y + 22 - abs(i - 3) * 3)],
                          m.ink))


def hood(m, y=104, w=44, h=48):
    """兜 a wraith has no head, only a hood with something inside it."""
    m.o.append(m.path("M %.1f %.1f q 0 -%.1f %.1f -%.1f q %.1f 0 %.1f %.1f "
                      "q 0 %.1f -%.1f %.1f Z"
                      % (100 - w, y + h*.4, h*1.1, w, h*.9, w, w, h*1.5,
                         h*.5, w*.3, h*.5), fill=m.ink))
    m.o.append(m.path("M %.1f %.1f q 0 -%.1f %.1f -%.1f q %.1f 0 %.1f %.1f Z"
                      % (100 - w*.6, y + h*.3, h*.7, w*.6, h*.55, w*.6, w*.6, h*.85),
                      fill=m.bg))


def heads(m, n=3, y=112, spread=34, r=15):
    """首 several small heads, for a 九頭蟒: one awake, the rest asleep."""
    for i in range(n):
        dx = (i - (n - 1) / 2.0) * spread
        awake = (i == n // 2)
        m.o.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s"/>'
                   % (100 + dx, y - (6 if awake else 0), r, r * 1.25, m.ink))
        if awake:
            for s in (-1, 1):
                m.o.append('<ellipse cx="%.1f" cy="%.1f" rx="4" ry="5" fill="%s"/>'
                           % (100 + dx + s * 6, y - 8, m.acc))
        else:
            m.o.append('<path d="M %.1f %.1f h 12" stroke="%s" stroke-width="2.6" '
                       'fill="none"/>' % (100 + dx - 6, y, m.lit))


def body(m, kind, y=166):
    if kind == "paws":
        m.sym(lambda s: m.path("M %.1f %.1f q 0 16 -%.1f 20"
                               % (100+s*46, y, s*10), stroke=m.ink, sw=13))
        m.sym(lambda s: m.ell(100+38, y+22, 15, 8, m.ink, s=s))
    elif kind == "coil":
        for i, (rx, ry, dy, sw) in enumerate(((44, 17, 14, 11), (30, 12, 22, 9),
                                              (17, 7, 28, 7))):
            m.o.append('<ellipse cx="100" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" '
                       'stroke="%s" stroke-width="%.1f" stroke-opacity="%.2f"/>'
                       % (y + dy, rx, ry, m.ink, sw, .95 - i * .12))
    elif kind == "wings":
        m.sym(lambda s: m.path(
            "M %.1f %.1f q %.1f -%.1f %.1f %.1f q -%.1f %.1f -%.1f %.1f Z"
            % (100 + s*26, y - 16, s*40, 4, s*58, 24, s*14, 12, s*54, 4),
            fill=m.ink))
        for i in range(3):
            m.sym(lambda s, i=i: m.path("M %.1f %.1f l %.1f %.1f"
                                        % (100 + s*(46 + i*10), y + 2 + i*4,
                                           s*10, 10 - i*2),
                                        stroke=m.bg, sw=2.2, op=.45))
    elif kind == "shell":
        m.o.append(m.path("M 52 %.1f q 48 -28 96 0 q -48 32 -96 0 Z" % y, fill=m.ink))
    elif kind == "shoulders":   # 人 a humanoid: the mask sits on shoulders
        m.o.append(m.path("M 50 %.1f q 50 -22 100 0 L 100 %.1f Z" % (y+18, y+18),
                          fill=m.ink))
        m.o.append(m.path("M 62 %.1f q 38 -16 76 0" % (y+16), stroke=m.lit, sw=3, op=.7))


# ── the table ─────────────────────────────────────────────────────────────────

def creature(kind, ink, lit, acc, bg, w=200, h=200):
    m = Mark(ink, lit, acc, bg)
    c = CREATURES[kind]
    if c.get("heads"):
        body(m, c.get("body"))
        heads(m, **c["heads"])
        return m.svg(w, h)
    if c.get("hood"):
        body(m, c.get("body"))
        hood(m, **(c["hood"] if isinstance(c["hood"], dict) else {}))
        if c.get("eyes"):
            eyes(m, c.get("eyes"), **c.get("eye_kw", {}))
        return m.svg(w, h)
    body(m, c.get("body"))
    horns(m, c.get("horns"), **c.get("horn_kw", {}))
    ears(m, c.get("ears"), **c.get("ear_kw", {}))
    if c.get("head"):
        head(m, c.get("head"), **c.get("head_kw", {}))
    if c.get("brow", True):
        brow(m, **c.get("brow_kw", {}))
    marks(m, c.get("marks"), **c.get("mark_kw", {}))
    if c.get("eyes"):
        eyes(m, c.get("eyes"), **c.get("eye_kw", {}))
    snout(m, c.get("snout"), **c.get("snout_kw", {}))
    for extra, fn in (("ruff", ruff), ("antennae", antennae), ("whiskers", whiskers),
                      ("tusks", tusks), ("heads", heads)):
        if c.get(extra):
            fn(m, **(c[extra] if isinstance(c[extra], dict) else {}))
    if c.get("fangs"):
        fangs(m, **c.get("fang_kw", {}))
    if c.get("mouth"):
        mouth(m, **c["mouth"])
    if c.get("tongue"):
        tongue(m, **c.get("tongue_kw", {}))
    return m.svg(w, h)


CREATURES = {
  "tiger":   dict(head="broad", ears="tuft", eyes="round", snout="snout", fangs=True,
                  marks="wang", body="paws", mark_kw=dict(y=72)),
  "serpent": dict(head="long", eyes="slit", snout=None, fangs=True, marks=None,
                  body="coil", brow=False, head_kw=dict(w=40, h=40),
                  eye_kw=dict(y=100, spread=17), fang_kw=dict(y=134, spread=11, n=1),
                  tongue=True, tongue_kw=dict(y=140, length=20)),
  "crane":   dict(head="round", horns="crown", eyes="round", snout="beak", body="wings",
                  head_kw=dict(w=34, h=34), horn_kw=dict(y=66, size=.55),
                  eye_kw=dict(y=102, spread=15, size=.8)),
  "beetle":  dict(head="angular", horns="curved", eyes="many", snout="mandible",
                  marks="scale", body="shell", brow=False,
                  horn_kw=dict(y=70, spread=18, size=.7)),
  "ape":     dict(head="broad", ears="round", eyes="round", snout="muzzle", fangs=True,
                  body="paws", head_kw=dict(w=44, h=40)),
  "fox":     dict(head="long", ears="long", eyes="almond", snout="snout", fangs=True,
                  marks="stripes", body="paws", head_kw=dict(w=38, h=42),
                  snout_kw=dict(y=140, w=15)),
  "qilin":   dict(head="long", horns="single", ears="long", eyes="almond", snout="snout",
                  fangs=True, marks="scale", body="paws", head_kw=dict(w=38, h=42)),
  "toad":    dict(head="broad", eyes="round", snout="muzzle", body="shell",
                  head_kw=dict(w=50, h=34), eye_kw=dict(y=96, spread=26, size=1.25),
                  snout_kw=dict(y=132, w=22)),
  "demon":   dict(head="angular", horns="straight", eyes="slit", snout=None, fangs=True,
                  marks="stripes", body="shoulders", head_kw=dict(w=40, h=42),
                  horn_kw=dict(y=66, spread=24, size=1.1), mark_kw=dict(y=120)),
  "warden":  dict(head="round", horns="antler", eyes="almond", snout=None,
                  marks="wang", body="shoulders", head_kw=dict(w=40, h=42),
                  horn_kw=dict(y=64, spread=26, size=1.1), mark_kw=dict(y=112)),
}

CREATURES.update({
  "hare":    dict(head="round", ears="long", eyes="round", snout="snout", body="paws",
                  head_kw=dict(w=34, h=34), ear_kw=dict(y=66, spread=20),
                  eye_kw=dict(y=100, spread=15, size=.9), snout_kw=dict(y=126, w=14)),
  "shrike":  dict(head="round", horns="crown", eyes="round", snout="beak", body="wings",
                  head_kw=dict(w=30, h=30), horn_kw=dict(y=70, size=.42),
                  eye_kw=dict(y=100, spread=13, size=.75), snout_kw=dict(y=124)),
  "moth":    dict(head="round", antennae=True, eyes="many", snout=None, body="wings",
                  head_kw=dict(w=30, h=30), brow=False),
  "boar":    dict(head="broad", ears="round", eyes="slit", snout="snout", tusks=True,
                  marks="stripes", body="paws", head_kw=dict(w=46, h=36),
                  snout_kw=dict(y=138, w=24)),
  "lynx":    dict(head="broad", ears="tuft", eyes="almond", snout="snout", fangs=True,
                  ruff=True, body="paws", head_kw=dict(w=40, h=36)),
  "roc":     dict(head="round", horns="crown", eyes="almond", snout="beak", body="wings",
                  head_kw=dict(w=36, h=34), horn_kw=dict(y=64, size=.7),
                  snout_kw=dict(y=126, w=26)),
  "turtle":  dict(head="long", eyes="round", snout="beak", body="shell", brow=False,
                  head_kw=dict(w=26, h=30), eye_kw=dict(y=98, spread=13, size=.8),
                  snout_kw=dict(y=120, w=14)),
  "drake":   dict(head="long", horns="antler", eyes="slit", snout=None, fangs=True,
                  whiskers=True, marks="scale", body="coil", head_kw=dict(w=36, h=40),
                  horn_kw=dict(y=64, spread=22, size=.85), brow=False),
  "wraith":  dict(hood=True, eyes="slit", body=None,
                  eye_kw=dict(y=104, spread=15, size=1.1)),
  "hydra":   dict(heads=dict(n=3, y=114, spread=36, r=16), body="coil", brow=False,
                  head=None, eyes=None, snout=None),
})

NAMES = {"hare": ("灰兔", "Ash Hare"), "shrike": ("棘伯勞", "Thorn Shrike"),
         "moth": ("燈蛾", "Lantern Moth"), "boar": ("鐵根彘", "Ironroot Boar"),
         "lynx": ("霜猞", "Frost Lynx"), "roc": ("天鵬", "Sky Roc"),
         "turtle": ("玄武龜", "Black Stone Turtle"), "drake": ("溺蛟", "Drowned Drake"),
         "wraith": ("陰魂", "Yin Wraith"), "hydra": ("九頭蟒", "Nine-Head Python"),
         "tiger": ("雷虎", "Thunder Tiger"), "serpent": ("青蛇", "Jade Serpent"),
         "crane": ("仙鶴", "Immortal Crane"), "beetle": ("鐵甲蟲", "Iron Beetle"),
         "ape": ("石猿", "Stone Ape"), "fox": ("九尾狐", "Nine-Tailed Fox"),
         "qilin": ("炎麒麟", "Flame Qilin"), "toad": ("月蟾", "Moon Toad"),
         "demon": ("魔修", "Deviant Cultivator"), "warden": ("妖王", "Beast King")}
