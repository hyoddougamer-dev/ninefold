## 存 The save file, and the only code allowed to read a clock.
##
## Twin of sim/save.py. The rules, restated because they are choices and not accidents:
##
##   forwards, plausibly  credited UNCAPPED. §3 promises gathering runs while the app is
##                        closed, and a cap would punish exactly the player the game is
##                        balanced around. Come back after a month and a month is what
##                        you get.
##   backwards            credits NOTHING and moves the reference forward. Never punish —
##                        a phone that crossed a timezone is not a cheat — never pay
##                        either.
##   forwards, absurdly   credited, and FLAGGED. Refusing locally breaks honest players
##                        with a wrong clock and stops nobody.
##
## This does not stop a determined cheat and is not pretending to. Without a server there
## is no trustworthy clock, and security that LOOKS like it works is the worst kind.
class_name Save
extends RefCounted

const SCHEMA: int = 1
const PATH: String = "user://ninefold.save"
const ABSURD_SECONDS: float = 7776000.0    # ninety days between opens is worth a look
const SECRET: String = "ninefold"


static func sign_body(body: Dictionary) -> String:
	var keys := body.keys()
	keys.sort()
	var parts := PackedStringArray()
	for k in keys:
		if k == "sig":
			continue
		parts.append("%s=%s" % [k, JSON.stringify(body[k])])
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(("|".join(parts) + SECRET).to_utf8_buffer())
	return ctx.finish().hex_encode().substr(0, 32)


static func encode(c: Cultivator, now_unix: int, elapsed: float, day_no: int,
		hunts_today: int, best_depth: int = 0) -> Dictionary:
	var body := {
		"v": SCHEMA,
		"t": now_unix,                       # advisory, never trusted alone
		"e": snappedf(elapsed, 0.001),       # seconds ever CREDITED. Only ever grows.
		"r": c.realm, "l": c.layer,
		"q": snappedf(c.qi, 0.000001),
		"ch": {"o": c.channels.opened, "i": snappedf(c.channels.insight, 0.0001)},
		"d": {"n": day_no, "h": hunts_today, "best": best_depth},
	}
	body["sig"] = sign_body(body)
	return body


static func verify(body: Dictionary) -> bool:
	if not body.has("sig"):
		return false
	return sign_body(body) == body["sig"]


static func apply(body: Dictionary, c: Cultivator) -> void:
	c.realm = int(body.get("r", 1))
	c.layer = int(body.get("l", 0))
	c.qi = float(body.get("q", 0.0))
	var ch: Dictionary = body.get("ch", {})
	c.channels.opened = int(ch.get("o", 0))
	c.channels.insight = float(ch.get("i", 0.0))


static func write(body: Dictionary) -> void:
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(body))
		f.close()


static func read() -> Dictionary:
	if not FileAccess.file_exists(PATH):
		return {}
	var f := FileAccess.open(PATH, FileAccess.READ)
	if not f:
		return {}
	var parsed = JSON.parse_string(f.get_as_text())
	f.close()
	return parsed if parsed is Dictionary else {}


## What a save is allowed to conclude from the device clock.
class Clock extends RefCounted:
	var last_seen: float
	var elapsed: float
	var flags: Array[String] = []

	func _init(seen: float, ever: float = 0.0) -> void:
		last_seen = seen
		elapsed = ever

	## Returns the seconds the game may credit for the span ending at `now`.
	func tick(now: float) -> float:
		var dt := now - last_seen
		if dt < 0.0:
			flags.append("backwards")
			last_seen = now
			return 0.0
		if dt > Save.ABSURD_SECONDS:
			flags.append("absurd")
		last_seen = now
		elapsed += dt
		return dt
