"""紋樣 Beast motifs — the thing that makes eighteen pieces of gear eighteen drawings.

Same lesson as the 饕餮 masks: eighteen distinct creatures came out of one vocabulary and
a table, not out of eighteen drawings. A motif here is a small flat fragment authored in a
local box roughly -30..+30 around the origin, so it can be dropped onto a gear base, blown
up as a raw material, or shrunk into a corner without being redrawn.

Three colour axes end up on one tile and none of them fight:
    the TILE FRAME carries 階 tier      (五階, 凡 → 天)
    the MARK ACCENT carries 相 phase    (五行, from the beast)
    the MOTIF carries 源 origin         (which of the eighteen)
"""


def _pa(d, f=None, s=None, sw=2.0, op=1.0, cap="round"):
    return ('<path d="%s" fill="%s" stroke="%s" stroke-width="%.1f" stroke-linecap="%s" '
            'stroke-linejoin="round" fill-opacity="%.2f"/>'
            % (d, f or "none", s or "none", sw, cap, op))


def _e(cx, cy, rx, ry, f, op=1.0, rot=0):
    return ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" fill-opacity="%.2f" '
            'transform="rotate(%.1f %.1f %.1f)"/>' % (cx, cy, rx, ry, f, op, rot, cx, cy))


def _pg(pts, f, op=1.0):
    return ('<polygon points="%s" fill="%s" fill-opacity="%.2f"/>'
            % (" ".join("%.1f,%.1f" % p for p in pts), f, op))


def _r(x, y, w, h, f, rx=0, op=1.0, rot=0):
    return ('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s" '
            'fill-opacity="%.2f" transform="rotate(%.1f %.1f %.1f)"/>'
            % (x, y, w, h, rx, f, op, rot, x + w/2, y + h/2))


def _mir(frag):
    """Everything here is frontal and symmetric, for the same reason the masks are: a
    mirrored half cannot have an outline that drifts."""
    return frag(1) + frag(-1)


# ── 灰坡 Ash Slopes ──────────────────────────────────────────────────────────

def shrike(dk, lt, ac):          # 棘伯勞 — thorns
    return _mir(lambda s: (
        _pg([(s*6, -26), (s*13, 4), (s*5, 0)], ac)
        + _pg([(s*15, -12), (s*26, 12), (s*13, 8)], ac, .8)
        + _pg([(s*3, 6), (s*9, 26), (s*2, 20)], lt, .65)))


def hare(dk, lt, ac):            # 灰兔 — ears splayed outward, or they read as one stroke
    return (_mir(lambda s: (
        _pa("M %.0f 6 q %.0f -26 %.0f -40 q %.0f 16 %.0f 42 Z"
            % (s*5, s*3, s*17, s*9, s*-14), f=ac)
        + _pa("M %.0f 0 q %.0f -14 %.0f -24" % (s*8, s*3, s*9), s=lt, sw=2.2, op=.5)))
        + _e(0, 18, 12, 10, ac, .92)
        + _mir(lambda s: _e(s*5, 15, 2.3, 3, dk, .75)))


def beetle(dk, lt, ac):          # 鐵甲蟲 — carapace ridges and mandibles
    return (_e(0, 2, 17, 23, ac)
            + _r(-1.6, -21, 3.2, 44, dk, 1.6, .55)
            + "".join(_pa("M -14 %d q 14 5 28 0" % y, s=dk, sw=2.2, op=.45)
                      for y in (-8, 2, 12))
            + _mir(lambda s: _pa("M %.0f -22 q %.0f -14 %.0f -18"
                                 % (s*9, s*9, s*-2), s=ac, sw=3.4)))


# ── 蘆沼 Reed Marsh ──────────────────────────────────────────────────────────

def crane(dk, lt, ac):           # 仙鶴 — one long plume
    return (_pa("M 0 26 q -6 -26 -2 -46 q 2 -8 4 0 q 4 20 -2 46 Z", f=ac)
            + _mir(lambda s: "".join(
                _pa("M %.0f %d q %.0f -9 %.0f -14" % (s*2, y, s*11, s*15),
                    s=lt, sw=2.4, op=.5) for y in (18, 8, -2, -12))))


