## Pins the GDScript simulation against the SAME numbers docs/GDD.md publishes and
## sim/tests/test_rules.py pins in Python.
##
## The reason this file exists: a design document, a Python simulator and a shipping game
## that each believe slightly different numbers is the most expensive bug there is, and it
## is invisible until someone plays for a month and the curve is wrong.
##
##   godot --headless --path godot --script res://tests/TestSim.gd
extends SceneTree

var failures: Array[String] = []


func ok(name: String, got, want, tol: float = 0.0) -> void:
	var good: bool
	if got is float or got is int:
		good = absf(float(got) - float(want)) <= tol
	else:
		good = got == want
	var shown = ("%.6f" % float(got)) if (got is float) else str(got)
	print("  %-56s %-14s %s" % [name, shown, "ok" if good else "FAIL (want %s)" % str(want)])
	if not good:
		failures.append(name)


func advance_in(steps: int, total: float) -> Cultivator:
	var c := Cultivator.new()
	for i in range(steps):
		c.advance(total / steps, i * total / steps)
	return c


func _initialize() -> void:
	print("\n§2 九層 layers")
	ok("multiplier by the ninth realm", Cultivator.ninth_realm_multiplier(), 4.97, 0.01)
	ok("layer step", Rules.LAYER_STEP, 1.02, 0.0)

	print("\n§2 the cost table, in days of base-rate gathering")
	var costs := Rules.costs()
	var want := [0.78, 2.34, 7.02, 21.06, 26.32, 32.91, 41.13, 51.42, 64.28]
	for r in range(1, 10):
		ok("realm %d" % r, costs[r] / Rules.DAY, want[r - 1], 0.01)

	print("\n§3 the promise: an idle-only run reaches realm 9")
	var idle := Cultivator.new()
	var day := 0
	while day < 600 and not idle.reached_ninth():
		idle.advance(Rules.DAY, day * Rules.DAY)
		day += 1
	ok("reaches the ninth realm", idle.reached_ninth(), true)
	ok("on day", day, 70)

	print("\n§1 there is no offline mode: one step must equal many")
	for total in [Rules.DAY, Rules.DAY * 60.0]:
		var one := advance_in(1, total)
		var many := advance_in(2000, total)
		var lbl := "%d days" % int(total / Rules.DAY)
		ok("%s: qi agrees" % lbl, absf(one.qi - many.qi) < 0.000001, true)
		ok("%s: realm.layer agrees" % lbl,
			one.realm == many.realm and one.layer == many.layer, true)

	print("\n§4 the hunt price is half an hour of your OWN rate")
	var c := Cultivator.new()
	ok("at realm 1", c.hunt_cost(), 1800.0 * c.rate(), 0.000001)
	c.realm = 8
	ok("at realm 8", c.hunt_cost(), 1800.0 * c.rate(), 0.000001)

	print("\n§6 經脈 channels")
	ok("twelve channels are worth", pow(Channels.GAIN, Channels.COUNT), 2.52, 0.01)
	var ch := Channels.new()
	ch.earn(40.0)
	ok("40 insight opens exactly one", ch.spend(), 1)
	ok("...and banks the remainder", ch.insight, 0.0, 0.000001)

	print("\n§12 初 the opening gift, and that it does not move the curve")
	var g := Cultivator.new()
	g.grant_opening_gift()
	ok("opens five layers at once", g.layer, 5)
	ok("...as five separate events for the UI", g.pending.size(), 5)
	var gd := 0
	while gd < 600 and not g.reached_ninth():
		g.advance(Rules.DAY, gd * Rules.DAY)
		gd += 1
	ok("the 70-day curve is unchanged", gd, 70)

	print("\n§12 存 the save")
	var sc := Cultivator.new()
	sc.advance(Rules.DAY * 5.0)
	var blob := Save.encode(sc, 1700000000, Rules.DAY * 5.0, 5, 3)
	ok("a save verifies", Save.verify(blob), true)
	var tampered := blob.duplicate(true)
	tampered["q"] = float(tampered["q"]) * 10.0
	ok("an edited save does not verify", Save.verify(tampered), false)
	var restored := Cultivator.new()
	Save.apply(blob, restored)
	ok("a save round-trips the realm", restored.realm, sc.realm)
	ok("a save round-trips the layer", restored.layer, sc.layer)
	ok("a save round-trips the qi", restored.qi, sc.qi, 0.001)

	print("\n§12 the clock")
	var clk := Save.Clock.new(1000.0)
	ok("forwards credits the span", clk.tick(1000.0 + 7200.0), 7200.0, 0.000001)
	ok("backwards credits nothing", clk.tick(1000.0), 0.0, 0.0)
	ok("...and is flagged", clk.flags.has("backwards"), true)
	ok("elapsed only ever grows", clk.elapsed, 7200.0, 0.000001)

	print("")
	if failures.is_empty():
		print("all pinned numbers hold — GDScript agrees with Python and with the bible")
	else:
		print("%d FAILED: %s" % [failures.size(), ", ".join(failures)])
	quit(1 if failures.size() > 0 else 0)
