"""鍛 The Forge — equipment progression.

The governing idea, and the one that changed: **a piece is a track, not a purchase.**
You never throw a piece away. The vessel forged in hour three can be the vessel worn in
month six — raised, refined, inscribed and awakened, still carrying the name of the beetle
that furnished it. Replacing gear is the treadmill every idle game has; growing one piece
for six months is the thing this genre almost never offers.

So one piece carries FOUR axes, each fed by a different thing in the bag:

    鍊 refine   0 → 45   +2% compounding, one continuous bar    ← 材 raw materials
    階 tier     凡 → 天   does NOT add power; it RAISES THE CAP  ← 精 refined + 圖 pattern
    紋 inscribe 0 → 3    mark slots, filled with removable 銘    ← 銘 inscriptions
    覺 awaken   0 → 3    unlocked by WEARING it, per beast       ← use, or 魂 souls

Fed, raised, inscribed, worn. Four verbs, four currencies, one object.
"""
import math

# ── 鍊 the single bar ────────────────────────────────────────────────────────
# One number from 0 to 45, +2% compounding each — the same step as 九層 nine layers, so
# it is one rate the player learns once. 1.02^45 = ×2.44, which is the whole life of a
# piece in a single figure.
STEP = 1.02
MAXR = 45
CAP = {0: 9, 1: 18, 2: 27, 3: 36, 4: 45}      # 階 tier → 鍊 ceiling. Tier IS the cap.
TOP = STEP ** MAXR                             # 2.438


def mult(r):
    """A piece's own multiplier at refinement r. Tier contributes nothing directly."""
    return STEP ** r


def refine_cost(r):
    """Cost of the step INTO level r, in units of that beast's raw material."""
    return math.ceil(0.26 * r ** 1.35)


def refine_total(r):
    return sum(refine_cost(i) for i in range(1, r + 1))


# 昇 ascension: units of 精 refined material (錠 ingot / 晶 crystal / 髓 marrow).
# 地 and 天 additionally need that ground's warden 圖 pattern, which is the gate.
ASCEND = {1: (2, False), 2: (5, False), 3: (12, True), 4: (25, True)}


# ── 六位 the six slots, each owning one verb ─────────────────────────────────
# `base` is the value at 鍊0 — a freshly forged piece is already 41% of its own ceiling,
# because the first piece in any slot should be the biggest jump the player ever feels.
SLOTS = [
    ("crown",   "冠", "Crown",   "悟", "insight",    "insight from kills",  60.0),
    ("robe",    "袍", "Robe",    "採", "gathering",  "gathering",           12.0),
    ("pendant", "佩", "Pendant", "質", "quality",    "material step-up",    18.0),
    ("boots",   "靴", "Boots",   "蹤", "trail",      "trail slots",          0.0),
    ("ring",    "環", "Ring",    "狩", "haul",       "haul",                90.0),
    ("vessel",  "器", "Vessel",  "韌", "resilience", "K above 5",            6.0),
]
SLOT_TOP = {k: top for k, ch, en, gch, gen, unit, top in SLOTS}

# 靴 Boots is the one discrete slot: you cannot have 0.8 of a trail slot.
BOOTS = [(9, "+1 trail slot"), (27, "+2 trail slots"), (45, "+2 slots, 1 free reroll")]


def slot_value(key, r):
    return SLOT_TOP[key] / TOP * mult(r)


# ── 源 origin: which beast, which ground, which 相 phase ─────────────────────
# Three beasts per slot, one per ground, no ground furnishing the same slot twice — and
# the PHASE is independent of the ground, which is what makes 地套 and 相套 pull in
# different directions over the same six slots.
ORIGIN = {
    "crown":   [("shrike", "灰坡", "木"), ("crane", "蘆沼", "金"), ("qilin", "天裂", "火")],
    "robe":    [("hare", "灰坡", "土"),   ("fox", "燼林", "火"),   ("wraith", "天裂", "水")],
    "pendant": [("toad", "蘆沼", "木"),   ("moth", "燼林", "火"),  ("drake", "沉宮", "水")],
    "boots":   [("serpent", "蘆沼", "木"),("lynx", "雷脊", "金"),  ("roc", "沉宮", "土")],
    "ring":    [("ape", "燼林", "土"),    ("tiger", "雷脊", "火"), ("hydra", "天裂", "水")],
    "vessel":  [("beetle", "灰坡", "金"), ("boar", "雷脊", "土"),  ("turtle", "沉宮", "水")],
}

PHASE_NAME = {"木": ("Wood", "#8FD9A0"), "火": ("Fire", "#F0906A"),
              "土": ("Earth", "#F2CE72"), "金": ("Metal", "#DCE6EE"),
              "水": ("Water", "#8FB4F0")}

