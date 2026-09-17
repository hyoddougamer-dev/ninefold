"""物 Item marks: flat, geometric, one tile each.

The 3D-rendered objects from earlier read well on their own but would clash beside flat
masks — a library has to be one material or it is two libraries. These are the same
objects redrawn as flat marks, so an item, a beast and a cultivator sit on one screen and
belong to each other.

Rarity is the 五階 ladder and it is carried by the TILE, not by the object: the same pill
at common and at heaven is the same drawing in a different frame. That is what lets a
player read rarity across a grid without reading a word.
"""
import math

# 五階 the rarity ladder: ordinary, spirit, mystic, earth, heaven
TIERS = [("凡", "Common",  "#8A9A92", "#B7C4BC"),
         ("靈", "Spirit",  "#2E8F68", "#8FD9A0"),
         ("玄", "Mystic",  "#3A5FA8", "#8FB4F0"),
         ("地", "Earth",   "#A07420", "#F2CE72"),
         ("天", "Heaven",  "#B8412A", "#F0906A")]


def mix(a, b, k):
    a, b = a.lstrip("#"), b.lstrip("#")
    return "#%02X%02X%02X" % tuple(
        int(round(int(a[i:i+2], 16) * (1 - k) + int(b[i:i+2], 16) * k)) for i in (0, 2, 4))


def _e(cx, cy, rx, ry, f, op=1.0, rot=0):
    return ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" '
            'fill-opacity="%.2f" transform="rotate(%.1f %.1f %.1f)"/>'
            % (cx, cy, rx, ry, f, op, rot, cx, cy))


def _r(x, y, w, h, f, rx=0, op=1.0, rot=0):
    return ('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" fill="%s" '
            'fill-opacity="%.2f" transform="rotate(%.1f %.1f %.1f)"/>'
            % (x, y, w, h, rx, f, op, rot, x + w / 2, y + h / 2))


def _pg(pts, f, op=1.0):
    return ('<polygon points="%s" fill="%s" fill-opacity="%.2f"/>'
            % (" ".join("%.1f,%.1f" % p for p in pts), f, op))


def _pa(d, f=None, s=None, sw=2.0, op=1.0):
    return ('<path d="%s" fill="%s" stroke="%s" stroke-width="%.1f" stroke-linecap="round" '
            'fill-opacity="%.2f"/>' % (d, f or "none", s or "none", sw, op))


# ── the objects. dk = body, lt = highlight, ac = accent ───────────────────────

def pill(dk, lt, ac):
    return (_e(100, 104, 42, 42, dk) + _e(100, 104, 42, 42, lt, .0)
            + _pa("M 72 104 a 28 28 0 0 1 56 0 a 28 28 0 0 0 -56 0", f=ac, op=.9)
            + _e(86, 88, 12, 8, lt, .55, -28))


def stone(dk, lt, ac):
    return (_pg([(100, 52), (134, 92), (122, 152), (78, 152), (66, 92)], dk)
            + _pg([(100, 52), (122, 152), (100, 152)], lt, .35)
            + _pg([(100, 52), (134, 92), (100, 96)], ac, .5))


def jade(dk, lt, ac):
    return ('<circle cx="100" cy="104" r="44" fill="%s"/>'
            '<circle cx="100" cy="104" r="17" fill="#0B1512"/>'
            '<circle cx="100" cy="104" r="44" fill="none" stroke="%s" stroke-width="3" '
            'stroke-opacity=".7"/>' % (dk, lt)
            + "".join(_e(100 + 33 * math.cos(a), 104 + 33 * math.sin(a), 4, 4, lt, .6)
                      for a in [i * math.pi / 4 for i in range(8)]))


def talisman(dk, lt, ac):
    o = _pa("M 78 48 h 44 v 108 l -22 14 l -22 -14 Z", f=dk)
    o += _r(88, 58, 24, 22, ac, 1, .9)
    for i, (y, w) in enumerate(((92, 26), (108, 18), (124, 26))):
        o += _r(100 - w / 2, y, w, 4, lt, 2, .85)
    o += _r(98, 92, 4, 40, lt, 2, .85)
    return o


