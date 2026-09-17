"""瓶頸 Bottlenecks — the walls, and what they cost.

Everything so far was deliberately frictionless. §4 says it outright: *"neither ever says
no"*, *"the wall is the curve, not a rule"*. That is a real design position and it is the
one this document has held since the first page.

It is now being changed on purpose. Cultivation fiction is *about* bottlenecks — 瓶頸 is
the word, and a xianxia story with no stuck realm is not a xianxia story. So three of the
eight realm transitions stop being purchasable with time and start requiring that you
actually played.

**The cost of this, stated once and plainly.** §3's promise was *"a player who only ever
opens the app once a day still reaches the ninth realm"*. A player who NEVER hunts and
NEVER dives can no longer reach realm 9 — they stall at realm 4 forever. The promise
survives only in its weaker form: once a day is still enough, because one dive or one
warden clears a gate. Pure absentee play is dead. That is a deliberate trade, not an
oversight.
"""
from . import rules as R

# gate at realm N→N+1 : (what it needs, roughly how many days of play to be ready)
GATES = {
    3: ("結丹 Forming the Core",
        "kill 灰王 the Grey King — the first warden",
        "one dive to floor 20, or ~40 hunts on 灰坡"),
    6: ("化虛 Voiding",
        "reach dive depth 40, and carry one 地 Earth-tier piece",
        "a 32-minute dive at 70% reads, and a forge run"),
    8: ("渡劫 Tribulation",
        "dive depth 65, six slots at 玄 Mystic or better, and beat 裂天 Skysplitter",
        "the end-game wall — months, and it should be"),
}

# 守關 gate floors inside a dive: every tenth floor is a warden-class encounter.
GATE_EVERY = 10
GATE_STAMINA = 9.0          # a gate floor costs this instead of the usual ~1.4
GATE_REWARD = 5.0           # a gate floor pays five normal floors
# First pass made gates cost-only and the dive stopped being worth entering: a 70% reader
# fell from floor 50 to 39 and from x1.99 the materials of the same qi in hunts to x1.39.
# A wall that is only a wall just makes people stop. A gate is a wall AND a prize.

# Clearing a gate BANKS everything so far. That is the real reason gates exist: between
# gates every point is at risk, and the question stops being "should I withdraw?" — which
# has a boring correct answer — and becomes "can I reach floor 40 on twelve stamina?"
GATE_BANKS = True


def is_gate(floor):
    return floor % GATE_EVERY == 0


def floor_stamina_gated(n, accuracy, misread_penalty=2.2):
    base = 1.0 + n / 80.0
    if is_gate(n):
        base = GATE_STAMINA
    return base + (1.0 - accuracy) * misread_penalty


def stamina_for(gear_fraction=0.0):
    """秘境 stamina grows with the kit: 100 bare, 160 fully forged. So depth is itself a
    progression track — the same run goes deeper next month because you built the gear."""
    return 100.0 + 60.0 * gear_fraction


def run_value_gated(depth, floor_value):
    """Insight banked, counting the gate bonuses."""
    return sum(floor_value(n) * (GATE_REWARD if is_gate(n) else 1.0)
               for n in range(1, depth + 1))


def last_gate(depth):
    """What a run actually keeps if stamina runs out: everything up to the last gate."""
    return (depth // GATE_EVERY) * GATE_EVERY


def reachable_depth_gated(accuracy, stamina=100.0):
    s, n = stamina, 0
    while True:
        n += 1
        c = floor_stamina_gated(n, accuracy)
        if s < c:
            return n - 1
        s -= c
