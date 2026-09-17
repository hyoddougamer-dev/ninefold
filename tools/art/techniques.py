"""法 One figure, five techniques.

The silhouette failed three times as filled vector curves. Rather than try a fourth,
this draws the SAME seated figure — one shared profile, so the comparison is honest —
five different ways. The technique is the variable; the body is not.

    影 vector      filled curves. What failed. Here as the control.
    墨 ink         tapered brush strokes with a dry edge. Suggestive, not precise —
                   which means an imprecise shape reads as gesture instead of as error.
    剪 papercut    one hard symmetric shape with holes cut in it. The negative space
                   carries the form, so the outline does not have to.
    線 contour     the body described by horizontal bars. No outline at all to get wrong.
    塵 particle    the body as qi: dots, dense at the edge. Nothing to deform.
"""
import math, random

LACQUER = "#05100D"
PHASE = {1: ("#3E7A4C", "#8FD9A0"), 5: ("#A07420", "#F2CE72"), 9: ("#32509A", "#8FB4F0")}
NAMES = {1: ("練氣", "Qi Refining"), 5: ("化神", "Spirit Severing"),
         9: ("渡劫", "Tribulation")}


def _mix(a, b, k):
    a, b = a.lstrip("#"), b.lstrip("#")
    return "#%02X%02X%02X" % tuple(
        int(round(int(a[i:i+2], 16) * (1 - k) + int(b[i:i+2], 16) * k)) for i in (0, 2, 4))


# ── 形 the shared body: a seated cultivator, as a half-profile ────────────────

def spine(t):
    """(y, half_width) down the figure. Everything below reads from this, so all five
    techniques are the same person."""
    sh, lap = 33.0 + 5.0 * t, 50.0 + 9.0 * t
    return [(100, 12.0), (109, sh * .80), (119, sh), (142, sh * .95), (170, sh * .92),
            (198, lap * .72), (224, lap * .88), (246, lap), (258, lap * .93),
            (264, lap * .76)]


def width_at(y, t):
    sp = spine(t)
    if y <= sp[0][0]:
        return sp[0][1]
    for i in range(len(sp) - 1):
        y0, w0 = sp[i]
        y1, w1 = sp[i + 1]
        if y0 <= y <= y1:
            u = (y - y0) / (y1 - y0)
            u = u * u * (3 - 2 * u)                 # smoothstep, so the bars do not jump
            return w0 + (w1 - w0) * u
    return 0.0


def head(t):
    return (100.0, 72.0, 15.5, 18.0)


def _cr(pts):
    n = len(pts)
    d = "M %.2f %.2f" % pts[0]
    for i in range(n):
        p0, p1, p2, p3 = pts[(i-1) % n], pts[i], pts[(i+1) % n], pts[(i+2) % n]
        d += " C %.2f %.2f %.2f %.2f %.2f %.2f" % (
            p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6,
            p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6, p2[0], p2[1])
    return d + " Z"


def mass(profile, cx=100.0):
    right = [(cx + w, y) for y, w in profile]
    left = [(cx - w, y) for y, w in reversed(profile)]
    return _cr(right + left)


def stroke(pts, cx=100.0):
    """A brush stroke: (x, y, half_width) down its length, closed and tapered."""
    n = len(pts)
    r, l = [], []
    for i, (x, y, w) in enumerate(pts):
        a, b = pts[max(i-1, 0)], pts[min(i+1, n-1)]
        tx, ty = b[0]-a[0], b[1]-a[1]
        L = math.hypot(tx, ty) or 1.0
        nx, ny = ty/L, -tx/L
        r.append((x + nx*w, y + ny*w))
        l.append((x - nx*w, y - ny*w))
    return _cr(r + list(reversed(l)))


def _svg(w, h, inner):
    return ('<svg viewBox="0 0 200 300" width="%d" height="%d" '
            'xmlns="http://www.w3.org/2000/svg">%s</svg>' % (w, h, inner))


def _aura(uid, light, t, cy=180):
    return ('<defs><radialGradient id="au%s"><stop offset="0" stop-color="%s" '
            'stop-opacity=".26"/><stop offset="1" stop-color="%s" stop-opacity="0"/>'
            '</radialGradient></defs>'
            '<ellipse cx="100" cy="%d" rx="%.0f" ry="%.0f" fill="url(#au%s)"/>'
            % (uid, light, light, cy, 78 + 24*t, 96 + 20*t, uid))