def scroll(dk, lt, ac):
    o = _r(66, 74, 68, 58, mix(dk, "#FFFFFF", .55))
    for i, y in enumerate((88, 102, 116)):
        o += _r(78, y, 44 - i * 8, 3.6, dk, 2, .6)
    for x in (62, 130):
        o += _r(x, 66, 8, 74, dk, 4)
        o += _e(x + 4, 66, 7, 5, ac) + _e(x + 4, 140, 7, 5, ac)
    return o


def cauldron(dk, lt, ac):
    o = _pa("M 64 92 q 36 -14 72 0 q 6 44 -12 56 h -48 q -18 -12 -12 -56 Z", f=dk)
    o += _r(60, 84, 80, 10, ac, 3)
    for s in (-1, 1):
        o += _pa("M %.1f 110 q %.1f 22 %.1f 34" % (100 + s * 26, s * 8, s * 2),
                 s=dk, sw=9)
        o += _pa("M %.1f 92 a 11 11 0 0 %d 0 22" % (100 + s * 42, 1 if s > 0 else 0),
                 s=ac, sw=6)
    o += _pa("M 84 88 q 8 -22 16 -8 q 8 -20 16 2", s=lt, sw=5, op=.9)
    return o


def gourd(dk, lt, ac):
    return (_e(100, 132, 32, 30, dk) + _e(100, 90, 20, 19, dk)
            + _r(94, 58, 12, 16, mix(dk, "#000000", .35), 3)
            + _r(80, 104, 40, 7, ac, 3, .9)
            + _e(88, 124, 9, 12, lt, .35, -18))


def bell(dk, lt, ac):
    return (_pa("M 68 146 q 4 -66 32 -74 q 28 8 32 74 Z", f=dk)
            + _r(64, 142, 72, 11, ac, 4)
            + _r(96, 58, 8, 16, dk, 3)
            + _pa("M 94 62 a 6 6 0 0 1 12 0", s=ac, sw=4)
            + _r(80, 112, 40, 4, lt, 2, .5))


def coin(dk, lt, ac):
    return ('<circle cx="100" cy="104" r="44" fill="%s"/>'
            '<circle cx="100" cy="104" r="44" fill="none" stroke="%s" stroke-width="4"/>'
            % (dk, ac) + _r(86, 90, 28, 28, "#0B1512", 2)
            + "".join(_r(100 + dx - 5, 104 + dy - 5, 10, 10, lt, 1, .55)
                      for dx, dy in ((-30, 0), (30, 0), (0, -30), (0, 30))))


def core(dk, lt, ac):
    return (_pg([(100, 56), (136, 88), (128, 138), (72, 138), (64, 88)], dk)
            + _pg([(100, 56), (136, 88), (100, 104)], lt, .30)
            + _e(100, 104, 17, 17, ac, .95))


def feather(dk, lt, ac):
    return (_pa("M 100 52 q 34 40 22 74 q -22 24 -44 0 q -12 -34 22 -74 Z", f=dk)
            + _pa("M 100 56 v 96", s=lt, sw=3.4, op=.8)
            + "".join(_pa("M 100 %.1f l %.1f %.1f" % (76 + i * 16, sgn * 16, 10),
                          s=lt, sw=2.2, op=.45)
                      for i in range(4) for sgn in (-1, 1)))


def horn(dk, lt, ac):
    return (_pa("M 72 152 q -6 -66 40 -98 q 16 16 8 40 q -18 30 -24 58 Z", f=dk)
            + "".join(_pa("M %.1f %.1f q 14 4 18 12"
                          % (74 + i * 3, 132 - i * 20), s=ac, sw=3, op=.6)
                      for i in range(4)))


def fang(dk, lt, ac):
    return (_pa("M 84 56 h 32 q -4 60 -16 96 q -12 -36 -16 -96 Z", f=dk)
            + _r(82, 56, 36, 9, ac, 3) + _pa("M 100 70 v 62", s=lt, sw=2.6, op=.5))


