"""鍛 The Forge — the equipment progression system, as data.

One piece of gear is three numbers and a name:

    源 origin    which beast furnished it  — decides the SLOT, and where you must go
    階 tier      五階, 凡 → 天             — decides the CEILING
    鍊 refine    0 → 9                     — decides how far up that ceiling you are

Nothing else. No affix soup, no rolled stat lines except one 紋 mark at the top two tiers.
A player reads a piece the way they read a beast: a shape plus a rank.
"""
import math

# ── 六位 the six slots, each with ONE job ────────────────────────────────────
# Six copies of "+x% power" would be one stat wearing six hats. Each slot instead owns a
# different verb, so choosing between two pieces is a real question and the six together
# read as a kit rather than a score.
SLOTS = [
    ("crown",   "冠", "Crown",   "悟", "insight",    "+60% insight from kills",
     "feeds 經脈 channels and 術 arts — the idle player's slot"),
    ("robe",    "袍", "Robe",    "採", "gathering",  "+12% gathering",
     "the ONLY slot that touches the 靜 Stillness road, and deliberately the smallest number in the game"),
    ("pendant", "佩", "Pendant", "質", "quality",    "+18pp chance a material comes up one tier",
     "turns hunting time into material TIER instead of material count"),
    ("boots",   "靴", "Boots",   "蹤", "trail",      "+2 trail slots, 1 free reroll per window",
     "attention buys quality — boots buy more of it"),
    ("ring",    "環", "Ring",    "狩", "haul",       "+90% haul",
     "the flat multiplier on everything a hunt returns"),
    ("vessel",  "器", "Vessel",  "韌", "resilience", "K 5 → 11",
     "raises the hunting decay constant: the marathon slot, worth nothing on hunt 1 and everything on hunt 40"),
]

# ── 源 which beast furnishes which slot ──────────────────────────────────────
# Three beasts per slot, one per slot per ground. This is Finding 3 made mechanical: you
# cannot finish a kit without visiting every ground, and you cannot reach 地/天 on any
# piece without killing that ground's warden.
ORIGIN = {
    "crown":   [("shrike", "灰坡"), ("crane", "蘆沼"),  ("qilin", "天裂")],
    "robe":    [("hare", "灰坡"),   ("fox", "燼林"),    ("wraith", "天裂")],
    "pendant": [("toad", "蘆沼"),   ("moth", "燼林"),   ("drake", "沉宮")],
    "boots":   [("serpent", "蘆沼"),("lynx", "雷脊"),   ("roc", "沉宮")],
    "ring":    [("ape", "燼林"),    ("tiger", "雷脊"),  ("hydra", "天裂")],
    "vessel":  [("beetle", "灰坡"), ("boar", "雷脊"),   ("turtle", "沉宮")],
}

# ── 階 the cost table ────────────────────────────────────────────────────────
# Units of that beast's material, at that tier. Forging is the entry price; 鍊 refinement
# is the long tail. Both are paid in the SAME material, so a player who over-farms one
# beast is never stuck holding the wrong currency.
FORGE = {0: 6, 1: 10, 2: 18, 3: 30, 4: 50}


def refine_cost(tier, level):
    """鍊 level L on a tier-T piece. Linear in L: the ninth step costs nine times the first."""
    return math.ceil(FORGE[tier] * level / 5)


def piece_total(tier):
    return FORGE[tier] + sum(refine_cost(tier, L) for L in range(1, 10))


# ── what a piece is worth ────────────────────────────────────────────────────
# 鍊 uses the SAME +2% compounding step as 九層 nine layers. One number the player learns
# once and then recognises everywhere.
STEP = 1.02
TIER_SCALE = [0.16, 0.30, 0.52, 0.75, 1.00]   # 凡 靈 玄 地 天, as a fraction of the 天 value


def power(tier, level):
    return TIER_SCALE[tier] * STEP ** level


def haul_sum(n, K):
    return sum(1.0 / (1.0 + (i - 1) / K) for i in range(1, n + 1))


# ── 紋 the marks, rolled only at 地 and 天 ───────────────────────────────────
# Eight, fixed, all readable in one line. Rerollable with 幣 sect coin, which is the only
# second use that currency has.
MARKS = [
    ("貪", "Gluttony",  "every 5th hunt of a day ignores the decay entirely"),
    ("眠", "Slumber",   "the first hunt after 8 h closed returns double"),
    ("燼", "Ember",     "+25% haul on the ground this piece came from"),
    ("鏡", "Mirror",    "a declined trail does not spend the window"),
    ("骨", "Bone",      "materials from wardens come one tier higher"),
    ("風", "Wind",      "trail rotates every 4 h instead of 6"),
    ("鎖", "Lock",      "banks one unused hunt per day, up to 3"),
    ("雷", "Thunder",   "+40% insight, but −20% haul"),
]

if __name__ == "__main__":
    for t in range(5):
        print(t, FORGE[t], piece_total(t), "%.2f" % power(t, 9))
