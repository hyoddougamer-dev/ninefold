#!/usr/bin/env bash
# Linux and macOS twin of play.bat. Same search order, same cache file, same
# console-build skip — which also makes it the thing that proves that logic works,
# because a .bat cannot be run on the machine this project is developed on.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT="$ROOT/godot"
CACHE="$ROOT/.godot-path.txt"
GODOT=""

say() { printf '%s\n' "$*"; }

take() {                       # skip the console build: it opens a second window
	local c="$1"
	[ -n "$GODOT" ] && return 0
	[ -x "$c" ] || return 0
	case "$(basename "$c")" in *[Cc]onsole*) return 0 ;; esac
	GODOT="$c"
}

scandeep() { [ -d "$1" ] || return 0
	while IFS= read -r f; do take "$f"; done \
		< <(find "$1" -maxdepth 4 -type f -name 'Godot*' -perm -u+x 2>/dev/null | sort); }

scanflat() { [ -d "$1" ] || return 0
	while IFS= read -r f; do take "$f"; done \
		< <(find "$1" -maxdepth 1 -type f -name 'Godot*' -perm -u+x 2>/dev/null | sort); }

# 0. dragged an executable onto the script (or passed as the first argument)
if [ "${1:-}" != "" ] && [ -x "${1:-}" ]; then
	GODOT="$1"; shift
	printf '%s\n' "$GODOT" > "$CACHE"
fi

say ""
say "  Ninefold"
say "  ------------------------------------------------------------"
say ""

# 1. where we found it last time
if [ -f "$CACHE" ]; then
	CACHED="$(head -n1 "$CACHE")"
	if [ -x "$CACHED" ]; then GODOT="$CACHED"
	else say "  The Godot we remembered has moved. Looking again."; rm -f "$CACHE"; fi
fi

# 2. an override you set yourself
[ -z "$GODOT" ] && [ -n "${NINEFOLD_GODOT:-}" ] && [ -x "${NINEFOLD_GODOT}" ] && GODOT="$NINEFOLD_GODOT"

# 3. anything already on PATH
for n in godot godot4 Godot; do
	[ -n "$GODOT" ] && break
	p="$(command -v "$n" 2>/dev/null)" && [ -n "$p" ] && GODOT="$p"
done

# 4. next to this file, then the usual spots
[ -z "$GODOT" ] && scandeep "$ROOT"
[ -z "$GODOT" ] && scandeep "$HOME/.local/share/godot"
[ -z "$GODOT" ] && scandeep "/Applications/Godot.app/Contents/MacOS"
[ -z "$GODOT" ] && scanflat "$HOME/Downloads"
[ -z "$GODOT" ] && scandeep "$HOME/Downloads/Godot"
[ -z "$GODOT" ] && scanflat "$HOME/Desktop"
[ -z "$GODOT" ] && scandeep "$HOME/.steam/steam/steamapps/common/Godot Engine"
[ -z "$GODOT" ] && scandeep "$HOME/.var/app/org.godotengine.Godot"

if [ -z "$GODOT" ]; then
	say "  Godot was not found on this computer."
	say ""
	say "  The easiest fix:"
	say "    1. Get Godot 4.3 from godotengine.org/download"
	say "    2. Put the executable in THIS folder, beside this file"
	say "    3. Run this again"
	say ""
	say "  Already have it elsewhere? Put its full path, one line, in:"
	say "    $CACHE"
	say ""
	exit 1
fi

[ -f "$CACHE" ] || printf '%s\n' "$GODOT" > "$CACHE"

if [ ! -f "$PROJECT/project.godot" ]; then
	say "  Could not find the game files at: $PROJECT"
	say "  This file has to stay in the top folder, next to the 'godot' folder."
	exit 1
fi

say "  Godot:  $GODOT"
say ""
say "  Starting. The very first run takes a few extra seconds to import."
say ""
exec "$GODOT" --path "$PROJECT" "$@"