def scale(dk, lt, ac):
    o = ""
    for row in range(3):
        for k in range(3 - row):
            x = 100 + (k - (2 - row) / 2.0) * 30
            o += _pa("M %.1f %.1f a 15 16 0 0 1 30 0 q -15 22 -30 0 Z"
                     % (x - 15, 82 + row * 24), f=dk if (row + k) % 2 else
                     mix(dk, "#FFFFFF", .16))
    return o


def hide(dk, lt, ac):
    return (_pa("M 62 70 q 24 -14 38 4 q 14 -18 38 -4 q 10 34 -6 54 q 6 26 -10 34 "
                "q -22 8 -44 0 q -16 -8 -10 -34 q -16 -20 -6 -54 Z", f=dk)
            + _pa("M 84 96 q 16 10 32 0", s=lt, sw=3, op=.45)
            + _pa("M 80 122 q 20 12 40 0", s=lt, sw=3, op=.45))


def bone(dk, lt, ac):
    return (_r(92, 72, 16, 66, dk, 6)
            + "".join(_e(100 + dx, y, 13, 12, dk)
                      for y in (70, 140) for dx in (-11, 11))
            + _r(96, 86, 8, 38, lt, 4, .35))


def herb(dk, lt, ac):
    o = _pa("M 100 152 q -4 -46 0 -70", s=dk, sw=6)
    for i, (sgn, y, w) in enumerate(((-1, 96, 30), (1, 108, 26), (-1, 122, 22))):
        o += _pa("M 100 %.1f q %.1f -14 %.1f 2 q -%.1f 14 -%.1f -2 Z"
                 % (y, sgn * w, sgn * w * 1.2, sgn * w * .5, sgn * w * 1.2), f=dk)
    o += _e(100, 74, 12, 12, ac, .9)
    return o


def silk(dk, lt, ac):
    o = _pa("M 66 96 q 34 -26 68 0 q -34 26 -68 0 Z", f=dk)
    for k in range(3):
        o += _pa("M %.1f %.1f q 26 %.1f 52 0" % (74, 110 + k * 13, 14 - k * 2),
                 s=dk, sw=7, op=.85 - k * .15)
    return o + _e(100, 96, 9, 6, lt, .5)


def ingot(dk, lt, ac):
    return (_pa("M 62 132 q 8 -34 38 -34 h 0 q 30 0 38 34 Z", f=dk)
            + _pa("M 72 116 q 28 -18 56 0", s=lt, sw=4, op=.55)
            + _r(58, 130, 84, 12, mix(dk, "#000000", .25), 3))


def marrow(dk, lt, ac):
    return (_e(100, 106, 30, 40, dk)
            + _e(100, 106, 16, 24, ac, .9)
            + _pa("M 100 68 q -18 38 0 76 q 18 -38 0 -76 Z", f=lt, op=.35)
            + "".join(_e(100 + dx, 106 + dy, 3.2, 3.2, lt, .7)
                      for dx, dy in ((-20, -18), (22, -10), (-18, 20), (18, 22))))


def crystal(dk, lt, ac):
    return (_pg([(100, 54), (128, 84), (118, 148), (82, 148), (72, 84)], dk)
            + _pg([(100, 54), (118, 148), (100, 148)], lt, .30)
            + _pg([(100, 54), (128, 84), (100, 92)], ac, .45)
            + _pg([(64, 112), (80, 128), (74, 152), (58, 152), (52, 122)], dk, .85))


def dew(dk, lt, ac):
    return (_pa("M 100 54 q 26 42 26 62 a 26 26 0 0 1 -52 0 q 0 -20 26 -62 Z", f=dk)
            + _e(88, 112, 7, 11, lt, .45, -18)
            + _pa("M 78 128 q 22 12 44 0", s=ac, sw=4, op=.8))