def _rank(light, t, level):
    """氣象 What gathers around the figure.

    The body barely changes across the nine realms, on purpose: a cultivator is still a
    person at the ninth. Everything that says "this one is further along" happens in the
    air around them, and it arrives in fixed steps so a player can read their own rank
    from across the room.

        3  halo                6  orbit ring with nodes
        4  motes               7  second halo, a rising column
        5  lotus seat          8  radiating spokes
                               9  九雷 nine bolts of tribulation, and a vortex
    """
    import math as _m
    import random as _r
    o = ""
    if level >= 3:
        o += ('<circle cx="100" cy="72" r="%.1f" fill="none" stroke="%s" '
              'stroke-width="1.4" stroke-opacity=".85"/>' % (30 + 5*t, light))
    if level >= 7:
        o += ('<circle cx="100" cy="72" r="%.1f" fill="none" stroke="%s" '
              'stroke-width=".8" stroke-opacity=".5"/>' % (45 + 6*t, light))
    if level >= 5:
        for k, (dx, ry_, rx_) in enumerate(((0, 10.5, (50+9*t)*1.08),
                                            (-(50+9*t)*.72, 7.5, (50+9*t)*.46),
                                            ((50+9*t)*.72, 7.5, (50+9*t)*.46))):
            o += ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" '
                  'fill-opacity="%.2f"/>' % (100+dx, 266-k*2, rx_, ry_, light,
                                             .5 if k else .7))

    # 4+ 塵 motes drifting in the field
    if level >= 4:
        _r.seed(level * 17)
        for i in range(8 + 7 * (level - 4)):
            a = _r.uniform(0, _m.tau)
            rad = _r.uniform(.45, 1.0) ** .55
            o += ('<circle cx="%.1f" cy="%.1f" r="%.2f" fill="%s" fill-opacity="%.2f"/>'
                  % (100 + _m.cos(a) * rad * (78 + 20*t),
                     176 - _m.sin(a) * rad * (92 + 16*t) * .92,
                     _r.uniform(.8, 2.3), light, _r.uniform(.35, .85)))

    # 6+ 環 an orbit ring, tilted, with nodes on it
    if level >= 6:
        o += ('<ellipse cx="100" cy="188" rx="%.1f" ry="%.1f" fill="none" stroke="%s" '
              'stroke-width="1.1" stroke-opacity=".55"/>' % (84 + 10*t, 22 + 4*t, light))
        for i in range(6):
            a = i * _m.tau / 6
            o += ('<circle cx="%.1f" cy="%.1f" r="2.8" fill="%s" fill-opacity=".85"/>'
                  % (100 + _m.cos(a) * (84 + 10*t), 188 + _m.sin(a) * (22 + 4*t), light))

    # 7+ 柱 a column of light rising through the figure
    if level >= 7:
        w = 30 + 8 * t
        o += ('<defs><linearGradient id="col%d" x1="0" y1="0" x2="1" y2="0">'
              '<stop offset="0" stop-color="%s" stop-opacity="0"/>'
              '<stop offset=".5" stop-color="%s" stop-opacity=".16"/>'
              '<stop offset="1" stop-color="%s" stop-opacity="0"/></linearGradient>'
              '</defs>' % (level, light, light, light))
        o += ('<rect x="%.1f" y="14" width="%.1f" height="256" fill="url(#col%d)"/>'
              % (100 - w, w * 2, level))

    # 8+ 芒 spokes radiating from the seat
    if level >= 8:
        for i in range(16):
            a = i * _m.tau / 16
            r0, r1 = 58 + 6*t, 104 + 14*t
            o += ('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" '
                  'stroke-width="%.1f" stroke-opacity="%.2f"/>'
                  % (100 + _m.cos(a)*r0, 176 + _m.sin(a)*r0*.92,
                     100 + _m.cos(a)*r1, 176 + _m.sin(a)*r1*.92,
                     light, 2.0 if i % 2 == 0 else 1.0, .4 if i % 2 == 0 else .22))

    # 9 九雷 the nine bolts, and the vortex they come out of
    if level >= 9:
        for k in range(3):
            o += ('<ellipse cx="100" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" '
                  'stroke="%s" stroke-width="%.1f" stroke-opacity="%.2f"/>'
                  % (34 + k*9, 70 - k*16, 15 - k*3, light, 1.6 - k*.4, .55 - k*.13))
        _r.seed(909)
        for i in range(9):
            a = -_m.pi/2 + (i - 4) * .30
            x, y = 100 + _m.cos(a) * 16, 40 + _m.sin(a) * 6
            d = "M %.1f %.1f" % (x, y)
            for k in range(4):
                x += _m.cos(a) * 26 + _r.uniform(-11, 11)
                y += abs(_m.sin(a)) * 4 + 26 + _r.uniform(-5, 5)
                d += " L %.1f %.1f" % (x, y)
            o += ('<path d="%s" fill="none" stroke="%s" stroke-width="1.7" '
                  'stroke-opacity=".75" stroke-linejoin="round"/>' % (d, light))
    return o


