## Screenshots the real scene at a chosen realm, to check the 五行 phase colour actually
## repaints the whole screen (§2: "a screenshot of the fourth realm and one of the seventh
## are different worlds").
extends SceneTree

var frames := 0
var out_path := "res://../shot.png"
var realm := 1
var layer := 4


func _initialize() -> void:
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--out="):
			out_path = a.substr(6)
		elif a.begins_with("--realm="):
			realm = int(a.substr(8))
		elif a.begins_with("--layer="):
			layer = int(a.substr(8))
	# Start from a clean slate every time. A leftover save is what made four screenshots
	# of four different realms all come out as realm 9.
	if FileAccess.file_exists(Save.PATH):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(Save.PATH))
	var packed: PackedScene = load("res://ui/Now.tscn")
	var scene: Node = packed.instantiate()
	root.add_child(scene)
	root.set_content_scale_size(Vector2i(1080, 1920))
	print("showing realm %d layer %d" % [scene.cultivator.realm, scene.cultivator.layer])


func _process(_d: float) -> bool:
	frames += 1
	if frames >= 30:
		root.get_texture().get_image().save_png(out_path)
		print("wrote %s" % out_path)
		quit()
	return false
