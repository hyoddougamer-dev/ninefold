## 經脈 Channels — the loop that makes an active player permanently stronger.
##
## Kills give 悟 insight, insight opens channels, a channel is a permanent multiplier on
## gathering. So the 動 Motion player pays qi today and buys gathering rate forever. That
## is the vertical progression: an active player does not merely hold more stuff than an
## idle one, they eventually GATHER FASTER.
##
## Twin of sim/channels.py.
class_name Channels
extends RefCounted

const COUNT: int = 12
const GAIN: float = 1.08          # 1.08^12 = x2.52
const FIRST_COST: float = 40.0
const COST_GROWTH: float = 1.55

var opened: int = 0
var insight: float = 0.0


static func cost(n: int) -> float:
	return FIRST_COST * pow(COST_GROWTH, n - 1)


func earn(amount: float) -> void:
	insight += amount


## Opens every channel the banked insight covers. Returns how many opened.
func spend() -> int:
	var n := 0
	while opened < COUNT and insight >= cost(opened + 1):
		insight -= cost(opened + 1)
		opened += 1
		n += 1
	return n


func multiplier() -> float:
	return pow(GAIN, opened)
