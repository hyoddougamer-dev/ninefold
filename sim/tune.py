"""The measurements the bible lists as open and blocking (GDD §13).

Run this, read the tables, choose. It answers by measuring, never by asserting, and it
prints the advantage figures on every run so a change to K is never silent.
"""
from . import rules as R, economy as E, player as P, hunting as H

RATE_PER_REALM = R.LAYER_STEP ** R.LAYERS_PER_REALM     # 1.1951


def calibrate(growth, target_days, lo=0.01, hi=20.0, tol=0.5):
    """Find the realm-1 cost, in days of base-rate gathering, that lands an idle-only run
    on realm 9 at `target_days`. Bisection on a monotone function — no guessing."""
    for _ in range(60):
        mid = (lo + hi) / 2
        r = P.run(E.geometric_costs(mid * R.DAY, growth), days=2000)
        d = r["days"] if r["reached9"] else 10 ** 6
        if abs(d - target_days) <= tol:
            return mid, r
        if d < target_days:
            lo = mid
        else:
            hi = mid
    return mid, r


def profile(growth, target_days=70):
    first, r = calibrate(growth, target_days)
    g = P.gaps(r["arrivals"])
    share, which = P.worst_gap_share(r["arrivals"])
    return {"growth": growth, "first_days": first, "arrivals": r["arrivals"], "gaps": g,
            "share": share, "which": which, "days": r["days"], "reached9": r["reached9"]}


def novelty_by_week(costs, weeks=12):
    """Finding 2. Counts only things the player has never seen: realm arrivals, layer
    opens, grounds. Gear firsts are not simulated here — they need a hunting policy."""
    r = P.run(costs, days=weeks * 7)
    buckets = [0] * weeks
    for t, kind, detail in r["cultivator"].log:
        w = int(t // R.DAY) // 7
        if 0 <= w < weeks:
            buckets[w] += 1
    for realm, day in r["arrivals"].items():
        for ch, en, opens in R.GROUNDS:
            if opens == realm and 0 <= (day - 1) // 7 < weeks:
                buckets[(day - 1) // 7] += 1
    return buckets


def road_comparison(costs, hunts, K=R.HUNT_K, days=2000):
    """What 動 Motion costs the player in realms, and buys them in materials."""
    out = []
    for h in hunts:
        r = P.run(costs, days=days, hunts_per_day=h, K=K)
        out.append({"hunts": h, "days": r["days"], "reached9": r["reached9"],
                    "units": r["units"], "taken": r["hunts"]})
    return out
