# Building

Export templates live in `~/.local/share/godot/export_templates/4.3.stable`. The presets
are in `godot/export_presets.cfg`, which is gitignored because the export paths in it are
local.

```
godot --headless --path godot --export-release "Windows" build/win/Ninefold.exe
godot --headless --path godot --export-release "Web"     build/web/index.html
```

## The fonts are subset, and they have to stay that way

Noto Sans SC and Noto Serif SC ship with over twenty thousand glyphs each. The game
displays **142 characters**. Shipping the full faces put 19 MB of font into a 99 MB
Windows build and a 54 MB web pack.

Subset to exactly what the code renders:

```
python3 - <<'PY'   # collect every character in a quoted string in ui/ and sim/
...see the session that introduced this file; the set is 142 characters, 56 of them CJK
PY
pyftsubset fonts/NotoSansSC-Light.otf --text-file=chars.txt \
    --output-file=fonts/NotoSansSC-Light.subset.otf \
    --layout-features='' --no-hinting --desubroutinize --drop-tables+=GSUB,GPOS
```

19 MB → 48 KB, and the `.pck` went from 54 MB to 1.1 MB.

**If you add a character to a label that is not already in the subset, it renders as a
blank box.** Re-run the subset when adding text. That is the cost of the 400× saving and
it is worth paying; a font with every Chinese character in it is not.