# ── 影 vector ─────────────────────────────────────────────────────────────────

def vector(r, w=180, h=270):
    mid, light = PHASE[r]; t = (r-1)/8.0
    dark = _mix(mid, LACQUER, .12); behind = _mix(mid, LACQUER, .42)
    o = _aura("v%d" % r, light, t) + _rank(light, t, r)
    sh = 33.0 + 5.0*t
    for s in (-1, 1):
        o += '<path d="%s" fill="%s"/>' % (mass(
            [(120, 8.0), (152, 11.0), (190, 14.0), (222, 15.5), (238, 12.0)],
            cx=100 + s*(sh+3)), behind)
    o += '<path d="%s" fill="%s"/>' % (mass(spine(t)), dark)
    hx, hy, rx, ry = head(t)
    o += ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s"/>'
          '<ellipse cx="100" cy="48.5" rx="7" ry="6.2" fill="%s"/>'
          % (hx, hy, rx, ry, dark, behind))
    return _svg(w, h, o)


# ── 墨 ink ────────────────────────────────────────────────────────────────────

def ink(r, w=180, h=270):
    mid, light = PHASE[r]; t = (r-1)/8.0
    uid = "k%d" % r
    ink_c = _mix(mid, "#040A08", .52)
    o = ('<defs><filter id="dry%s" x="-14%%" y="-14%%" width="128%%" height="128%%">'
         '<feTurbulence type="fractalNoise" baseFrequency=".055 .11" numOctaves="4" '
         'seed="%d" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" '
         'scale="7" xChannelSelector="R" yChannelSelector="G"/></filter></defs>'
         % (uid, r * 11))
    o += _aura(uid, light, t) + _rank(light, t, r)
    g = '<g filter="url(#dry%s)">' % uid
    sh, lap = 33.0 + 5.0*t, 50.0 + 9.0*t
    # the body in three strokes: the trunk, then a sweep to each knee
    g += '<path d="%s" fill="%s"/>' % (stroke([
        (100, 96, 13), (100, 126, sh*.92), (100, 172, sh*.86),
        (100, 214, lap*.70), (100, 252, lap*.92)]), ink_c)
    for s in (-1, 1):
        g += '<path d="%s" fill="%s" fill-opacity=".92"/>' % (stroke([
            (100, 186, 10), (100 + s*lap*.40, 226, 15), (100 + s*lap*.80, 252, 9)]), ink_c)
        g += '<path d="%s" fill="%s" fill-opacity=".8"/>' % (stroke([
            (100 + s*(sh*.7), 118, 7), (100 + s*(sh+4), 176, 11),
            (100 + s*(sh+2), 232, 6)]), _mix(ink_c, LACQUER, .22))
    g += '<ellipse cx="100" cy="73" rx="15" ry="17" fill="%s"/>' % ink_c
    g += '<ellipse cx="100" cy="49" rx="6.6" ry="5.8" fill="%s"/>' % ink_c
    g += '</g>'
    o += g
    o += ('<rect x="88" y="48" width="24" height="2.2" rx="1" fill="%s" '
          'fill-opacity=".9"/>' % light)
    return _svg(w, h, o)


# ── 剪 papercut ───────────────────────────────────────────────────────────────

def papercut(r, w=180, h=270):
    mid, light = PHASE[r]; t = (r-1)/8.0
    paper = _mix(light, mid, .32)
    sh, lap = 33.0 + 5.0*t, 50.0 + 9.0*t
    body = mass(spine(t))
    holes = ""
    # the cuts ARE the drawing: a collar slot, two sleeve slots, knee moons, a lap band
    holes += ('M %.1f 116 a 9 9 0 0 1 %.1f 0 a 9 9 0 0 1 -%.1f 0 Z'
              % (100 - 9, 18, 18))
    for s in (-1, 1):
        holes += (' M %.1f 140 q %.1f 26 %.1f 56 q -%.1f 4 -%.1f 2 q -%.1f -28 -%.1f -54 Z'
                  % (100 + s*(sh*.52), s*5, s*7, s*7, s*7, s*4, s*5)).replace("--", "")
        holes += (' M %.1f 238 a 11 8 0 0 1 22 0 a 11 8 0 0 1 -22 0 Z'
                  % (100 + s*lap*.56 - 11))
    holes += ' M 74 256 h 52 v 5 h -52 Z'
    o = _aura("p%d" % r, light, t) + _rank(light, t, r)
    o += ('<path d="%s %s" fill="%s" fill-rule="evenodd"/>' % (body, holes, paper))
    hx, hy, rx, ry = head(t)
    o += ('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s"/>'
          % (hx, hy, rx, ry, paper))
    o += ('<ellipse cx="100" cy="72" rx="7" ry="8.5" fill="%s"/>' % LACQUER)
    o += '<ellipse cx="100" cy="48.5" rx="7" ry="6.2" fill="%s"/>' % paper
    return _svg(w, h, o)


