## 今 Now — the home screen.
##
## Built to match the mockup that was approved, because the first pass shipped the
## plumbing with none of the skin: a striped figure, a one-pixel circle and three grey
## buttons. Everything the art system spent days on — the 饕餮 masks, the rarity tiles,
## the gold hairlines, the 回紋 border — existed as SVG and none of it was in the game.
##
## The screen is assembled in code rather than a .tscn so the layout is readable and
## reviewable in one file, and so the art can be looked up by name.
##
## The one rule underneath it all still holds (§1, §12 存): there is no offline mode.
## Cultivator.advance(seconds) is the only way time passes, and _process hands it the
## frame delta exactly as a resume hands it the seconds since the last save.
extends Control

const GROUND := Color("05100D")
const PANEL := Color("0A1A16")
const PANEL2 := Color("0C211B")
const JADE := Color("4ECFA3")
const GOLD := Color("D4A843")
const VERM := Color("C8442C")
const TEXT := Color("E6EEE8")
const DIM := Color("7C9389")
const FAINT := Color("4A5D56")
const HAIR := Color(0.831, 0.659, 0.263, 0.20)

const W := 1080.0
const PAD := 56.0

var SERIF: FontFile = load("res://fonts/NotoSerifSC-Light.otf")
var SERIF_M: FontFile = load("res://fonts/NotoSerifSC-Light.otf")  # Medium dropped: 12 MB for two headings
var SANS: FontFile = load("res://fonts/NotoSansSC-Light.otf")

const CN_NUM := ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"]

## Stamped on screen, top-left, small and dim. Without it there is no way for either of
## us to tell an old copy from a new one from a screenshot — which cost a whole round of
## "nothing changed" when the build being run was three commits behind.
const BUILD := "build 5 · trail + satchel + nav"

var cultivator: Cultivator
var clock: Save.Clock
var elapsed_total := 0.0
var hunts_today := 0
var materials := 0.0
var day_no := 1
var speed := 1.0
const SPEEDS := [1.0, 60.0, 3600.0]
const SPEED_NAMES := ["×1", "×60", "×3600"]

var trail_beast := "beetle"
var trail_left := 6.0 * 3600.0

# built nodes we write into every frame
var n_realm_index: Label
var n_realm_han: Label
var n_realm_en: Label
var n_layer_han: Label
var n_ring: QiRing
var n_figure: Contour
var n_qi: Label
var n_rate: Label
var n_break: Label
var n_still: Label
var n_motion: Label
var n_trail_name: Label
var n_trail_cost: Label
var n_trail_timer: Label
var n_hunt_btn: Button
var n_bag: HBoxContainer
var n_log: Label
var n_speed: HBoxContainer


func _ready() -> void:
	_build()
	cultivator = Cultivator.new()
	var blob := Save.read()
	var now := float(Time.get_unix_time_from_system())
	if blob.is_empty() or not Save.verify(blob):
		cultivator.grant_opening_gift()
		clock = Save.Clock.new(now, 0.0)
		_say("初賜 the opening gift — five layers")
	else:
		Save.apply(blob, cultivator)
		clock = Save.Clock.new(float(blob.get("t", now)), float(blob.get("e", 0.0)))
		var away := clock.tick(now)
		if away > 0.0:
			cultivator.pending.clear()
			cultivator.advance(away)
			if not cultivator.pending.is_empty():
				_say("%s away — %d 層 opened" % [_human(away), cultivator.pending.size()])
	elapsed_total = clock.elapsed
	_apply_debug_overrides()
	_refresh()


# ── building ────────────────────────────────────────────────────────────────

func _lbl(text: String, font: FontFile, sz: int, col: Color, align := HORIZONTAL_ALIGNMENT_CENTER) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font)
	l.add_theme_font_size_override("font_size", sz)
	l.add_theme_color_override("font_color", col)
	l.horizontal_alignment = align
	return l


func _panel(border := HAIR, fill := PANEL) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.set_border_width_all(1)
	sb.border_color = border
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 28
	sb.content_margin_right = 28
	sb.content_margin_top = 18
	sb.content_margin_bottom = 18
	return sb


