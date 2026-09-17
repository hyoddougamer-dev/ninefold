"""The two roads, as policies.

One design fact is settled here rather than left implicit, because the simulator forces
the question: **layers open by themselves as qi crosses the threshold, online or closed.**
If a layer needed a tap, the once-a-day player would bank qi unspent and lose the
compounding, and §3's promise — *a player who only ever opens the app once a day still
reaches the ninth realm* — would be false by construction. §13 already lists "offline
progress paying identically in one step or many" as measured and settled; this is the same
rule seen from the other side.
"""
from . import rules as R
from .economy import Cultivator
from . import hunting as H
from .hunting import Day


def run(costs, days=400, hunts_per_day=0, K=R.HUNT_K, unit_yield=R.ASSUMED_UNITS_PER_HUNT,
        haul_mult=1.0, base_rate=1.0, insight_per_kill=0.0, insight_decays=True):
    """Simulate one player. Event-driven: time advances to the next thing that happens.

    `hunts_per_day = 0` is the 靜 Stillness road — the road the cost table is balanced
    against. Anything above 0 is 動 Motion, spending qi that would have become a realm.
    """
    c = Cultivator(costs, base_rate)
    day_units, total_units, hunts_taken = [], 0.0, 0
    arrivals = {}

    for d in range(days):
        t0 = d * R.DAY
        bag = Day(K, unit_yield, haul_mult)

        # 動 the hunts, spread evenly through the day so each one is paid for by the qi
        # gathered since the last — a player cannot hunt at dawn on a day's worth of qi.
        slots = hunts_per_day
        elapsed = 0.0
        step = R.DAY / (slots + 1) if slots else 0.0
        for i in range(slots):
            _advance(c, step, t0 + elapsed, arrivals)
            elapsed += step          # `_advance` returns the span it covered, not the
            got = bag.take(c)        # running total — assigning here gave hunting players
            if got is not None:      # ~78% of a bonus day and made hunting ACCELERATE
                hunts_taken += 1
                # 悟 insight, the loop that makes an active player permanently faster.
                # Whether it decays with the day's hunt count is the single biggest lever
                # between the three hunt designs, so it is a parameter, not a constant.
                c.channels.earn(insight_per_kill *
                                (H.haul_factor(bag.n, K) if insight_decays else 1.0))
                c.channels.spend()
        _advance(c, R.DAY - elapsed, t0 + elapsed, arrivals)

        day_units.append(bag.units)
        total_units += bag.units
        if c.reached9 and 9 not in arrivals:
            arrivals[9] = d + 1
        if c.capped:
            break

    for t, kind, detail in c.log:
        if kind == "realm":
            arrivals.setdefault(detail, int(t // R.DAY) + 1)
    return {"cultivator": c, "arrivals": arrivals, "units": total_units,
            "day_units": day_units, "hunts": hunts_taken,
            "days": (arrivals.get(9) or days), "reached9": c.reached9,
            "channels": c.channels.opened, "insight": c.channels.insight,
            "capped_day": (int(c.log[-1][0] // R.DAY) + 1) if c.capped else None}


def _advance(c, seconds, t, arrivals):
    """Gather for `seconds`, opening every layer the qi crosses on the way. Exact: it
    steps to each threshold rather than ticking, so no fixed-step error accumulates."""
    left = seconds
    while left > 0:
        dt = c.seconds_to_next_layer()
        if dt > left:
            c.gather(left)
            break
        c.gather(dt)
        t += dt
        left -= dt
        for _t, kind, detail in c.open_layers(t):
            if kind == "realm":
                arrivals.setdefault(detail, int(t // R.DAY) + 1)
        if c.capped:
            break
    return seconds


def gaps(arrivals):
    """Days spent in each realm→realm gap, and which one swallowed the run."""
    out, prev = {}, 0
    for r in range(2, R.MAX_REALM + 1):
        if r not in arrivals:
            break
        out[r] = arrivals[r] - prev
        prev = arrivals[r]
    return out


def worst_gap_share(arrivals):
    g = gaps(arrivals)
    if not g:
        return 1.0, None
    total = sum(g.values())
    r = max(g, key=g.get)
    return g[r] / total, r
