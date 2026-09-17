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

print("\n§4 勢 stance, and the option that was rejected")
import sim.economy as _E
for lbl, ins, dec, want in (("一擊 One Strike  (insight 1, decaying)", 1.0, True, 71),
                            ("三合 Three Exch. (insight 4, decaying)", 4.0, True, 60),
                            ("勢    Stance      (insight 8, no decay)", 8.0, False, 52)):
    r = P.run(REP.costs(), days=900, hunts_per_day=8, insight_per_kill=ins, insight_decays=dec)
    check(lbl, r["days"], want)
check("One Strike really does make attention worthless",
      P.run(REP.costs(), days=900, hunts_per_day=8, insight_per_kill=1.0,
            insight_decays=True)["days"] >= idle["days"], True)

print("\n§4 秘境 the dive, and §2 瓶頸 the gates")
from sim import dive as D, gates as G
for acc, want in ((0.70, 50), (0.85, 58)):
    check("ungated depth at %.0f%% reads" % (100*acc), D.reachable_depth(acc), want)
for gear, acc, want in ((0.0, 0.70, 39), (1.0, 0.85, 65)):
    check("gated depth, %s kit, %.0f%% reads" % ("bare" if not gear else "full", 100*acc),
          G.reachable_depth_gated(acc, G.stamina_for(gear)), want)
check("a gate floor pays five normal floors", G.GATE_REWARD, 5.0, 0)
check("clearing a gate banks the run", G.GATE_BANKS, True)
check("a dive costs the qi of eight hunts",
      D.ENTRY_HOURS * 3600.0 / R.HUNT_COST_SECONDS, 8.0, 1e-9)
hunt8 = sum(3.0 * H.haul_factor(n) for n in range(1, 9))
ratio = G.run_value_gated(G.reachable_depth_gated(0.70), D.floor_material) / hunt8
check("a 70% reader's dive beats the same qi in hunts", 1.5 < ratio < 2.5, True)

print("\n§1 存 the save, and the claim that offline pays the same")
from sim import save as SV, tells as TL
def _adv(steps, total):
    cc = E.Cultivator(REP.costs()); a = {}
    for i in range(steps): P._advance(cc, total/steps, i*total/steps, a)
    return cc
for total, lbl in ((86400.0, "one day"), (86400.0*60, "sixty days")):
    one, many = _adv(1, total), _adv(2000, total)
    check("%s: one step == many steps (qi)" % lbl, abs(one.qi-many.qi) < 1e-6, True)
    check("%s: one step == many steps (realm.layer)" % lbl,
          (one.realm, one.layer) == (many.realm, many.layer), True)
c2 = E.Cultivator(REP.costs()); P._advance(c2, 86400.0*5, 0, {})
blob = SV.encode(c2, now=1_700_000_000, elapsed=86400.0*5, day_no=5, hunts_today=3)
check("a save verifies", SV.verify(blob), True)
tampered = dict(blob); tampered["q"] = blob["q"] * 10
check("an edited save does not verify", SV.verify(tampered), False)
clk = SV.Clock(1000.0)
check("a clock moving backwards credits nothing", clk.tick(500.0), 0.0, 0)
check("...and is flagged", clk.flags[0][0], "backwards")
check("a clock moving forwards credits the span", clk.tick(500.0 + 7200), 7200.0, 1e-9)

print("\n§4 兆 the tells")
check("nine tells", len(TL.TELLS), 9)
check("three stances", len(TL.STANCES), 3)
check("every beast has a pool", len(TL.BEAST_TELLS), 18)
check("signatures are 6/6/6", sorted(TL.signature_spread().values()), [6, 6, 6])
cov = TL.coverage()
check("no stance is right more than 39% of the time", max(cov.values()) <= 0.39, True)
check("every beast's signature is in its own pool",
      all(sig in pool for sig, pool in TL.BEAST_TELLS.values()), True)

print("\n%s" % ("all pinned numbers hold" if not FAIL else "%d FAILED: %s" % (len(FAIL), FAIL)))
sys.exit(1 if FAIL else 0)
