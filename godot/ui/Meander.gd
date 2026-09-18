## 回紋 The meander border along the bottom of the mockup.
##
## One repeated fret, drawn rather than tiled, so it scales to any width without an asset.
class_name Meander
extends Control

@export var unit: float = 34.0
@export var colour: Color = Color("D4A843")
@export var alpha: float = 0.34


func _draw() -> void:
	var u := unit
	var h := size.y
	var col := Color(colour.r, colour.g, colour.b, alpha)
	var x := 0.0
	while x < size.x:
		var p := PackedVector2Array([
			Vector2(x, h), Vector2(x, h * 0.25), Vector2(x + u * 0.72, h * 0.25),
			Vector2(x + u * 0.72, h * 0.70), Vector2(x + u * 0.28, h * 0.70),
			Vector2(x + u * 0.28, h * 0.48),
		])
		for i in range(p.size() - 1):
			draw_line(p[i], p[i + 1], col, 1.4)
		x += u
	draw_line(Vector2(0, h), Vector2(size.x, h), col, 1.0)
