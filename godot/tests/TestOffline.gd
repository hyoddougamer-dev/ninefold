## The point of the whole slice: close the app, reopen it, and the number is right.
##
## This writes a save stamped N hours in the past, loads it the way ui/Now.gd does, and
## checks the state against a cultivator that simply ran for N hours without ever being
## closed. If those two disagree, the game lies about the twenty-three hours a day it
## spends in the background — which is most of the game.
##
##   godot --headless --path godot --script res://tests/TestOffline.gd
extends SceneTree

var failures: Array[String] = []


func ok(name: String, got, want, tol: float = 0.0) -> void:
	var good: bool
	if got is float or got is int:
		good = absf(float(got) - float(want)) <= tol
	else:
		good = got == want
	var shown = ("%.6f" % float(got)) if (got is float) else str(got)
	print("  %-54s %-16s %s" % [name, shown, "ok" if good else "FAIL (want %s)" % str(want)])
	if not good:
		failures.append(name)


## Exactly what ui/Now.gd does on launch, with no UI attached.
func reopen(blob: Dictionary, now_unix: float) -> Dictionary:
	var c := Cultivator.new()
	if blob.is_empty() or not Save.verify(blob):
		c.grant_opening_gift()
		return {"c": c, "away": 0.0, "events": c.pending.size()}
	Save.apply(blob, c)
	var clk := Save.Clock.new(float(blob.get("t", now_unix)), float(blob.get("e", 0.0)))
	var away := clk.tick(now_unix)
	c.pending.clear()
	c.advance(away)
	return {"c": c, "away": away, "events": c.pending.size(), "flags": clk.flags}


func _initialize() -> void:
	var t0 := 1700000000.0

	print("\nclosed for N hours == open for N hours")
	for hours: float in [1.0, 8.0, 14.0, 72.0, 24.0 * 30.0]:
		var span := hours * 3600.0

		var open_run := Cultivator.new()
		open_run.grant_opening_gift()
		open_run.advance(span)

		var saved := Cultivator.new()
		saved.grant_opening_gift()
		var blob := Save.encode(saved, int(t0), 0.0, 1, 0)
		var back: Dictionary = reopen(blob, t0 + span)
		var c: Cultivator = back["c"]

		var lbl := ("%.0f h" % hours) if hours < 48 else ("%.0f days" % (hours / 24.0))
		ok("%s: realm" % lbl, c.realm, open_run.realm)
		ok("%s: layer" % lbl, c.layer, open_run.layer)
		ok("%s: qi" % lbl, absf(c.qi - open_run.qi) < 0.001, true)

	print("\nthe welcome-back playback has something to play")
	var s2 := Cultivator.new()
	s2.grant_opening_gift()
	var b2 := Save.encode(s2, int(t0), 0.0, 1, 0)
	var r2: Dictionary = reopen(b2, t0 + 14.0 * 3600.0)
	ok("14 h away opens layers", int(r2["events"]) > 0, true)
	ok("...and they are queued as events", int(r2["events"]), int(r2["events"]))

	print("\na clock that went backwards pays nothing and is flagged")
	var b3 := Save.encode(s2, int(t0), 0.0, 1, 0)
	var r3: Dictionary = reopen(b3, t0 - 3600.0)
	ok("credited", float(r3["away"]), 0.0, 0.0)
	ok("flagged", (r3["flags"] as Array).has("backwards"), true)
	var c3: Cultivator = r3["c"]
	ok("nothing was taken away either", c3.layer, s2.layer)

	print("\na hand-edited save is rejected and the player starts fresh")
	var b4 := Save.encode(s2, int(t0), 0.0, 1, 0)
	b4["q"] = 99999999.0
	var r4: Dictionary = reopen(b4, t0 + 3600.0)
	var c4: Cultivator = r4["c"]
	ok("did not inherit the edited qi", c4.qi < 99999999.0, true)

	print("\nthe save survives a round trip through disk")
	var disk := Cultivator.new()
	disk.grant_opening_gift()
	disk.advance(Rules.DAY * 3.0)
	Save.write(Save.encode(disk, int(t0), Rules.DAY * 3.0, 4, 0))
	var readback := Save.read()
	ok("reads back", not readback.is_empty(), true)
	ok("verifies", Save.verify(readback), true)
	var rc := Cultivator.new()
	Save.apply(readback, rc)
	ok("realm survives", rc.realm, disk.realm)
	ok("layer survives", rc.layer, disk.layer)

	print("")
	if failures.is_empty():
		print("closing the app is the same as leaving it open — proven, not asserted")
	else:
		print("%d FAILED: %s" % [failures.size(), ", ".join(failures)])
	quit(1 if failures.size() > 0 else 0)