def token(dk, lt, ac):
    return (_e(100, 104, 38, 38, dk)
            + '<circle cx="100" cy="104" r="38" fill="none" stroke="%s" '
              'stroke-width="3" stroke-opacity=".75"/>' % lt
            + _pg([(100, 80), (116, 104), (100, 128), (84, 104)], ac, .9)
            + _r(94, 58, 12, 14, dk, 3) + _e(100, 58, 8, 5, lt, .7))


def sealfrag(dk, lt, ac):
    return (_pa("M 62 62 h 52 l 24 26 v 52 h -76 Z", f=dk)
            + _pa("M 114 62 v 26 h 24", s=lt, sw=3, op=.6)
            + _r(76, 92, 44, 5, ac, 2, .85) + _r(76, 106, 30, 5, ac, 2, .7)
            + _r(76, 120, 38, 5, ac, 2, .55))


def mapfrag(dk, lt, ac):
    o = _pa("M 58 68 q 22 -8 42 0 q 20 8 42 0 v 74 q -22 8 -42 0 q -20 -8 -42 0 Z",
            f=mix(dk, "#FFFFFF", .5))
    o += _pa("M 100 68 v 74", s=dk, sw=2, op=.35)
    o += _pa("M 66 96 q 20 10 34 -4 q 16 -12 32 2", s=dk, sw=2.6, op=.55)
    o += _e(122, 118, 5, 5, ac) + _pa("M 118 114 l 8 8 M 126 114 l -8 8", s=ac, sw=2.4)
    return o


# ── 法器 the six gear slots ────────────────────────────────────────────────────

def crown(dk, lt, ac):
    return (_pa("M 62 130 l 8 -46 l 22 24 l 8 -40 l 8 40 l 22 -24 l 8 46 Z", f=dk)
            + _r(58, 128, 84, 12, ac, 3)
            + "".join(_e(x, 84 + abs(x - 100) * .22, 5, 5, lt)
                      for x in (70, 100, 130)))


def robe(dk, lt, ac):
    return (_pa("M 70 62 q 30 -12 60 0 l -6 22 v 58 h -48 v -58 Z", f=dk)
            + _pa("M 100 66 l -14 24 l 14 12 l 14 -12 Z", f=ac, op=.9)
            + _r(74, 118, 52, 9, ac, 3, .85)
            + _pa("M 76 84 q -12 24 -8 48 M 124 84 q 12 24 8 48", s=dk, sw=11))


def pendant(dk, lt, ac):
    return (_pa("M 76 58 q 24 16 48 0", s=dk, sw=4, op=.8)
            + _e(100, 108, 26, 30, dk)
            + _e(100, 108, 12, 15, ac, .95)
            + _pg([(100, 140), (110, 156), (100, 168), (90, 156)], dk)
            + _e(100, 74, 8, 6, lt, .6))


def boots(dk, lt, ac):
    return (_pa("M 78 62 h 28 v 56 q 22 4 26 22 v 10 h -54 Z", f=dk)
            + _r(72, 144, 60, 12, ac, 3)
            + _r(80, 84, 24, 6, lt, 2, .5) + _r(80, 100, 24, 6, lt, 2, .4))


def ring(dk, lt, ac):
    return ('<circle cx="100" cy="112" r="34" fill="none" stroke="%s" '
            'stroke-width="14"/>' % dk
            + '<circle cx="100" cy="112" r="34" fill="none" stroke="%s" '
              'stroke-width="3" stroke-opacity=".5"/>' % lt
            + _pg([(100, 56), (116, 76), (100, 92), (84, 76)], ac))


def vessel(dk, lt, ac):
    return (_pa("M 72 92 q 28 -12 56 0 q 6 40 -10 52 h -36 q -16 -12 -10 -52 Z", f=dk)
            + _r(68, 84, 64, 10, ac, 3)
            + _r(94, 62, 12, 22, dk, 3) + _e(100, 60, 10, 6, ac)
            + _pa("M 86 112 q 14 8 28 0", s=lt, sw=3.4, op=.55))


