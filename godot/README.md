# godot — the game

Godot 4.3, Compatibility renderer, portrait 1080×1920. Android first.

```
godot --path godot                                        run it
godot --headless --path godot --script res://tests/TestSim.gd      the numbers
godot --headless --path godot --script res://tests/TestOffline.gd  closing the app
```

## The one rule this project is built on

**There is no offline mode.** `Cultivator.advance(seconds)` is the only way time passes,
and it is the same call whether the app was open or closed. `_process` asks how many
seconds elapsed since the last frame and hands them to it; a resume asks how many seconds
elapsed since the last save and hands them to it. They cannot drift apart because they are
not two code paths.

`tests/TestOffline.gd` proves it rather than asserting it: closed for thirty days gives the
same realm, layer and qi as open for thirty days.

## Layout

| | |
|---|---|
| `sim/` | pure. No nodes, no signals, no frames, no `Time.get_ticks`. The GDScript twin of the repo's Python `sim/`, pinned to the same numbers by `tests/TestSim.gd`. |
| `ui/` | the screens. `Contour.gd` and `QiRing.gd` draw themselves — there is no art asset to import and therefore none to drift. |
| `tests/` | run headless, exit non-zero on failure. |

## Why the numbers live in three places and agree

`docs/GDD.md` publishes them, Python `sim/` finds them, GDScript `sim/` ships them. A
design document, a simulator and a game that each believe slightly different numbers is
the most expensive bug there is, and it stays invisible until somebody has played for a
month. Both test suites pin the same figures, so a change in one that is not made in the
others fails a build.

## Screenshots without a phone

```
xvfb-run -a --server-args="-screen 0 1080x1920x24" \
  godot --path godot --resolution 1080x1920 \
  --script res://tests/ShotRealm.gd -- --out=/tmp/r7.png --realm=7 --layer=5
```

`--realm=` / `--layer=` are read by `ui/Now.gd` itself. An earlier version poked at the
scene's fields from the test script instead, silently failed, and produced four
screenshots of four different realms that were all realm 9.
