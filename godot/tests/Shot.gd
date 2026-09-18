## Runs the real scene on a virtual display, waits a beat, and writes a PNG.
## Used to look at the screen without a phone in hand.
extends SceneTree

var frames := 0
var out_path := "res://../shot.png"
var wait_frames := 40


func _initialize() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_path = a.substr(6)
		elif a.begins_with("--wait="):
			wait_frames = int(a.substr(7))
	var packed: PackedScene = load("res://ui/Now.tscn")
	var scene: Node = packed.instantiate()
	root.add_child(scene)
	root.set_content_scale_size(Vector2i(1080, 1920))


func _process(_d: float) -> bool:
	frames += 1
	if frames >= wait_frames:
		var img := root.get_texture().get_image()
		img.save_png(out_path)
		print("wrote %s  (%dx%d)" % [out_path, img.get_width(), img.get_height()])
		quit()
	return false