def toad(dk, lt, ac):            # 月蟾 — a crescent and three warts
    return (_pa("M -20 4 a 21 21 0 1 0 26 -22 a 17 17 0 1 1 -26 22 Z", f=ac)
            + "".join(_e(x, y, 4.2, 4.2, lt, .75) for x, y in ((9, 10), (18, 0), (13, -12))))


def serpent(dk, lt, ac):         # 青蛇 — the coil
    return (_pa("M 0 -24 a 17 17 0 1 1 -12 29 a 10 10 0 1 0 8 -18",
                s=ac, sw=8.5, cap="round")
            + _e(2, -25, 5.5, 4.5, lt, .9)
            + _pa("M 4 -26 l 11 -7 m -11 9 l 11 4", s=ac, sw=2.2))


# ── 燼林 Cinder Wood ─────────────────────────────────────────────────────────

def fox(dk, lt, ac):             # 九尾狐 — the tail fan
    return "".join(_pa("M 0 24 q %.0f -14 %.0f -40" % (i*7.0, i*9.5),
                       s=ac, sw=4.4, op=.55 + .05*abs(i))
                   for i in (-2.4, -1.6, -.8, 0, .8, 1.6, 2.4)) \
        + _e(0, 24, 8, 6, lt, .9)


def moth(dk, lt, ac):            # 燈蛾 — wing eye and antennae
    return _mir(lambda s: (
        _pa("M 0 -4 q %.0f -18 %.0f 2 q %.0f 20 0 14 Z" % (s*26, s*28, s*-6), f=ac, op=.9)
        + _e(s*15, -2, 4.4, 4.4, lt, .85)
        + _pa("M %.0f -12 q %.0f -14 %.0f -16" % (s*3, s*12, s*3), s=lt, sw=2.2, op=.7)))


def ape(dk, lt, ac):             # 石猿 — a split boulder
    # A fist was tried twice and read as bread both times. The ape's name is 石 stone, so
    # the motif is the stone: an irregular block with a crack, which cannot be mistaken for
    # the turtle's regular hexagons.
    return (_pg([(-24, 6), (-16, -18), (4, -25), (22, -12), (25, 10), (8, 24), (-14, 21)], ac)
            + _pa("M -2 -25 l 7 14 l -9 8 l 8 27", s=dk, sw=3.2, op=.55)
            + _pg([(-24, 6), (-16, -18), (4, -25), (2, -11), (-12, -5)], lt, .28)
            + _e(14, 13, 3.2, 3.2, dk, .35) + _e(-17, 11, 2.4, 2.4, dk, .3))


# ── 雷脊 Thunder Ridge ───────────────────────────────────────────────────────

def lynx(dk, lt, ac):            # 霜猞 — frost crystal and ear tufts
    return ("".join(_pa("M 0 0 l %.1f %.1f" % (18*c, 18*sn), s=ac, sw=4.2)
                    for c, sn in ((0, -1), (.87, .5), (-.87, .5)))
            + "".join(_pa("M 0 0 l %.1f %.1f" % (11*c, 11*sn), s=lt, sw=2.4, op=.6)
                      for c, sn in ((0, 1), (.87, -.5), (-.87, -.5)))
            + _e(0, 0, 5, 5, lt, .9))


def tiger(dk, lt, ac):           # 雷虎 — stripes as bolts, and 王
    return (_mir(lambda s: "".join(
        _pa("M %.0f %d l %.0f 7 l %.0f 7" % (s*8, y, s*9, s*-5), s=ac, sw=3.6)
        for y in (-20, -4, 12)))
        + _r(-11, -3, 22, 3.4, lt, 1.5, .8) + _r(-1.7, -16, 3.4, 30, lt, 1.5, .8)
        + _r(-9, 11, 18, 3.4, lt, 1.5, .8))


def boar(dk, lt, ac):            # 鐵根彘 — tusks
    return (_mir(lambda s: _pa("M %.0f 20 q %.0f -24 %.0f -38 q %.0f 17 %.0f 40 Z"
                               % (s*8, s*15, s*20, s*-1, s*-13), f=ac))
            + _e(0, 18, 13, 10, ac, .88)
            + _mir(lambda s: _e(s*5.5, 14, 2.8, 3.6, dk, .7))
            + _mir(lambda s: _pa("M %.0f 6 q %.0f -10 %.0f -12" % (s*9, s*4, s*1),
                                 s=lt, sw=2.4, op=.5)))


