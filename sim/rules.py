"""Every number the simulator obeys, and where in the bible it comes from.

This file is the seam between the design and the code. If a constant is not here, the
simulator invented it, and inventing numbers is the failure this whole exercise exists to
prevent. Each entry carries its GDD section so a change to the document and a change to
the model cannot drift apart silently.

Nothing here reads a clock, a frame or a node. Progress is a function of elapsed seconds,
because the app is closed twenty-three hours in twenty-four (GDD §1).
"""

# ── §2 九重 the nine realms ──────────────────────────────────────────────────
REALMS = [
    (1, "練氣", "Qi Refining",     "木"), (2, "築基", "Foundation",      "木"),
    (3, "金丹", "Golden Core",     "火"), (4, "元嬰", "Nascent Soul",    "火"),
    (5, "化神", "Spirit Severing", "土"), (6, "煉虛", "Void Refining",   "土"),
    (7, "合體", "Unity",           "金"), (8, "大乘", "Great Vehicle",   "金"),
    (9, "渡劫", "Tribulation",     "水"),
]
MAX_REALM = 9

# §2 九層 — nine layers to a realm, +2% compounding each, 4.97x by the ninth realm.
LAYERS_PER_REALM = 9
LAYER_STEP = 1.02

# §2 "The ninth realm has no exit": its cost is INF and its bar never completes.

# ── §4 狩 hunting ────────────────────────────────────────────────────────────
HUNT_K = 5.0                 # the decay constant. §13 lists it as OPEN and blocking.
HUNT_COST_SECONDS = 1800.0   # a hunt costs half an hour of your OWN current rate
TRAIL_SECONDS = 6 * 3600.0   # §4 蹤 the trail turns over every six hours

# ── §7 鍛 the forge ─────────────────────────────────────────────────────────
REFINE_MAX = 45
REFINE_STEP = 1.02           # deliberately the same step as a layer
REFINE_CAP = {0: 9, 1: 18, 2: 27, 3: 36, 4: 45}
FORGE_ASCEND = {1: 2, 2: 5, 3: 12, 4: 25}     # units of 精 refined material
SLOT_TOP = {"crown": 60.0, "robe": 12.0, "pendant": 18.0,
            "boots": 0.0, "ring": 90.0, "vessel": 6.0}

# §7 "three units of material per hunt is an assumption, not a measurement."
# It is a PARAMETER here, never a constant, because measuring it is half the point.
ASSUMED_UNITS_PER_HUNT = 3.0

# ── §0 the three findings, as numbers to be held to ─────────────────────────
# Finding 1, the old build's measured idle-only realm arrivals, by day.
OLD_BUILD_ARRIVALS = {2: 1, 3: 1, 4: 1, 5: 2, 6: 3, 7: 5, 8: 16, 9: 56}
OLD_BUILD_WORST_GAP_SHARE = 0.57     # 57% of a playthrough in one gap
# Finding 2, novelty: 57.6 first-time events in week one, ~1/week by week seven.
OLD_BUILD_WEEK1_EVENTS = 57.6

# ── §8 the grounds, and when they open ──────────────────────────────────────
GROUNDS = [("灰坡", "Ash Slopes", 1), ("蘆沼", "Reed Marsh", 2),
           ("燼林", "Cinder Wood", 4), ("雷脊", "Thunder Ridge", 5),
           ("沉宮", "Sunken Palace", 7), ("天裂", "The Scar", 8)]

DAY = 86400.0
