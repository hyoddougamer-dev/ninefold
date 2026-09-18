## Drives the real screen the way a thumb would: run time forward, tap 動 a few times,
## and screenshot the result. This is the check that "nothing happens" is no longer true.
extends SceneTree

var scene: Node
var frames := 0
var out_path := "res://../shot.png"


func _initialize() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_path = a.substr(6)
	if FileAccess.file_exists(Save.PATH):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(Save.PATH))
	var packed: PackedScene = load("res://ui/Now.tscn")
	scene = packed.instantiate()
	root.add_child(scene)
	root.set_content_scale_size(Vector2i(1080, 1920))



func _drive() -> void:
	# an hour a second, then four hunts — what a thumb would actually do
	scene._on_speed(2)
	scene.cultivator.advance(3600.0 * 30.0)
	for i in range(4):
		scene._on_hunt()
	scene._refresh()
	print("realm %d layer %d | hunts %d | materials %.1f | insight %.0f | channels %d"
		% [scene.cultivator.realm, scene.cultivator.layer, scene.hunts_today,
		   scene.materials, scene.cultivator.channels.insight,
		   scene.cultivator.channels.opened])
	print("log: %s" % scene.n_log.text)


func _process(_d: float) -> bool:
	frames += 1
	# _ready runs on the first processed frame, not on add_child, so nothing may be
	# poked before then — the first attempt at this test drove a scene whose @onready
	# fields were all still null.
	if frames == 2:
		_drive()
	if frames >= 30:
		root.get_texture().get_image().save_png(out_path)
		print("wrote %s" % out_path)
		quit()
	return false
