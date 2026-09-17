"""器藝 Gear and material icons, and the 鍊 enchant aura.

Two things are built here.

**Eighteen gear icons, not six.** A slot base (crown, robe, pendant, boots, ring, vessel)
carries the beast's motif as a crest, and takes the beast's 相 phase as its accent colour.
So the crane crown and the qilin crown are two drawings that are obviously the same slot,
which is the whole point: the player must be able to tell them apart at a glance AND know
instantly that both go on the head.

**The aura, in nine bands.** 鍊 runs 0→45 and the aura steps every five: band = ⌈鍊/5⌉,
so 0→9. That is the same nine as 九重 the realms and 九層 the layers, and it uses the same
escalating vocabulary as the cultivator's realm aura — halo, motes, ring, column, spokes,
bolts. One visual grammar the player learns once and then reads everywhere.
"""
import math
import items as I
import motifs as M
import forge as F

PHASE_COL = {"木": ("#2E8F68", "#8FD9A0"), "火": ("#A43A26", "#F0906A"),
             "土": ("#A07420", "#F2CE72"), "金": ("#6E7A86", "#DCE6EE"),
             "水": ("#32509A", "#8FB4F0")}

# ── 六位 the mounts ──────────────────────────────────────────────────────────
# The first attempt used the full slot object (a whole crown, a whole robe) and hung the
# beast motif on it as a crest. It failed, and visibly: at icon size the object filled the
# tile and the motif shrank to a scratch, so three pendants were three identical pendants.
# The hierarchy is inverted here. A slot is now a MOUNT — a band, a collar, a cord, a cuff,
# a hoop, a lid — minimal, readable by its silhouette alone, and the beast motif is the
# body of the thing. Slot from the mount, origin from the motif, tier from the frame,
# phase from the colour. Four readings, none of them competing for the same pixels.

def m_crown(dk, lt, ac):
    return (I._pa("M 52 150 q 48 -16 96 0 l -5 15 q -43 -12 -86 0 Z", f=dk)
            + I._r(54, 146, 92, 6, ac, 3, .9)
            + "".join(I._pg([(x-7, 148), (x, 132), (x+7, 148)], ac, .85)
                      for x in (70, 100, 130)))


def m_robe(dk, lt, ac):
    # An outline, not a mass. The filled version read as a hill and swallowed the beast.
    return (I._pa("M 48 178 v -44 q 0 -26 12 -36 q 10 -8 26 -12 l 14 16 l 14 -16 q 16 4 26 12 q 12 10 12 36 v 44", s=dk, sw=7)
            + I._pa("M 86 86 l 14 16 l 14 -16", s=ac, sw=4.5)
            + I._r(46, 152, 108, 8, ac, 3, .8)
            + I._pa("M 48 178 h 104", s=dk, sw=7))


def m_pendant(dk, lt, ac):
    return (I._pa("M 62 46 q 38 30 76 0", s=dk, sw=6, op=.9)
            + I._pa("M 62 46 q 38 30 76 0", s=ac, sw=2.2, op=.55)
            + '<circle cx="100" cy="66" r="7.5" fill="none" stroke="%s" stroke-width="4"/>' % ac
            + I._pg([(100, 168), (108, 180), (100, 190), (92, 180)], ac, .8))


def m_boots(dk, lt, ac):
    # Cuff above, foot below, nothing in between — the boot is read from the negative
    # space, which leaves the middle of the tile free for the beast.
    return (I._r(66, 50, 68, 15, dk, 5) + I._r(68, 52, 64, 5, ac, 2.5, .7)
            + I._pa("M 72 138 v 30 q 0 9 10 9 h 58 q 10 0 10 -10 q 0 -10 -12 -14 l -30 -11",
                    s=dk, sw=7)
            + I._pa("M 72 178 h 78", s=ac, sw=5, op=.85))


def m_ring(dk, lt, ac):
    return ('<circle cx="100" cy="106" r="62" fill="none" stroke="%s" stroke-width="11"/>'
            '<circle cx="100" cy="106" r="62" fill="none" stroke="%s" stroke-width="2.4" '
            'stroke-opacity=".45"/>' % (dk, lt)
            + "".join(I._pg([(100+58*c-6*sn, 106+58*sn+6*c), (100+72*c, 106+72*sn),
                             (100+58*c+6*sn, 106+58*sn-6*c)], ac, .85)
                      for c, sn in ((0, -1), (0, 1), (-1, 0), (1, 0))))


def m_vessel(dk, lt, ac):
    # A lid and an open bowl. The bowl is a U so the motif sits IN the vessel rather than
    # on top of it, which is what a vessel is for.
    return (I._r(56, 44, 88, 13, dk, 4) + I._r(58, 46, 84, 5, ac, 2.5, .7)
            + I._r(92, 28, 16, 18, dk, 4) + I._e(100, 28, 12, 6, ac, .85)
            + I._pa("M 62 120 q 4 48 38 54 q 34 -6 38 -54", s=dk, sw=7)
            + I._pa("M 72 158 q 28 10 56 0", s=ac, sw=4, op=.7))


