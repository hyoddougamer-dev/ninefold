## 今 Now — the home screen, and the only place that touches wall-clock time.
##
## What it proves, and it is the whole point of this slice: close the app, reopen it, and
## the number is right. That works because the simulation has ONE operation — advance by N
## seconds — so being closed for fourteen hours is the same call as being open for
## fourteen hours (§1, §12 存). There is no offline branch to get wrong.
##
## _process only asks "how many seconds since the last frame" and hands that to the same
## advance(). It never accumulates game state of its own.
extends Control


@onready var ring: QiRing = %QiRing
@onready var figure: Contour = %Contour
@onready var realm_han: Label = %RealmHan
@onready var realm_en: Label = %RealmEn
@onready var layer_lbl: Label = %LayerLabel
@onready var rate_lbl: Label = %RateLabel
@onready var qi_lbl: Label = %QiLabel
@onready var welcome: PanelContainer = %Welcome
@onready var welcome_lbl: Label = %WelcomeLabel
@onready var chan_lbl: Label = %ChannelLabel
@onready var still_btn: Button = %StillButton
@onready var motion_btn: Button = %MotionButton
@onready var log_lbl: Label = %LogLabel
@onready var speed_row: HBoxContainer = %SpeedRow

var cultivator: Cultivator
var clock: Save.Clock
var elapsed_total: float = 0.0
var _events_to_show: Array[Dictionary] = []
var _show_timer: float = 0.0

## 動 the day's hunt count, which is what makes the haul decay (§4).
var hunts_today: int = 0
var materials: float = 0.0
var day_no: int = 1

## How many game seconds pass per real second. 1 is the real game. The rest exist so a
## week of cultivation can be watched in a minute — without it the first thing that ever
## happens to a new player is two hours away, which is unreviewable.
var speed: float = 1.0
const SPEEDS := [1.0, 60.0, 3600.0]
const SPEED_NAMES := ["×1  real", "×60  a minute a second", "×3600  an hour a second"]


func _ready() -> void:
	cultivator = Cultivator.new()
	var blob := Save.read()
	var now := float(Time.get_unix_time_from_system())

	if blob.is_empty() or not Save.verify(blob):
		# 初 A brand new player. Realm 1 layer 1 is 2.1 hours away on the bare curve, so
		# minute one would otherwise be empty — see §12 初.
		cultivator.grant_opening_gift()
		clock = Save.Clock.new(now, 0.0)
		_queue_events(cultivator.pending, true)
	else:
		Save.apply(blob, cultivator)
		elapsed_total = float(blob.get("e", 0.0))
		clock = Save.Clock.new(float(blob.get("t", now)), elapsed_total)
		var away := clock.tick(now)
		if away > 0.0:
			cultivator.pending.clear()
			cultivator.advance(away)          # the SAME call a frame makes
			_queue_events(cultivator.pending, false, away)
	elapsed_total = clock.elapsed
	still_btn.pressed.connect(_on_still)
	motion_btn.pressed.connect(_on_hunt)
	_build_speed_buttons()
	_apply_debug_overrides()
	_refresh()


func _build_speed_buttons() -> void:
	for i in SPEEDS.size():
		var b := Button.new()
		b.text = SPEED_NAMES[i]
		b.toggle_mode = true
		b.button_pressed = (i == 0)
		b.focus_mode = Control.FOCUS_NONE
		b.add_theme_font_size_override("font_size", 20)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.pressed.connect(_on_speed.bind(i))
		speed_row.add_child(b)


func _on_speed(i: int) -> void:
	speed = SPEEDS[i]
	for c in speed_row.get_children():
		(c as Button).button_pressed = (c.get_index() == i)
	_say("time ×%d" % int(speed))


## 靜 Stillness is not a button that does something — it is the absence of spending. Saying
## so out loud is better than a dead card the player keeps pressing.
func _on_still() -> void:
	_say("靜 you are already gathering. Stillness is what happens when you spend nothing.")


## 動 one hunt. §4: it costs half an hour of your OWN rate, and the haul decays within the
## day. Neither brake ever refuses — if the qi is not there, that is the qi, not a rule.
func _on_hunt() -> void:
	var cost := cultivator.hunt_cost()
	if cultivator.qi < cost:
		var short := (cost - cultivator.qi) / cultivator.rate()
		_say("動 not enough qi yet — %s of gathering short" % _human(short))
		return
	cultivator.qi -= cost
	hunts_today += 1
	var h := Hunting.haul_factor(hunts_today)
	var got := 3.0 * h
	materials += got
	cultivator.channels.earn(8.0)     # §4 勢: insight does NOT decay with the hunt count
	var opened := cultivator.channels.spend()
	var line := "狩 hunt %d · +%.1f materials (×%.2f) · +8 悟" % [hunts_today, got, h]
	if opened > 0:
		line += "  ·  經脈 CHANNEL OPENED"
	_say(line)
	_refresh()


