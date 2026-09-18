## Every number the game obeys, and where in the bible it comes from.
##
## This is the GDScript twin of sim/rules.py. The two are checked against each other by
## tests/TestSim.gd, which pins the same figures the Python suite pins — because a design
## document, a simulator and a game that each believe slightly different numbers is the
## most expensive kind of bug there is.
##
## Nothing here reads a clock, a frame or a node.
class_name Rules
extends RefCounted

const DAY: float = 86400.0

# §2 九重 the nine realms
const MAX_REALM: int = 9
const LAYERS_PER_REALM: int = 9
const LAYER_STEP: float = 1.02

const REALM_NAMES := [
	["練氣", "Qi Refining"], ["築基", "Foundation"], ["金丹", "Golden Core"],
	["元嬰", "Nascent Soul"], ["化神", "Spirit Severing"], ["煉虛", "Void Refining"],
	["合體", "Unity"], ["大乘", "Great Vehicle"], ["渡劫", "Tribulation"],
]

# §2 五行 the phase of each realm, which tints the whole screen
const REALM_PHASE := ["木", "木", "火", "火", "土", "土", "金", "金", "水"]

const PHASE_COLOUR := {
	"木": Color("8FD9A0"), "火": Color("F0906A"), "土": Color("F2CE72"),
	"金": Color("DCE6EE"), "水": Color("8FB4F0"),
}

# §2 the cost table, found by sim/tune.py. Two phases: steep while the player is learning
# the game, gentle once they are in it. A single geometric curve cannot do both.
const COST_FIRST_DAYS: float = 0.78
const COST_EARLY_GROWTH: float = 3.0
const COST_TAIL_FROM: int = 4
const COST_TAIL_GROWTH: float = 1.25

# §4 狩 hunting
const HUNT_K: float = 5.0
const HUNT_COST_SECONDS: float = 1800.0
const TRAIL_SECONDS: float = 21600.0

# §12 初 the opening gift, in layers of realm 1. Measured: it does not move the 70-day
# curve at all, and without it a new player waits 2.1 hours for anything to happen.
const OPENING_GIFT_LAYERS: float = 5.0


## cost[realm] = qi to fill that realm's nine layers. Realm 9 is included: it has no EXIT,
## which is not the same as having no cost — see §2.
static func costs() -> Dictionary:
	var out := {}
	var c := COST_FIRST_DAYS * DAY
	for r in range(1, MAX_REALM + 1):
		out[r] = c
		c *= COST_TAIL_GROWTH if r >= COST_TAIL_FROM else COST_EARLY_GROWTH
	return out


static func realm_phase(realm: int) -> String:
	return REALM_PHASE[clampi(realm, 1, MAX_REALM) - 1]


static func realm_colour(realm: int) -> Color:
	return PHASE_COLOUR[realm_phase(realm)]
