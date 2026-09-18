## A gold hairline with an optional label sitting in a gap in the middle.
##
## The mockup uses these everywhere — under 七層, beside 獵 ASH SLOPES — and they are most
## of what makes it read as a designed object rather than a list of labels. They cost
## almost nothing and they were the single biggest thing missing.
class_name Hairline
extends Control

@export var gap: float = 0.0 : set = _set_gap          # px of clear space in the middle
@export var colour: Color = Color("D4A843") : set = _set_colour
@export var alpha: float = 0.30


func _set_gap(v: float) -> void:
	gap = v
	queue_redraw()

func _set_colour(v: Color) -> void:
	colour = v
	queue_redraw()


func _draw() -> void:
	var y := size.y * 0.5
	var col := Color(colour.r, colour.g, colour.b, alpha)
	if gap <= 0.0:
		draw_line(Vector2(0, y), Vector2(size.x, y), col, 1.0)
		return
	var half := (size.x - gap) * 0.5
	if half > 0.0:
		draw_line(Vector2(0, y), Vector2(half, y), col, 1.0)
		draw_line(Vector2(size.x - half, y), Vector2(size.x, y), col, 1.0)
