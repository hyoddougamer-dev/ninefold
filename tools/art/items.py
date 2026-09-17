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


def sword(dk, lt, ac):
    return (_pa("M 92 52 h 16 v 78 l -8 12 l -8 -12 Z", f=mix(dk, "#FFFFFF", .42))
            + _r(98, 56, 4, 70, lt, 2, .7)
            + _r(76, 130, 48, 9, ac, 3) + _r(94, 139, 12, 24, dk, 3)
            + _e(100, 166, 8, 6, ac))


def sabre(dk, lt, ac):
    return (_pa("M 76 150 q 8 -70 58 -96 q 10 12 4 26 q -40 24 -46 74 Z",
                f=mix(dk, "#FFFFFF", .42))
            + _pa("M 82 146 q 8 -60 50 -84", s=lt, sw=3, op=.65)
            + _r(66, 140, 34, 9, ac, 3, rot=-18) + _r(56, 146, 14, 24, dk, 3, rot=-18))


def bow(dk, lt, ac):
    return (_pa("M 122 52 q -46 52 0 104", s=dk, sw=10)
            + _pa("M 122 52 q -8 52 0 104", s=lt, sw=2.6, op=.7)
            + _r(112, 92, 12, 26, ac, 4)
            + _e(122, 52, 6, 5, ac) + _e(122, 156, 6, 5, ac))


ITEMS = [("pill", "丹", "Foundation Pill", pill, 3),
         ("stone", "靈石", "Spirit Stone", stone, 1),
         ("jade", "玉", "Jade Pendant", jade, 2),
         ("talisman", "符", "Ward Talisman", talisman, 2),
         ("scroll", "卷", "Art Scroll", scroll, 3),
         ("cauldron", "鼎", "Alchemy Cauldron", cauldron, 4),
         ("gourd", "葫", "Spirit Gourd", gourd, 2),
         ("bell", "鐘", "Soul Bell", bell, 4),
         ("coin", "幣", "Sect Coin", coin, 0),
         ("core", "核", "Demon Core", core, 3),
         ("feather", "羽", "Crane Feather", feather, 2),
         ("horn", "角", "Beast Horn", horn, 1),
         ("fang", "牙", "Tiger Fang", fang, 1),
         ("scale", "鱗", "Drake Scale", scale, 3),
         ("hide", "皮", "Boar Hide", hide, 0),
         ("bone", "骨", "Spirit Bone", bone, 1),
         ("herb", "草", "Cloud Herb", herb, 0),
         ("sword", "劍", "Straight Sword", sword, 4),
         ("sabre", "刀", "Curved Sabre", sabre, 4),
         ("bow", "弓", "Spirit Bow", bow, 3)]


def tile(key, size=150):
    name, ch, en, fn, tier = next(i for i in ITEMS if i[0] == key)
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
            'stroke="%s" stroke-width="3"/>' % (key, light, light, key, deep))
    for cx, cy in ((11, 11), (189, 11), (11, 189), (189, 189)):
        glow += _pg([(cx - 7, cy), (cx, cy - 7), (cx + 7, cy), (cx, cy + 7)], light)
    glow += ('<text x="182" y="192" text-anchor="end" font-family="Noto Serif SC,serif" '
             'font-size="17" font-weight="500" fill="%s" fill-opacity=".85">%s</text>'
             % (light, tch))
    return ('<svg viewBox="0 0 200 200" width="%d" height="%d" '
            'xmlns="http://www.w3.org/2000/svg">%s%s</svg>'
            % (size, size, glow, fn(dk, lt, ac)))
