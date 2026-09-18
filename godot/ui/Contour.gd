## 線 The cultivator, drawn as horizontal bars.
##
## The one figure technique that survived. Every rejected cultivator in this project was
## rejected for its outline; a contour figure HAS no outline, so none of it can be wrong.
## The body is a stack of horizontal bars whose length follows a seated profile and whose
## thickness swells around the chest — exactly what tools/art/techniques.py generates as
## SVG, redrawn here natively so there is no asset to import and no asset to drift.
class_name Contour
extends Control

@export var realm: int = 1 : set = _set_realm
@export var bar_count: int = 52

var _colour: Color = Rules.PHASE_COLOUR["木"]

## (y, half-width), both 0..1. A seated figure: crown, head, neck, shoulders, torso,
## and the crossed legs that make the wide base every meditating cultivator sits on.
## First pass read as a chess pawn: a floating head on a narrow neck above a bulb. Two
## causes, both fixed here. The neck was so much thinner than the head that the bars
## disconnected, and the base curved back IN at the bottom, which is what makes a vase.
## A seated figure is close to a triangle — narrow at the crown, widest at the crossed
## knees, and FLAT along the ground.
##
## Second pass: the head still floated. The neck ran from 0.14 to 0.20 of the body at a
## third of the head's width, which at this bar count is a visible gap rather than a neck.
## Shortened it, widened it, and put a rung on the shoulder rise so the two masses join.
const PROFILE := [
	[0.000, 0.000], [0.024, 0.070], [0.062, 0.100], [0.105, 0.098],
	[0.140, 0.084], [0.163, 0.078],
	[0.180, 0.144], [0.202, 0.220], [0.235, 0.230],
	[0.320, 0.215], [0.430, 0.196], [0.510, 0.188], [0.575, 0.208],
	[0.650, 0.270], [0.730, 0.338], [0.810, 0.398], [0.880, 0.430],
	[0.945, 0.444], [1.000, 0.446],
]


func _set_realm(v: int) -> void:
	realm = clampi(v, 1, Rules.MAX_REALM)
	_colour = Rules.realm_colour(realm)
	queue_redraw()


func _ready() -> void:
	_colour = Rules.realm_colour(realm)


static func _smoothstep(t: float) -> float:
	return t * t * (3.0 - 2.0 * t)


## Half-width of the body at height `u` (0 crown, 1 base), smoothed between profile points.
static func width_at(u: float) -> float:
	if u <= 0.0:
		return float(PROFILE[0][1])
	if u >= 1.0:
		return float(PROFILE[-1][1])
	for i in range(PROFILE.size() - 1):
		var ay := float(PROFILE[i][0])
		var aw := float(PROFILE[i][1])
		var by := float(PROFILE[i + 1][0])
		var bw := float(PROFILE[i + 1][1])
		if u >= ay and u <= by:
			var t: float = (u - ay) / maxf(by - ay, 0.00001)
			return lerpf(aw, bw, _smoothstep(t))
	return float(PROFILE[-1][1])


func _draw() -> void:
	var w := size.x
	var h := size.y
	var cx := w * 0.5

	for i in range(bar_count):
		var u := float(i) / float(bar_count - 1)
		var half := width_at(u) * w
		if half <= 0.5:
			continue
		# Bars thicken around the chest, which is what gives the stack a body rather than
		# a ladder. 0.42 is where a seated figure reads heaviest.
		var thick := (h / bar_count) * (0.66 + 0.30 * maxf(0.0, 1.0 - absf(u - 0.40) * 2.0))
		var y := u * h
		var a := 0.62 + 0.30 * (1.0 - absf(u - 0.45) * 1.1)
		draw_rect(Rect2(cx - half, y - thick * 0.5, half * 2.0, thick),
			Color(_colour.r, _colour.g, _colour.b, clampf(a, 0.25, 0.95)))

	# 肩 one heavier bar at the shoulders, so the eye finds the figure immediately
	var sh := width_at(0.232) * w
	draw_rect(Rect2(cx - sh, 0.232 * h - h * 0.012, sh * 2.0, h * 0.024),
		Color(_colour.r, _colour.g, _colour.b, 0.98))
