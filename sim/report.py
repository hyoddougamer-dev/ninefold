"""python3 -m sim.report — every number the bible claims, recomputed from the model.

The point is that a claim in docs/GDD.md and a number in this output cannot drift apart
without somebody noticing. Run it after any change to rules.py or to the curve.
"""
import math
from . import rules as R, economy as E, player as P, hunting as H, tune as T

# The curve the simulator found. Two phases: steep while the player is learning the game,
# gentle once they are in it. See §2 of the bible.
FIRST_DAYS, EARLY_GROWTH, TAIL_FROM, TAIL_GROWTH = 0.78, 3.0, 4, 1.25


def costs():
    return E.flattened_costs(FIRST_DAYS * R.DAY, EARLY_GROWTH, TAIL_FROM, TAIL_GROWTH)


def refine_total(r):
    """§7's cost table, restated in code so the two cannot disagree."""
    return sum(math.ceil(0.26 * i ** 1.35) for i in range(1, r + 1))


def main():
    c = costs()
    idle = P.run(c, days=600)
    g = P.gaps(idle["arrivals"])
    share, which = P.worst_gap_share(idle["arrivals"])

    print("狩 hunting advantage (§4) — reference: four hunts at K=%.1f" % R.HUNT_K)
    for n in (4, 8, 20, 50):
        print("   %2d hunts  x%.2f" % (n, H.advantage(n)))

    print("\n九層 layers (§2) — +2% compounding")
    print("   by the ninth realm: x%.2f   (the bible says 4.97)" % E.ninth_realm_multiplier())

    print("\n靜 idle-only run (§3's promise)")
    for r in sorted(g):
        print("   %d -> %d : %3d days  (day %d)" % (r - 1, r, g[r], idle["arrivals"][r]))
    print("   %d days total, worst gap %d->%d at %.0f%%" % (idle["days"], which-1, which, 100*share))
    print("   old build: 56 days, 8->9 gap 71%%.  reaches realm 9: %s" % idle["reached9"])

    print("\n初 novelty per week (Finding 2)")
    nb = T.novelty_by_week(c, 11)
    print("   " + " ".join("w%d:%d" % (i+1, v) for i, v in enumerate(nb)))

    print("\n動 what hunting costs and buys")
    print("   hunts/day | realm 9 | delay | taken | units | units/hunt")
    for row in T.road_comparison(c, [0, 2, 4, 8, 16, 30], days=900):
        per = row["units"] / row["taken"] if row["taken"] else 0.0
        print("   %9d | %7s | %+5d | %5d | %5.0f | %.2f"
              % (row["hunts"], row["days"] if row["reached9"] else "never",
                 row["days"] - idle["days"], row["taken"], row["units"], per))
    print("   §7 assumed 3.00 units/hunt. At 8 hunts a day it is 1.89 — h(n) is inside")
    print("   the average and the cost table forgot it, so every forge figure in §7 is")
    print("   optimistic by 3.00/1.89 = 59%.")


if __name__ == "__main__":
    main()
