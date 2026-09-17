"""動 The hunting side: the decay curve, and what a day of hunting is worth.

Two soft brakes and neither ever says no (§4): the haul decays within the day, and the
hunt costs qi that does not come back.
"""
from . import rules as R


def haul_factor(n, K=R.HUNT_K):
    """h(n) = 1 / (1 + (n-1)/K). Never zero, never refused."""
    return 1.0 / (1.0 + (n - 1) / K)


def day_haul(hunts, K=R.HUNT_K):
    """Total haul multiplier for taking `hunts` hunts in one day."""
    return sum(haul_factor(i, K) for i in range(1, hunts + 1))


def advantage(hunts, K=R.HUNT_K, reference=4):
    """The figure §4 publishes: haul versus `reference` hunts at the base K. The test
    suite prints this on every run so a change to K is never silent."""
    return day_haul(hunts, K) / day_haul(reference, R.HUNT_K)


class Day:
    """One day of hunting for one cultivator. Hunt n costs qi and returns h(n) x yield."""

    def __init__(self, K=R.HUNT_K, unit_yield=R.ASSUMED_UNITS_PER_HUNT, haul_mult=1.0):
        self.K = K
        self.unit_yield = unit_yield
        self.haul_mult = haul_mult
        self.n = 0
        self.units = 0.0
        self.qi_spent = 0.0

    def take(self, cultivator):
        """Take one hunt. Returns units gathered, or None if the qi is not there.
        Never refuses for any other reason — the wall is the curve, not a rule."""
        cost = cultivator.hunt_cost()
        if cultivator.qi < cost:
            return None
        self.n += 1
        cultivator.qi -= cost
        self.qi_spent += cost
        got = self.unit_yield * haul_factor(self.n, self.K) * self.haul_mult
        self.units += got
        return got
