## 狩 Hunting. Twin of sim/hunting.py.
##
## Two soft brakes and neither ever says no (§4): the haul decays within the day, and the
## hunt costs qi that does not come back.
class_name Hunting
extends RefCounted


## h(n) = 1 / (1 + (n-1)/K). Never zero, never refused.
static func haul_factor(n: int, k: float = Rules.HUNT_K) -> float:
	return 1.0 / (1.0 + float(n - 1) / k)


## Total haul multiplier for taking `hunts` hunts in one day — the figure §4 publishes.
static func day_haul(hunts: int, k: float = Rules.HUNT_K) -> float:
	var total := 0.0
	for i in range(1, hunts + 1):
		total += haul_factor(i, k)
	return total