func _say(text: String) -> void:
	log_lbl.text = text


## --realm=N --layer=N on the command line, for screenshots and for looking at a realm
## without playing to it. Ignored entirely in a normal launch.
func _apply_debug_overrides() -> void:
	var want_realm := -1
	var want_layer := -1
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--realm="):
			want_realm = int(a.substr(8))
		elif a.begins_with("--layer="):
			want_layer = int(a.substr(8))
	if want_realm < 0:
		return
	cultivator.realm = clampi(want_realm, 1, Rules.MAX_REALM)
	cultivator.layer = clampi(want_layer if want_layer >= 0 else 4, 0, 8)
	cultivator.qi = cultivator.layer_cost() * 0.62
	cultivator.pending.clear()
	welcome.visible = false
	set_process(false)


func _queue_events(events: Array, first_run: bool, away_seconds: float = 0.0) -> void:
	_events_to_show = []
	for e in events:
		_events_to_show.append(e)
	cultivator.pending.clear()
	if _events_to_show.is_empty():
		welcome.visible = false
		return
	welcome.visible = true
	if first_run:
		welcome_lbl.text = "初賜 · the opening gift\n%d layers opened" % _events_to_show.size()
	else:
		welcome_lbl.text = "%s away · %d opened while you were gone" % [
			_human(away_seconds), _events_to_show.size()]
	_show_timer = 2.6


static func _human(seconds: float) -> String:
	if seconds < 3600.0:
		return "%d min" % int(seconds / 60.0)
	if seconds < 86400.0:
		return "%.1f h" % (seconds / 3600.0)
	return "%.1f days" % (seconds / 86400.0)


func _process(delta: float) -> void:
	cultivator.pending.clear()
	cultivator.advance(delta * speed)
	elapsed_total += delta
	if not cultivator.pending.is_empty():
		_queue_events(cultivator.pending, false, 0.0)
		welcome_lbl.text = "層 opened"
	var d := int(elapsed_total / Rules.DAY) + 1
	if d != day_no:
		day_no = d
		hunts_today = 0                 # §4: the hunt count resets with the day
		_say("a new day — the haul is back to ×1.00")
	if _show_timer > 0.0:
		_show_timer -= delta
		if _show_timer <= 0.0:
			welcome.visible = false
	_refresh()


func _refresh() -> void:
	var r := cultivator.realm
	ring.realm = r
	ring.layer = cultivator.layer
	ring.progress = cultivator.layer_progress()
	figure.realm = r
	realm_han.text = Rules.REALM_NAMES[r - 1][0]
	realm_en.text = str(Rules.REALM_NAMES[r - 1][1]).to_upper()
	layer_lbl.text = "第 %d 層  ·  LAYER %d OF 9" % [cultivator.layer, cultivator.layer]
	rate_lbl.text = "%.3f 氣/s" % cultivator.rate()
	qi_lbl.text = "%s / %s" % [_short(cultivator.qi), _short(cultivator.layer_cost())]
	chan_lbl.text = "經脈 %d / 12   ·   材 %.0f   ·   悟 %.0f" % [
		cultivator.channels.opened, materials, cultivator.channels.insight]
	motion_btn.disabled = false
	var cost := cultivator.hunt_cost()
	motion_btn.text = "動\nMOTION\nhunt %d · costs %s" % [
		hunts_today + 1, _short(cost)]
	var col := Rules.realm_colour(r)
	realm_han.add_theme_color_override("font_color", col)
	rate_lbl.add_theme_color_override("font_color", col)


static func _short(v: float) -> String:
	if is_inf(v):
		return "∞"
	if v >= 1000000.0:
		return "%.2fM" % (v / 1000000.0)
	if v >= 1000.0:
		return "%.1fk" % (v / 1000.0)
	return "%.0f" % v


func _notification(what: int) -> void:
	# Saving on pause, not on a timer: the phone can kill us at any moment.
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST \
			or what == NOTIFICATION_EXIT_TREE:
		_save()


func _save() -> void:
	if cultivator == null:
		return
	Save.write(Save.encode(cultivator, int(Time.get_unix_time_from_system()),
		elapsed_total, int(elapsed_total / Rules.DAY) + 1, 0, 0))
