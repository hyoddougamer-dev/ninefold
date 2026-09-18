## 氣 The qi ring — thick, two-tone, glowing, with the cultivator inside it.
##
## The first version was a one-pixel circle with dots around it and it looked like a
## programmer's placeholder, because it was one. The mockup's ring is the single loudest
## thing on the screen: heavy, jade running into gold as the layer fills, a bright head on
## the leading edge, and a soft glow behind the figure.
class_name QiRing
extends Control

@export var progress: float = 0.0 : set = _set_progress
@export var layer: int = 0 : set = _set_layer
@export var realm: int = 1 : set = _set_realm

const JADE := Color("4ECFA3")
const GOLD := Color("D4A843")
const START := -PI * 0.5

var _colour: Color = JADE


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
	var r := minf(size.x, size.y) * 0.5 - 30.0
	var w := 22.0

	# the glow the figure sits in — the realm's 五行 phase, faint and wide
	for i in range(7):
		var t := float(i) / 6.0
		draw_circle(c, r * (0.58 + 0.42 * t),
			Color(_colour.r, _colour.g, _colour.b, 0.055 * (1.0 - t)))

	# the unfilled track
	draw_arc(c, r, 0, TAU, 160, Color(1, 1, 1, 0.055), w, true)
	draw_arc(c, r, 0, TAU, 160, Color(_colour.r, _colour.g, _colour.b, 0.10), 2.0, true)

	# the fill, jade into gold as the layer closes
	if progress > 0.002:
		var steps := maxi(3, int(160.0 * progress))
		for i in range(steps):
			var a0 := START + TAU * progress * (float(i) / steps)
			var a1 := START + TAU * progress * (float(i + 1) / steps)
			var k := (float(i) / steps) * progress
			draw_arc(c, r, a0, a1 + 0.004, 4, JADE.lerp(GOLD, k), w, true)
		# the leading head, so the eye has somewhere to rest while it fills
		var la := START + TAU * progress
		var lp := c + Vector2(cos(la), sin(la)) * r
		draw_circle(lp, w * 0.62, Color(1, 1, 1, 0.20))
		draw_circle(lp, w * 0.40, Color(1, 1, 1, 0.92))

	# 九層 the nine pips, outside the band
	for i in range(Rules.LAYERS_PER_REALM):
		var a := START + TAU * (float(i) / Rules.LAYERS_PER_REALM)
		var p := c + Vector2(cos(a), sin(a)) * (r + w * 0.5 + 16.0)
		var on := i < layer
		draw_circle(p, 6.0 if on else 3.6, GOLD if on else Color(1, 1, 1, 0.16))