# ── 沉宮 Sunken Palace ───────────────────────────────────────────────────────

def roc(dk, lt, ac):             # 天鵬 — the broad wing
    return _mir(lambda s: (
        _pa("M 0 8 q %.0f -22 %.0f -16 q %.0f 18 %.0f 22 Z" % (s*20, s*30, s*-8, s*-30),
            f=ac, op=.92)
        + "".join(_pa("M %.0f %.0f q %.0f 6 %.0f 8" % (s*(8+i*7), -6+i*2, s*4, s*2),
                      s=lt, sw=2.0, op=.5) for i in range(3))))


def drake(dk, lt, ac):           # 溺蛟 — barbels over a wave
    return (_pa("M -26 10 q 13 -10 26 0 q 13 10 26 0", s=ac, sw=5)
            + _pa("M -20 20 q 10 -8 20 0 q 10 8 20 0", s=lt, sw=3, op=.5)
            + _mir(lambda s: _pa("M %.0f -2 q %.0f -20 %.0f -22" % (s*6, s*2, s*13),
                                 s=ac, sw=3.4))
            + _e(0, -6, 7, 5.5, ac, .9))


def turtle(dk, lt, ac):          # 玄武龜 — shell hexagons
    def hexa(cx, cy, r, f, op):
        return _pg([(cx + r*c, cy + r*sn) for c, sn in
                    ((1, 0), (.5, .87), (-.5, .87), (-1, 0), (-.5, -.87), (.5, -.87))], f, op)
    return (hexa(0, 0, 25, ac, .95) + hexa(0, 0, 12, dk, .35)
            + "".join(hexa(16*c, 16*sn, 6.5, dk, .3) for c, sn in
                      ((.87, .5), (-.87, .5), (0, -1))))


# ── 天裂 The Scar ────────────────────────────────────────────────────────────

def qilin(dk, lt, ac):           # 炎麒麟 — the flame crest
    return ("".join(_pa("M %.0f 24 q %.0f -14 %.0f -%d q %.0f 12 %.0f %d Z"
                        % (x-7, 1, 7, h, 6, 0, h), f=ac, op=o)
                    for x, h, o in ((-14, 26, .7), (0, 38, 1.0), (14, 26, .7)))
            + _pa("M -7 10 q 7 -10 14 0 q -7 12 -14 0 Z", f=lt, op=.75))


def wraith(dk, lt, ac):          # 陰魂 — smoke wisps
    return ("".join(_pa("M %d 26 q %.0f -16 %.0f -34 q %.0f -10 %.0f -6"
                        % (x, d*6, d*2, d*-8, d*-9), s=ac, sw=4.2, op=o)
                    for x, d, o in ((-13, -1, .6), (0, 1, .95), (13, 1, .6)))
            + _e(0, -16, 9, 10, ac, .9)
            + _mir(lambda s: _e(s*3.4, -18, 2.2, 3, dk, .85)))


def hydra(dk, lt, ac):           # 九頭蟒 — three necks standing for nine
    return "".join(_pa("M 0 28 q %.0f -12 %.0f -34" % (d*14, d*21), s=ac, sw=6.5, op=o)
                   + _e(d*21, -8, 9.5, 8, ac, o)
                   + _e(d*23.5, -10, 2.8, 2.8, lt, .95)
                   for d, o in ((-1, .72), (0, 1.0), (1, .72)))


MOTIF = {"shrike": shrike, "hare": hare, "beetle": beetle, "crane": crane, "toad": toad,
         "serpent": serpent, "fox": fox, "moth": moth, "ape": ape, "lynx": lynx,
         "tiger": tiger, "boar": boar, "roc": roc, "drake": drake, "turtle": turtle,
         "qilin": qilin, "wraith": wraith, "hydra": hydra}


def place(beast, x, y, s, dk, lt, ac):
    return ('<g transform="translate(%.1f %.1f) scale(%.3f)">%s</g>'
            % (x, y, s, MOTIF[beast](dk, lt, ac)))
