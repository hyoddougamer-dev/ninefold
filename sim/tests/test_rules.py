"""Pins every number the bible publishes. A doc change without a model change fails here.

Run: python3 -m sim.tests.test_rules
"""
import math, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from sim import rules as R, economy as E, player as P, hunting as H, report as REP

FAIL = []


def check(name, got, want, tol=0.0):
    ok = abs(got - want) <= tol if isinstance(want, float) else got == want
    print("  %-58s %-12s %s" % (name, got if not isinstance(got, float) else "%.4f" % got,
                                "ok" if ok else "FAIL (want %s)" % want))
    if not ok:
        FAIL.append(name)


print("§4 狩 the published advantage table")
for n, want in ((4, 1.00), (8, 1.61), (20, 2.67), (50, 3.93)):
    check("advantage at %d hunts" % n, H.advantage(n), want, .01)

print("\n§2 九層 layers")
check("multiplier by the ninth realm", E.ninth_realm_multiplier(), 4.97, .01)
check("layer step", R.LAYER_STEP, 1.02, 0)
check("layers per realm", R.LAYERS_PER_REALM, 9)

print("\n§4 the hunt price")
c = E.Cultivator(REP.costs())
check("a hunt costs 1800s of the CURRENT rate", c.hunt_cost(), 1800.0 * c.rate, 1e-9)
c.realm, c.layer = 8, 0
check("...and that is still true at realm 8", c.hunt_cost(), 1800.0 * c.rate, 1e-9)

print("\n§7 鍛 the forge cost table")
for r, want in ((9, 27), (27, 279), (45, 893)):
    check("鍊 cumulative to %d" % r, REP.refine_total(r), want)
check("鍊45 multiplier", R.REFINE_STEP ** R.REFINE_MAX, 2.438, .001)

print("\n§2/§3 the curve, and the promise it must keep")
idle = P.run(REP.costs(), days=600)
share, which = P.worst_gap_share(idle["arrivals"])
check("idle-only reaches realm 9", idle["reached9"], True)
check("...in days", idle["days"], 70)
check("worst gap share is under the old build's 71%", share < 0.30, True)
check("every ground opens (Finding 3)",
      all(o == 1 or o in idle["arrivals"] for _, _, o in R.GROUNDS), True)

print("\n§3 hunting must never ACCELERATE the realm climb")
for h in (2, 8, 30):
    r = P.run(REP.costs(), days=900, hunts_per_day=h)
    check("%d hunts/day is slower than idle" % h, r["days"] >= idle["days"], True)

print("\n%s" % ("all pinned numbers hold" if not FAIL else "%d FAILED: %s" % (len(FAIL), FAIL)))
sys.exit(1 if FAIL else 0)