# ── 覺 awakening: the trait belongs to the BEAST, not the slot ───────────────
# This is the answer to "progression per item". Two robes at the same tier and the same
# 鍊 do not play the same, because one is a hare and one is a fox. Unlocked by WEARING
# the piece — 100 kills, then 500, then 2 000 — or bought early with a 魂 beast soul.
# 覺1 grants the trait, 覺2 grants it again at half strength, 覺3 opens a third 紋 slot.
TRAIT = {
    "shrike":  ("刺", "Thorn",     "+12% haul when the trail beast is below your realm"),
    "crane":   ("潔", "Purity",    "−10% qi cost on every hunt"),
    "qilin":   ("瑞", "Auspice",   "+20% chance a 銘 inscription drops"),
    "hare":    ("疾", "Haste",     "the trail's countdown runs 15% faster"),
    "fox":     ("幻", "Illusion",  "the first decline of a window is free"),
    "wraith":  ("怨", "Grudge",    "+30% haul from wardens"),
    "toad":    ("納", "Absorb",    "+20% yield of 精 refined materials"),
    "moth":    ("引", "Lure",      "+1 beast on the trail"),
    "drake":   ("溺", "Drown",     "materials from 沉宮 come one tier higher"),
    "serpent": ("蛻", "Shed",      "re-roll one material stack per hunt"),
    "lynx":    ("霜", "Frost",     "the haul decays 10% slower — K ×1.1"),
    "roc":     ("翔", "Soar",      "may hunt one ground above your realm without penalty"),
    "ape":     ("力", "Strength",  "+15% haul, flat"),
    "tiger":   ("威", "Dominion",  "+25% insight from kills"),
    "hydra":   ("眾", "Legion",    "every 9th hunt of a day returns twice"),
    "beetle":  ("堅", "Endure",    "banked hunts cap raised by 2"),
    "boar":    ("根", "Root",      "+20% haul when you have not hunted in the last 6 h"),
    "turtle":  ("壽", "Longevity", "wardens drop 魂 beast souls 50% more often"),
}

# ── 套 three families of set, competing for the same six slots ───────────────
# With six slots a player runs 3+3, or 6, and the three families are deliberately
# different SIZES so those are real choices: two ground sets, a ground and a phase, two
# phases, or one path set that eats the whole kit.
GROUND_SET = [
    ("灰坡", "Ash Slopes",    "積", "Hoard",   "+20% yield of 凡 and 靈 materials"),
    ("蘆沼", "Reed Marsh",    "候", "Watch",   "the trail rotates every 4 h instead of 6"),
    ("燼林", "Cinder Wood",   "悟", "Insight", "+30% insight from kills"),
    ("雷脊", "Thunder Ridge", "猛", "Fury",    "+25% haul"),
    ("沉宮", "Sunken Palace", "精", "Refine",  "+12pp material step-up chance"),
    ("天裂", "The Scar",      "恆", "Endure",  "K +2"),
]

PHASE_SET = [
    ("木", "Wood",  "生", "Growth", "every hunt returns 8% of its own qi cost",
     "crown · pendant · boots — the only three that exist, so it is exact"),
    ("火", "Fire",  "炎", "Blaze",  "+40% haul on the day's first three hunts, −10% after",
     "four slots to choose three from"),
    ("土", "Earth", "厚", "Bedrock","no decay at all for the first six hunts of a day",
     "four slots to choose three from"),
    ("金", "Metal", "銳", "Edge",   "+50% chance of a 天 material, −15% material count",
     "crown · boots · vessel — exact, and the hardest to assemble"),
    ("水", "Water", "流", "Flow",   "unspent hunts bank, up to 5, and a banked hunt ignores decay",
     "four slots to choose three from"),
]

PATH_SET = [
    ("劍", "Sword", "平", "Level",  "K is multiplied by 1.5, on top of the vessel"),
    ("刀", "Blade", "爆", "Burst",  "the first hunt of each 6 h window returns ×3"),
    ("弓", "Bow",   "遠", "Reach",  "hunt any ground, opened or not, at half the usual penalty"),
]

# ── the new item kinds this needs ───────────────────────────────────────────
NEW_ITEMS = [
    ("圖", "Pattern",     "warden drop, once", "unlocks 地 and 天 ascension for that piece"),
    ("銘", "Inscription", "beast drop", "a 紋 mark as an object — slot it in, pull it out, move it"),
    ("印", "Path seal",   "forged from 印 seal fragments", "stamps a piece 劍 / 刀 / 弓 for the 道套 path set"),
    ("魂", "Beast soul",  "warden drop", "buys a 覺 awakening instead of waiting for the kill count"),
]

AWAKEN_AT = [100, 500, 2000]
MARK_SLOTS = {0: 0, 1: 0, 2: 1, 3: 2, 4: 2}   # 玄 opens one, 地 two; 覺3 opens a third


def haul_sum(n, K):
    return sum(1.0 / (1.0 + (i - 1) / K) for i in range(1, n + 1))
