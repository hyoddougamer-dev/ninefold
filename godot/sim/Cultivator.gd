## 靜 The gathering side: realms, layers, and the qi curve.
##
## Pure and event-driven. It never ticks: it advances to the next moment something happens
## — a layer opening — and integrates the qi in between in closed form. A fixed tick would
## accumulate error and, worse, would model a game that counts frames, which §1 forbids.
##
## The property this buys is the one the whole save design rests on: **there is no offline
## mode.** `advance(seconds)` is the same call whether the app was open or closed, so the
## two cannot drift apart. tests/TestSim.gd proves sixty days in one call equals sixty days
## in two thousand.
##
## Twin of sim/economy.py.
class_name Cultivator
extends RefCounted

var costs: Dictionary
var base_rate: float
var channels: Channels

var realm: int = 1
var layer: int = 0        # layers opened INSIDE the current realm, 0..9
var qi: float = 0.0

## Events produced by the last advance(), for the UI to play back one at a time (§12 初).
var pending: Array[Dictionary] = []


func _init(cost_table: Dictionary = {}, rate: float = 1.0) -> void:
	costs = cost_table if not cost_table.is_empty() else Rules.costs()
	base_rate = rate
	channels = Channels.new()


static func layer_multiplier(r: int, l: int) -> float:
	return pow(Rules.LAYER_STEP, (r - 1) * Rules.LAYERS_PER_REALM + l)


## The bible publishes 4.97x, which is 1.02^81 — all nine realms times nine layers.
static func ninth_realm_multiplier() -> float:
	return layer_multiplier(Rules.MAX_REALM, Rules.LAYERS_PER_REALM)


## Qi per second, right now. Layers compound, and so do channels.
func rate() -> float:
	return base_rate * layer_multiplier(realm, layer) * channels.multiplier()


func capped() -> bool:
	return realm >= Rules.MAX_REALM and layer >= Rules.LAYERS_PER_REALM


func reached_ninth() -> bool:
	return realm >= Rules.MAX_REALM


func layer_cost() -> float:
	if capped():
		return INF
	return costs[realm] / float(Rules.LAYERS_PER_REALM)


func seconds_to_next_layer() -> float:
	if capped():
		return INF
	var need := layer_cost() - qi
	return 0.0 if need <= 0.0 else need / rate()


## Fraction of the current layer already filled — what the qi ring draws.
func layer_progress() -> float:
	if capped():
		return 1.0
	return clampf(qi / layer_cost(), 0.0, 1.0)


func open_layers(at_seconds: float) -> void:
	while not capped() and qi >= layer_cost():
		qi -= layer_cost()
		layer += 1
		if layer >= Rules.LAYERS_PER_REALM and realm < Rules.MAX_REALM:
			realm += 1
			layer = 0
			pending.append({"kind": "realm", "realm": realm, "t": at_seconds})
		else:
			pending.append({"kind": "layer", "realm": realm, "layer": layer,
				"t": at_seconds})


## Advance by `seconds`, opening every layer the qi crosses on the way. Exact: it steps to
## each threshold rather than ticking, so no fixed-step error accumulates.
func advance(seconds: float, from_seconds: float = 0.0) -> void:
	var left := seconds
	var t := from_seconds
	while left > 0.0:
		var dt := seconds_to_next_layer()
		if dt > left or is_inf(dt):
			qi += rate() * left
			break
		qi += rate() * dt
		t += dt
		left -= dt
		open_layers(t)
		if capped():
			break


## §4: a hunt costs half an hour of your OWN current rate, so the trade feels identical
## at realm 1 and realm 8.
func hunt_cost() -> float:
	return Rules.HUNT_COST_SECONDS * rate()


## §12 初 the opening gift, so minute one is not empty.
func grant_opening_gift() -> void:
	qi += (costs[1] / float(Rules.LAYERS_PER_REALM)) * Rules.OPENING_GIFT_LAYERS
	open_layers(0.0)
