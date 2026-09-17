"""秘境 The Deep — the thing an active player does for two hours.

The hole this fills, stated plainly: eight hunts a day is eight taps, which is thirty
seconds. Everything designed so far rewards FREQUENCY — checking in six times a day — and
nothing rewards DURATION. There was no way to play for two hours because there was nothing
that lasted two hours.

A dive is one qi payment and then a long free descent. Floor by floor you read a beast and
pick a 勢 stance; the rewards compound with depth and the stamina to keep going does not.
At every floor you choose: go deeper, or withdraw and bank everything. Run out of stamina
and the unbanked haul is gone — never the gear, never the realm.

Why this shape and not another:
  - it costs qi ONCE, so it does not distort the h(n) hunt economy at all
  - depth IS the vertical progression, literally
  - it is the only place the 勢 stance read is repeated enough to become a skill
  - the idle player can ignore it completely and still reach realm 9 on the base curve
"""
from . import rules as R

ENTRY_HOURS = 4.0          # a dive costs four hours of your own rate — eight hunts' worth
STAMINA = 100.0
INSIGHT_BASE = 1.2         # insight from floor n = INSIGHT_BASE * n ** INSIGHT_POW
INSIGHT_POW = 0.60
MISREAD_PENALTY = 2.2      # a wrong stance costs this much extra stamina
MATERIAL_BASE = 0.15       # materials from floor n = MATERIAL_BASE * n ** MATERIAL_POW
MATERIAL_POW = 0.45        # tuned so a dive pays ~2x hunts per unit of qi, not 5x —
                           # at the first coefficient a full gear kit took 25 days by
                           # diving and 350 by hunting, which makes hunting pointless.


def entry_cost(cultivator):
    return ENTRY_HOURS * 3600.0 * cultivator.rate


def floor_insight(n):
    return INSIGHT_BASE * n ** INSIGHT_POW


def floor_stamina(n):
    """Deeper floors cost more to survive, which is what caps a run without a rule."""
    return 1.0 + n / 80.0


def reachable_depth(accuracy):
    """How deep a player who reads the beast correctly `accuracy` of the time gets before
    stamina runs out. This is the skill gradient, and it is the whole point: the player
    who learned the eighteen beasts goes deeper, and depth compounds."""
    s, n = STAMINA, 0
    while True:
        n += 1
        cost = floor_stamina(n) + (1.0 - accuracy) * MISREAD_PENALTY
        if s < cost:
            return n - 1
        s -= cost


def run_value(depth):
    """Insight banked by withdrawing at `depth`."""
    return sum(floor_insight(n) for n in range(1, depth + 1))


def minutes(depth, seconds_per_floor=38.0):
    return depth * seconds_per_floor / 60.0


def floor_material(n):
    return MATERIAL_BASE * n ** MATERIAL_POW


def run_materials(depth):
    return sum(floor_material(n) for n in range(1, depth + 1))