func _build() -> void:
	var bg := ColorRect.new()
	bg.color = GROUND
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var stamp := _lbl(BUILD, SANS, 20, Color(FAINT.r, FAINT.g, FAINT.b, 0.75),
		HORIZONTAL_ALIGNMENT_LEFT)
	stamp.set_anchors_preset(Control.PRESET_TOP_LEFT)
	stamp.offset_left = 22
	stamp.offset_top = 14
	add_child(stamp)

	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.offset_left = PAD
	col.offset_right = -PAD
	col.offset_top = 48
	col.offset_bottom = -26
	col.add_theme_constant_override("separation", 0)
	add_child(col)

	# ── the realm, in the mockup's four-part hierarchy ──
	n_realm_index = _lbl("第一重", SERIF, 27, GOLD)
	col.add_child(n_realm_index)
	col.add_child(_gap(6))
	n_realm_han = _lbl("練氣", SERIF_M, 96, GOLD)
	col.add_child(n_realm_han)
	n_realm_en = _lbl("QI REFINING", SANS, 26, DIM)
	n_realm_en.add_theme_constant_override("line_spacing", 0)
	col.add_child(n_realm_en)
	col.add_child(_gap(10))

	var lay := Control.new()
	lay.custom_minimum_size.y = 32
	var rule := Hairline.new()
	rule.set_anchors_preset(Control.PRESET_FULL_RECT)
	rule.gap = 190
	lay.add_child(rule)
	n_layer_han = _lbl("一層", SERIF, 30, JADE)
	n_layer_han.set_anchors_preset(Control.PRESET_FULL_RECT)
	n_layer_han.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	lay.add_child(n_layer_han)
	col.add_child(lay)
	col.add_child(_gap(6))

	# ── the ring, with the cultivator inside it ──
	var ringwrap := Control.new()
	ringwrap.custom_minimum_size.y = 414
	n_ring = QiRing.new()
	n_ring.set_anchors_preset(Control.PRESET_FULL_RECT)
	ringwrap.add_child(n_ring)
	n_figure = Contour.new()
	n_figure.set_anchors_preset(Control.PRESET_CENTER)
	n_figure.offset_left = -98
	n_figure.offset_right = 98
	n_figure.offset_top = -144
	n_figure.offset_bottom = 144
	ringwrap.add_child(n_figure)
	col.add_child(ringwrap)
	col.add_child(_gap(4))

	# ── the number ──
	n_qi = _lbl("0 氣", SANS, 56, TEXT)
	col.add_child(n_qi)
	n_rate = _lbl("+0 / s", SANS, 27, JADE)
	col.add_child(n_rate)
	n_break = _lbl("突破 —", SANS, 24, GOLD)
	col.add_child(n_break)
	col.add_child(_gap(20))

	# ── the two roads ──
	var roads := HBoxContainer.new()
	roads.add_theme_constant_override("separation", 22)
	n_still = _road(roads, "靜", "STILLNESS", JADE, true)
	n_motion = _road(roads, "動", "MOTION", VERM, false)
	col.add_child(roads)
	col.add_child(_gap(18))

	# ── 獵 the trail ──
	var head := Control.new()
	head.custom_minimum_size.y = 36
	var hr := Hairline.new()
	hr.set_anchors_preset(Control.PRESET_FULL_RECT)
	hr.gap = 700
	head.add_child(hr)
	var hl := _lbl("獵   ASH SLOPES", SANS, 26, DIM, HORIZONTAL_ALIGNMENT_LEFT)
	hl.set_anchors_preset(Control.PRESET_FULL_RECT)
	hl.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	head.add_child(hl)
	n_trail_timer = _lbl("06:00", SANS, 26, GOLD, HORIZONTAL_ALIGNMENT_RIGHT)
	n_trail_timer.set_anchors_preset(Control.PRESET_FULL_RECT)
	n_trail_timer.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	head.add_child(n_trail_timer)
	col.add_child(head)
	col.add_child(_gap(12))
	col.add_child(_trail_card())
	col.add_child(_gap(16))

	# ── 藏 the satchel row ──
	n_bag = HBoxContainer.new()
	n_bag.add_theme_constant_override("separation", 10)
	n_bag.alignment = BoxContainer.ALIGNMENT_CENTER
	col.add_child(n_bag)
	col.add_child(_gap(6))

	n_log = _lbl("", SANS, 26, GOLD)
	n_log.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	n_log.custom_minimum_size.y = 40
	col.add_child(n_log)

	# ── the meander, and the nav — the tail of the same column ──
	var spring := Control.new()
	spring.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(spring)
	var foot := col

	n_speed = HBoxContainer.new()
	n_speed.add_theme_constant_override("separation", 12)
	n_speed.alignment = BoxContainer.ALIGNMENT_CENTER
	foot.add_child(n_speed)
	for i in SPEEDS.size():
		var b := Button.new()
		b.text = SPEED_NAMES[i]
		b.toggle_mode = true
		b.button_pressed = (i == 0)
		b.focus_mode = Control.FOCUS_NONE
		b.add_theme_font_override("font", SANS)
		b.add_theme_font_size_override("font_size", 24)
		b.add_theme_color_override("font_color", DIM)
		b.add_theme_color_override("font_pressed_color", GOLD)
		b.add_theme_color_override("font_hover_color", TEXT)
		var flat := StyleBoxFlat.new()
		flat.bg_color = PANEL
		flat.set_border_width_all(1)
		flat.border_color = HAIR
		flat.set_corner_radius_all(4)
		flat.content_margin_left = 26
		flat.content_margin_right = 26
		flat.content_margin_top = 10
		flat.content_margin_bottom = 10
		b.add_theme_stylebox_override("normal", flat)
		b.add_theme_stylebox_override("hover", flat)
		b.add_theme_stylebox_override("focus", flat)
		var on := flat.duplicate() as StyleBoxFlat
		on.bg_color = PANEL2
		on.border_color = Color(GOLD.r, GOLD.g, GOLD.b, 0.5)
		b.add_theme_stylebox_override("pressed", on)
		b.pressed.connect(_on_speed.bind(i))
		n_speed.add_child(b)

	foot.add_child(_gap(12))
	var mean := Meander.new()
	mean.custom_minimum_size.y = 22
	foot.add_child(mean)
	foot.add_child(_gap(10))

	var nav := HBoxContainer.new()
	nav.alignment = BoxContainer.ALIGNMENT_CENTER
	nav.add_theme_constant_override("separation", 90)
	for pair in [["今", "NOW"], ["道", "PATH"], ["獵", "HUNT"], ["藏", "SATCHEL"]]:
		var v := VBoxContainer.new()
		var active: bool = pair[0] == "今"
		v.add_child(_lbl(pair[0], SERIF, 36, GOLD if active else FAINT))
		v.add_child(_lbl(pair[1], SANS, 18, DIM if active else FAINT))
		nav.add_child(v)
	foot.add_child(nav)


