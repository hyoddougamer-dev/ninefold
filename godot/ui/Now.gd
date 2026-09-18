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

const SECONDS_PER_REAL_SECOND := 1.0

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

var cultivator: Cultivator
var clock: Save.Clock
var elapsed_total: float = 0.0
var _events_to_show: Array[Dictionary] = []
var _show_timer: float = 0.0


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
	_apply_debug_overrides()
	_refresh()


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
	cultivator.advance(delta * SECONDS_PER_REAL_SECOND)
	elapsed_total += delta
	if not cultivator.pending.is_empty():
		_queue_events(cultivator.pending, false, 0.0)
		welcome_lbl.text = "層 opened"
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
	chan_lbl.text = "經脈 %d / 12" % cultivator.channels.opened
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
