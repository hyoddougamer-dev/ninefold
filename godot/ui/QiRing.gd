## 氣 The qi ring — the one thing on screen that is always moving.
##
## Outer arc is the current 層 layer filling. The nine pips around it are the layers of
## this realm, so "where am I" and "how close am I" are one glance, not two.
## The realm's 五行 phase colours all of it (§2), which is why a screenshot of realm 4 and
## one of realm 7 are different worlds.
class_name QiRing
extends Control

@export var progress: float = 0.0 : set = _set_progress
@export var layer: int = 0 : set = _set_layer
@export var realm: int = 1 : set = _set_realm

var _colour: Color = Rules.PHASE_COLOUR["木"]

const TAU_ := TAU
const START := -PI * 0.5


func _set_progress(v: float) -> void:
	progress = clampf(v, 0.0, 1.0)
	queue_redraw()

func _set_layer(v: int) -> void:
	layer = v
	queue_redraw()

func _set_realm(v: int) -> void:
	realm = clampi(v, 1, Rules.MAX_REALM)
	_colour = Rules.realm_colour(realm)
	queue_redraw()


func _ready() -> void:
	_colour = Rules.realm_colour(realm)


func _draw() -> void:
	var c := size * 0.5
	var r := minf(size.x, size.y) * 0.5 - 26.0
	var dim := Color(_colour.r, _colour.g, _colour.b, 0.13)

	draw_arc(c, r, 0, TAU_, 128, dim, 7.0, true)
	if progress > 0.0005:
		draw_arc(c, r, START, START + TAU_ * progress, 128,
			Color(_colour.r, _colour.g, _colour.b, 0.92), 7.0, true)

	# 九層 the nine pips. Filled ones are layers already opened in this realm.
	for i in range(Rules.LAYERS_PER_REALM):
		var a := START + TAU_ * (float(i) / Rules.LAYERS_PER_REALM)
		var p := c + Vector2(cos(a), sin(a)) * (r + 17.0)
		var on := i < layer
		draw_circle(p, 5.0 if on else 3.4,
			Color(_colour.r, _colour.g, _colour.b, 0.95 if on else 0.22))

	# The leading point of the arc, so the eye has something to sit on while it fills.
	if progress > 0.0005:
		var la := START + TAU_ * progress
		draw_circle(c + Vector2(cos(la), sin(la)) * r, 7.0,
			Color(1, 1, 1, 0.85))