func _gap(h: int) -> Control:
	var c := Control.new()
	c.custom_minimum_size.y = h
	return c


func _road(parent: HBoxContainer, han: String, en: String, col: Color, still: bool) -> Label:
	var p := PanelContainer.new()
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var sb := _panel()
	if still:
		# the accent bar the mockup puts down the live road's left edge
		sb.border_width_left = 5
		sb.border_color = Color(col.r, col.g, col.b, 0.75)
	p.add_theme_stylebox_override("panel", sb)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	v.add_child(_lbl(han, SERIF_M, 42, col, HORIZONTAL_ALIGNMENT_LEFT))
	v.add_child(_lbl(en, SANS, 22, FAINT, HORIZONTAL_ALIGNMENT_LEFT))
	var stat := _lbl("", SANS, 26, DIM, HORIZONTAL_ALIGNMENT_LEFT)
	stat.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(stat)
	p.add_child(v)
	parent.add_child(p)
	var btn := Button.new()
	btn.set_anchors_preset(Control.PRESET_FULL_RECT)
	btn.flat = true
	btn.focus_mode = Control.FOCUS_NONE
	btn.pressed.connect(_on_still if still else _on_hunt)
	p.add_child(btn)
	return stat


func _trail_card() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", _panel(HAIR, PANEL2))
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 18)

	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 22)
	var mask := TextureRect.new()
	mask.texture = load("res://art/beasts/%s.svg" % trail_beast)
	mask.custom_minimum_size = Vector2(106, 106)
	mask.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	mask.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	top.add_child(mask)
	var names := VBoxContainer.new()
	names.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	names.alignment = BoxContainer.ALIGNMENT_CENTER
	names.add_theme_constant_override("separation", 2)
	n_trail_name = _lbl("鐵甲蟲", SERIF_M, 40, TEXT, HORIZONTAL_ALIGNMENT_LEFT)
	names.add_child(n_trail_name)
	names.add_child(_lbl("IRON BEETLE", SANS, 22, FAINT, HORIZONTAL_ALIGNMENT_LEFT))
	top.add_child(names)
	# what it drops, as real item tiles
	for k in ["fang", "hide"]:
		var t := TextureRect.new()
		t.texture = load("res://art/items/%s.svg" % k)
		t.custom_minimum_size = Vector2(76, 76)
		t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		top.add_child(t)
	v.add_child(top)

	var rule := Hairline.new()
	rule.custom_minimum_size.y = 2
	rule.alpha = 0.16
	v.add_child(rule)

	var bot := HBoxContainer.new()
	n_trail_cost = _lbl("", SANS, 26, DIM, HORIZONTAL_ALIGNMENT_LEFT)
	n_trail_cost.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	n_trail_cost.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	bot.add_child(n_trail_cost)
	n_hunt_btn = Button.new()
	n_hunt_btn.text = "狩"
	n_hunt_btn.focus_mode = Control.FOCUS_NONE
	n_hunt_btn.add_theme_font_override("font", SERIF_M)
	n_hunt_btn.add_theme_font_size_override("font_size", 40)
	n_hunt_btn.add_theme_color_override("font_color", Color("1A1206"))
	n_hunt_btn.add_theme_color_override("font_hover_color", Color("1A1206"))
	n_hunt_btn.add_theme_color_override("font_pressed_color", Color("1A1206"))
	var g := StyleBoxFlat.new()
	g.bg_color = Color("E8C46A")
	g.set_corner_radius_all(4)
	g.content_margin_left = 54
	g.content_margin_right = 54
	g.content_margin_top = 14
	g.content_margin_bottom = 14
	n_hunt_btn.add_theme_stylebox_override("normal", g)
	var gh := g.duplicate() as StyleBoxFlat
	gh.bg_color = Color("F2D585")
	n_hunt_btn.add_theme_stylebox_override("hover", gh)
	n_hunt_btn.add_theme_stylebox_override("pressed", gh)
	n_hunt_btn.pressed.connect(_on_hunt)
	bot.add_child(n_hunt_btn)
	v.add_child(bot)
	p.add_child(v)
	return p