MOUNT = {"crown": m_crown, "robe": m_robe, "pendant": m_pendant,
         "boots": m_boots, "ring": m_ring, "vessel": m_vessel}

# where the beast's motif sits inside each mount, and how big. The motif is now the body.
ANCHOR = {"crown": (100, 92, 1.00), "robe": (100, 124, .80), "pendant": (100, 118, .92),
          "boots": (100, 104, .90), "ring": (100, 106, .86), "vessel": (100, 118, .78)}

BEAST_OF = {}   # (slot, beast) -> (ground, phase)
for _slot, _rows in F.ORIGIN.items():
    for _b, _g, _p in _rows:
        BEAST_OF[(_slot, _b)] = (_g, _p)


def band(r):
    """鍊 0→45 in nine steps of five. Nothing at 鍊0; band 9 is the end of the bar."""
    return min(9, (r + 4) // 5)


def aura(level, uid, col, cx=100, cy=104):
    """Returns (under, over): what goes behind the mark and what goes in front of it.
    Cumulative — band 7 still has band 3's halo, or the ladder would not read as a ladder."""
    if level <= 0:
        return "", ""
    u, o = [], []
    t = level / 9.0

    # 1 — an inner glow. The cheapest possible "this is not ordinary".
    u.append('<defs><radialGradient id="au%s"><stop offset="0" stop-color="%s" '
             'stop-opacity="%.2f"/><stop offset=".62" stop-color="%s" stop-opacity="%.2f"/>'
             '<stop offset="1" stop-color="%s" stop-opacity="0"/></radialGradient></defs>'
             '<circle cx="%d" cy="%d" r="%.0f" fill="url(#au%s)"/>'
             % (uid, col, .10 + .34 * t, col, .05 + .18 * t, col, cx, cy,
                52 + 34 * t, uid))

    # 2 — the halo ring
    if level >= 2:
        u.append('<circle cx="%d" cy="%d" r="%.0f" fill="none" stroke="%s" '
                 'stroke-width="%.1f" stroke-opacity="%.2f"/>'
                 % (cx, cy, 56 + 5 * t, col, .9 + 1.1 * t, .22 + .30 * t))

    # 3 — motes
    if level >= 3:
        n = 4 + level
        for i in range(n):
            a = 2 * math.pi * i / n - .4
            rr = 63 + 9 * math.sin(i * 2.1)
            o.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" fill-opacity="%.2f"/>'
                     % (cx + rr * math.cos(a), cy + rr * math.sin(a),
                        1.2 + 1.5 * t, col, .40 + .40 * t))

    # 4 — corner rays
    if level >= 4:
        for a in (45, 135, 225, 315):
            rad = math.radians(a)
            o.append('<path d="M %.1f %.1f L %.1f %.1f" stroke="%s" stroke-width="%.1f" '
                     'stroke-opacity="%.2f" stroke-linecap="round"/>'
                     % (cx + 60 * math.cos(rad), cy + 60 * math.sin(rad),
                        cx + (76 + 14 * t) * math.cos(rad), cy + (76 + 14 * t) * math.sin(rad),
                        col, 1.6 + 1.6 * t, .30 + .35 * t))

    # 5 — a turning ring
    if level >= 5:
        u.append('<circle cx="%d" cy="%d" r="%.0f" fill="none" stroke="%s" '
                 'stroke-width="1.4" stroke-opacity="%.2f" stroke-dasharray="5 9"/>'
                 % (cx, cy, 72 + 4 * t, col, .28 + .30 * t))

    # 6 — orbiting nodes
    if level >= 6:
        for i in range(6):
            a = 2 * math.pi * i / 6 + .5
            o.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" fill-opacity="%.2f"/>'
                     % (cx + 76 * math.cos(a), cy + 76 * math.sin(a), 2.8 + 1.4 * t,
                        col, .55 + .35 * t))

    # 7 — a rising column
    if level >= 7:
        u.append('<defs><linearGradient id="ac%s" x1="0" x2="1" y1="0" y2="0">'
                 '<stop offset="0" stop-color="%s" stop-opacity="0"/>'
                 '<stop offset=".5" stop-color="%s" stop-opacity="%.2f"/>'
                 '<stop offset="1" stop-color="%s" stop-opacity="0"/></linearGradient></defs>'
                 '<rect x="%d" y="0" width="%d" height="200" fill="url(#ac%s)"/>'
                 % (uid, col, col, .10 + .16 * t, col, cx - 34, 68, uid))

    # 8 — radiating spokes
    if level >= 8:
        for i in range(12):
            a = 2 * math.pi * i / 12
            o.append('<path d="M %.1f %.1f L %.1f %.1f" stroke="%s" stroke-width="1.1" '
                     'stroke-opacity="%.2f"/>'
                     % (cx + 84 * math.cos(a), cy + 84 * math.sin(a),
                        cx + 96 * math.cos(a), cy + 96 * math.sin(a), col, .22 + .28 * t))

    # 9 — 九雷 the bolts, and the vortex. The end of the bar should look like the end.
    if level >= 9:
        for i in range(9):
            a = 2 * math.pi * i / 9 + .2
            x0, y0 = cx + 46 * math.cos(a), cy + 46 * math.sin(a)
            x1, y1 = cx + 70 * math.cos(a + .17), cy + 70 * math.sin(a + .17)
            x2, y2 = cx + 92 * math.cos(a - .09), cy + 92 * math.sin(a - .09)
            o.append('<path d="M %.1f %.1f L %.1f %.1f L %.1f %.1f" stroke="%s" '
                     'stroke-width="1.8" stroke-opacity=".62" fill="none" '
                     'stroke-linecap="round"/>' % (x0, y0, x1, y1, x2, y2, col))
        o.append('<circle cx="%d" cy="%d" r="88" fill="none" stroke="%s" stroke-width="2.4" '
                 'stroke-opacity=".34" stroke-dasharray="26 16"/>' % (cx, cy, col))
    return "".join(u), "".join(o)