# ── 線 contour ────────────────────────────────────────────────────────────────

def contour(r, w=180, h=270):
    mid, light = PHASE[r]; t = (r-1)/8.0
    o = _aura("c%d" % r, light, t) + _rank(light, t, r)
    # 肩 a heavier bar on the shoulder line: without one, even a contour figure has no
    # place for the eye to land
    o += ('<rect x="%.1f" y="118" width="%.1f" height="4.4" rx="2.2" fill="%s" '
          'fill-opacity=".95"/>' % (100 - width_at(119, t), width_at(119, t) * 2, light))
    y = 100.0
    while y <= 264:
        hw = width_at(y, t)
        if hw > 1:
            u = (y - 100) / 164.0
            op = .30 + .55 * (1 - abs(u - .45) * 1.5)
            th = 2.2 + 2.0 * max(0.0, 1 - abs(u - .42) * 2.2)   # heavier through the body
            o += ('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%.1f" '
                  'fill="%s" fill-opacity="%.2f"/>'
                  % (100 - hw, y, hw * 2, th, th / 2, light, max(.20, min(.95, op))))
        y += 6.2
    hx, hy, rx, ry = head(t)
    for k in range(7):
        yy = hy - ry + 2 + k * (ry * 2 - 4) / 6.0
        hw = rx * math.sqrt(max(0.0, 1 - ((yy - hy) / ry) ** 2))
        o += ('<rect x="%.1f" y="%.1f" width="%.1f" height="3.1" rx="1.5" fill="%s" '
              'fill-opacity=".85"/>' % (hx - hw, yy, hw * 2, light))
    o += '<rect x="93" y="44" width="14" height="3.1" rx="1.5" fill="%s"/>' % light
    return _svg(w, h, o)


# ── 塵 particle ───────────────────────────────────────────────────────────────

def particle(r, w=180, h=270):
    mid, light = PHASE[r]; t = (r-1)/8.0
    o = _aura("d%d" % r, light, t) + _rank(light, t, r)
    random.seed(r * 31)
    hx, hy, rx, ry = head(t)
    for _ in range(620):
        y = random.uniform(100, 264)
        hw = width_at(y, t)
        if hw < 1:
            continue
        # bias toward the edge: the rim is where a body is legible
        u = random.random() ** 0.45
        x = 100 + hw * u * random.choice((-1, 1))
        rad = 1.5 if u > .84 else random.uniform(.5, 1.15)
        op = .85 if u > .84 else random.uniform(.16, .45)
        o += ('<circle cx="%.1f" cy="%.1f" r="%.2f" fill="%s" fill-opacity="%.2f"/>'
              % (x, y, rad, light, op))
    for _ in range(150):
        a = random.uniform(0, math.tau)
        u = random.random() ** .5
        o += ('<circle cx="%.1f" cy="%.1f" r="%.2f" fill="%s" fill-opacity="%.2f"/>'
              % (hx + rx * u * math.cos(a), hy + ry * u * math.sin(a),
                 1.4 if u > .8 else .8, light, .8 if u > .8 else .3))
    for _ in range(26 + int(28 * t)):                 # qi leaving the body
        a = random.uniform(0, math.tau)
        rad = random.uniform(.6, 1.0)
        o += ('<circle cx="%.1f" cy="%.1f" r="%.2f" fill="%s" fill-opacity=".6"/>'
              % (100 + math.cos(a) * rad * (86 + 22*t),
                 180 - math.sin(a) * rad * (96 + 18*t) * .9,
                 random.uniform(.8, 2.1), light))
    return _svg(w, h, o)


TECH = [("影", "VECTOR", "filled curves — the control", vector),
        ("墨", "INK", "tapered brush strokes, dry edge", ink),
        ("剪", "PAPERCUT", "one hard shape, cut through", papercut),
        ("線", "CONTOUR", "horizontal bars, no outline", contour),
        ("塵", "PARTICLE", "the body as qi", particle)]