func _bag_slot(art: String, count: String, han: String) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 2)
	var t := TextureRect.new()
	t.texture = load(art)
	t.custom_minimum_size = Vector2(84, 84)
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	v.add_child(t)
	v.add_child(_lbl(count, SANS, 28, TEXT))
	v.add_child(_lbl(han, SERIF, 24, FAINT))
	return v


# ── actions ─────────────────────────────────────────────────────────────────

func _on_speed(i: int) -> void:
	speed = SPEEDS[i]
	for c in n_speed.get_children():
		(c as Button).button_pressed = (c.get_index() == i)


func _on_still() -> void:
	_say("靜 you are already gathering — Stillness is what happens when you spend nothing")


func _on_hunt() -> void:
	var cost := cultivator.hunt_cost()
	if cultivator.qi < cost:
		_say("動 not enough qi — %s short" % _human((cost - cultivator.qi) / cultivator.rate()))
		return
	cultivator.qi -= cost
	hunts_today += 1
	var h := Hunting.haul_factor(hunts_today)
	materials += 3.0 * h
	cultivator.channels.earn(8.0)
	var opened := cultivator.channels.spend()
	var line := "狩 %d · +%.1f 材 (×%.2f) · +8 悟" % [hunts_today, 3.0 * h, h]
	if opened > 0:
		line += "   經脈 OPENED"
	_say(line)
	_refresh()


func _say(t: String) -> void:
	if n_log:
		n_log.text = t


# ── the frame ───────────────────────────────────────────────────────────────