def _badge(level, r, col):
    """The +N. It is the number the player will actually say out loud, so it is legible
    before it is pretty: heavy, top-left, on its own plate."""
    if r <= 0:
        return ""
    w = 30 if r < 10 else 40
    return ('<rect x="9" y="9" width="%d" height="21" rx="2.5" fill="#050D0B" '
            'fill-opacity=".82"/>'
            '<rect x="9.5" y="9.5" width="%d" height="20" rx="2.5" fill="none" stroke="%s" '
            'stroke-width="1.3" stroke-opacity="%.2f"/>'
            '<text x="%.1f" y="24.5" text-anchor="middle" font-family="Noto Sans SC,sans-serif" '
            'font-size="13" font-weight="500" fill="%s">+%d</text>'
            % (w, w - 1, col, .45 + .055 * level, 9 + w / 2.0, col, r))


def frame(tier, uid):
    tch, ten, deep, light = I.TIERS[tier]
    out = ('<defs><radialGradient id="tg%s"><stop offset="0" stop-color="%s" '
           'stop-opacity=".18"/><stop offset="1" stop-color="%s" stop-opacity="0"/>'
           '</radialGradient></defs>'
           '<rect x="0" y="0" width="200" height="200" rx="4" fill="#0A1512"/>'
           '<rect x="0" y="0" width="200" height="200" rx="4" fill="url(#tg%s)"/>'
           % (uid, light, light, uid))
    return out, light, deep, tch


def rim(tier):
    tch, ten, deep, light = I.TIERS[tier]
    out = ('<rect x="1.5" y="1.5" width="197" height="197" rx="4" fill="none" stroke="%s" '
           'stroke-width="3"/>' % deep)
    for cx, cy in ((11, 11), (189, 11), (11, 189), (189, 189)):
        out += ('<polygon points="%.0f,%.0f %.0f,%.0f %.0f,%.0f %.0f,%.0f" fill="%s"/>'
                % (cx-7, cy, cx, cy-7, cx+7, cy, cx, cy+7, light))
    out += ('<text x="182" y="192" text-anchor="end" font-family="Noto Serif SC,serif" '
            'font-size="17" font-weight="500" fill="%s" fill-opacity=".85">%s</text>'
            % (light, tch))
    return out


def gear(slot, beast, tier=2, r=0, size=200):
    """One of the eighteen. Slot base + beast motif + phase accent + 鍊 aura + tier frame."""
    ground, phase = BEAST_OF[(slot, beast)]
    deep, light = PHASE_COL[phase]
    dk, lt, ac = I.mix(light, "#0B1512", .38), I.mix(light, "#FFFFFF", .40), light
    uid = "%s%s%d%d" % (slot, beast, tier, r)
    lvl = band(r)
    under, over = aura(lvl, uid, light)
    f, tlight, tdeep, tch = frame(tier, uid)
    x, y, s = ANCHOR[slot]
    return ('<svg viewBox="0 0 200 200" width="%d" height="%d" '
            'xmlns="http://www.w3.org/2000/svg">%s%s%s%s%s%s%s</svg>'
            % (size, size, f, under, MOUNT[slot](dk, lt, ac),
               M.place(beast, x, y, s, dk, lt, ac), over, rim(tier),
               _badge(lvl, r, light)))


def material(beast, tier=1, size=200):
    """The beast's own material. Same motif, no slot base, on a low plinth so a bag of
    materials never reads as a bag of equipment."""
    slot = next(s for (s, b) in BEAST_OF if b == beast)
    ground, phase = BEAST_OF[(slot, beast)]
    deep, light = PHASE_COL[phase]
    dk, lt, ac = I.mix(light, "#0B1512", .38), I.mix(light, "#FFFFFF", .40), light
    uid = "m%s%d" % (beast, tier)
    f, tlight, tdeep, tch = frame(tier, uid)
    plinth = (I._e(100, 152, 40, 9, dk, .85)
              + I._r(76, 143, 48, 7, ac, 3, .55))
    return ('<svg viewBox="0 0 200 200" width="%d" height="%d" '
            'xmlns="http://www.w3.org/2000/svg">%s%s%s%s</svg>'
            % (size, size, f, plinth,
               M.place(beast, 100, 98, .95, dk, lt, ac), rim(tier)))