# 材 what a beast leaves behind
MATERIALS = [("fang", "牙", "Fang", fang, 1), ("horn", "角", "Horn", horn, 1),
             ("hide", "皮", "Hide", hide, 0), ("scale", "鱗", "Scale", scale, 3),
             ("bone", "骨", "Bone", bone, 1), ("silk", "絲", "Spirit Silk", silk, 2),
             ("feather", "羽", "Plume", feather, 2), ("core", "核", "Demon Core", core, 3)]

# 精 what refining turns them into
REFINED = [("ingot", "錠", "Spirit Ingot", ingot, 2),
           ("crystal", "晶", "Qi Crystal", crystal, 3),
           ("marrow", "髓", "Beast Marrow", marrow, 4),
           ("stone", "靈石", "Spirit Stone", stone, 1)]

# 用 what is consumed
CONSUMABLE = [("pill", "丹", "Foundation Pill", pill, 3),
              ("herb", "草", "Cloud Herb", herb, 0),
              ("dew", "露", "Dawn Dew", dew, 2),
              ("gourd", "葫", "Spirit Gourd", gourd, 2)]

# 契 what a task is made of
QUEST = [("token", "玉", "Jade Token", token, 2),
         ("sealfrag", "印", "Seal Fragment", sealfrag, 4),
         ("mapfrag", "圖", "Map Fragment", mapfrag, 3),
         ("scroll", "卷", "Art Scroll", scroll, 3),
         ("talisman", "符", "Ward Talisman", talisman, 2),
         ("coin", "幣", "Sect Coin", coin, 0)]

# 法器 the six slots
GEAR = [("crown", "冠", "Crown", crown, 4), ("robe", "袍", "Robe", robe, 3),
        ("pendant", "佩", "Pendant", pendant, 3), ("boots", "靴", "Boots", boots, 2),
        ("ring", "環", "Ring", ring, 4), ("vessel", "器", "Vessel", vessel, 1)]

GROUPS = [("材", "Materials", "what a beast leaves behind", MATERIALS),
          ("精", "Refined", "what the cauldron turns them into", REFINED),
          ("用", "Consumables", "what is spent", CONSUMABLE),
          ("契", "Quest items", "what a task is made of", QUEST),
          ("法器", "Gear", "the six slots", GEAR)]

ITEMS = MATERIALS + REFINED + CONSUMABLE + QUEST + GEAR


def tile(key, size=150, tier=None):
    """One item on one rarity tile. `tier` overrides the table, so the same mark can be
    shown across the 五階 ladder — which is the whole point of carrying rank in the frame."""
    name, ch, en, fn, t0 = next(i for i in ITEMS if i[0] == key)
    tier = t0 if tier is None else tier
    uid = "%s%d" % (key, tier)
    tch, ten, deep, light = TIERS[tier]
    dk = mix(light, "#0B1512", .35)
    lt = mix(light, "#FFFFFF", .35)
    ac = light
    glow = ('<defs><radialGradient id="it%s"><stop offset="0" stop-color="%s" '
            'stop-opacity=".22"/><stop offset="1" stop-color="%s" stop-opacity="0"/>'
            '</radialGradient></defs>'
            '<rect x="0" y="0" width="200" height="200" rx="4" fill="#0A1512"/>'
            '<rect x="0" y="0" width="200" height="200" rx="4" fill="url(#it%s)"/>'
            '<rect x="1.5" y="1.5" width="197" height="197" rx="4" fill="none" '
            'stroke="%s" stroke-width="3"/>' % (uid, light, light, uid, deep))
    for cx, cy in ((11, 11), (189, 11), (11, 189), (189, 189)):
        glow += _pg([(cx - 7, cy), (cx, cy - 7), (cx + 7, cy), (cx, cy + 7)], light)
    glow += ('<text x="182" y="192" text-anchor="end" font-family="Noto Serif SC,serif" '
             'font-size="17" font-weight="500" fill="%s" fill-opacity=".85">%s</text>'
             % (light, tch))
    return ('<svg viewBox="0 0 200 200" width="%d" height="%d" '
            'xmlns="http://www.w3.org/2000/svg">%s%s</svg>'
            % (size, size, glow, fn(dk, lt, ac)))