func _process(delta: float) -> void:
	cultivator.pending.clear()
	cultivator.advance(delta * speed)
	elapsed_total += delta * speed
	trail_left -= delta * speed
	if trail_left <= 0.0:
		trail_left += Rules.TRAIL_SECONDS
		_say("蹤 the trail has turned over")
	if not cultivator.pending.is_empty():
		var last: Dictionary = cultivator.pending[-1]
		_say("層 opened" if last["kind"] == "layer" else "重 %s" % Rules.REALM_NAMES[cultivator.realm - 1][0])
	var d := int(elapsed_total / Rules.DAY) + 1
	if d != day_no:
		day_no = d
		hunts_today = 0
		_say("a new day — the haul is back to ×1.00")
	_refresh()


func _refresh() -> void:
	var r := cultivator.realm
	var col := Rules.realm_colour(r)
	n_realm_index.text = "第%s重" % CN_NUM[r]
	n_realm_han.text = Rules.REALM_NAMES[r - 1][0]
	n_realm_han.add_theme_color_override("font_color", col)
	n_realm_en.text = str(Rules.REALM_NAMES[r - 1][1]).to_upper()
	n_layer_han.text = "%s層" % CN_NUM[maxi(cultivator.layer, 1)]
	n_layer_han.add_theme_color_override("font_color", col)
	n_ring.realm = r
	n_ring.layer = cultivator.layer
	n_ring.progress = cultivator.layer_progress()
	n_figure.realm = r
	n_qi.text = "%s 氣" % _short(cultivator.qi)
	n_rate.text = "+%.1f / s" % cultivator.rate()
	var left := cultivator.seconds_to_next_layer()
	n_break.text = "突破 %s" % ("—" if is_inf(left) else _human(left))
	n_still.text = "Gathering ×1.00\nruns while closed"
	n_motion.text = "Haul ×%.2f\n%d hunts today" % [Hunting.haul_factor(hunts_today + 1), hunts_today]
	n_trail_cost.text = "costs %s 氣  ·  haul %d%%" % [
		_short(cultivator.hunt_cost()), int(Hunting.haul_factor(hunts_today + 1) * 100.0)]
	n_trail_timer.text = "%02d:%02d" % [int(trail_left) / 3600, (int(trail_left) % 3600) / 60]

	for c in n_bag.get_children():
		c.queue_free()
	for row in [["res://art/items/pill.svg", "%d" % int(materials / 3.0), "丹"],
				["res://art/items/stone.svg", "%d" % int(materials * 4.0), "靈石"],
				["res://art/items/fang.svg", "%d" % int(materials), "牙"],
				["res://art/items/core.svg", "%d" % cultivator.channels.opened, "核"],
				["res://art/items/scroll.svg", "%d" % int(cultivator.channels.insight / 8.0), "卷"]]:
		n_bag.add_child(_bag_slot(row[0], row[1], row[2]))


static func _short(v: float) -> String:
	if is_inf(v):
		return "∞"
	if v >= 1000000.0:
		return "%.2fM" % (v / 1000000.0)
	if v >= 1000.0:
		return "%.1fk" % (v / 1000.0)
	return "%.0f" % v


static func _human(s: float) -> String:
	if s < 60.0:
		return "%ds" % int(s)
	if s < 3600.0:
		return "%dm" % int(s / 60.0)
	if s < 86400.0:
		return "%dh %dm" % [int(s / 3600.0), int(fmod(s, 3600.0) / 60.0)]
	return "%.1f days" % (s / 86400.0)


func _apply_debug_overrides() -> void:
	var wr := -1
	var wl := -1
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--realm="):
			wr = int(a.substr(8))
		elif a.begins_with("--layer="):
			wl = int(a.substr(8))
	if wr < 0:
		return
	cultivator.realm = clampi(wr, 1, Rules.MAX_REALM)
	cultivator.layer = clampi(wl if wl >= 0 else 4, 0, 8)
	cultivator.qi = cultivator.layer_cost() * 0.62
	cultivator.pending.clear()
	set_process(false)


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST \
			or what == NOTIFICATION_EXIT_TREE:
		if cultivator != null:
			Save.write(Save.encode(cultivator, int(Time.get_unix_time_from_system()),
				elapsed_total, day_no, hunts_today, 0))
